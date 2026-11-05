// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMealTracker } from './useMealTracker';

afterEach(() => vi.unstubAllGlobals());

const summary = { totalCalories: 500 };

const setup = (over = {}) => {
  const source = {
    getTodayMeals: vi.fn().mockResolvedValue(summary),
    getEnergyBalance: vi.fn().mockResolvedValue({ net: 1 }),
    getWeeklyAnalytics: vi.fn().mockResolvedValue({ days: [] }),
    getDailyCoachFeedback: vi.fn().mockResolvedValue({ tip: 'x' }),
    previewMealAnalysis: vi.fn().mockResolvedValue({ calories: 400, protein: 20, carbs: 50, fat: 10 }),
    analyzeMealPhoto: vi.fn().mockResolvedValue({ summary: 'Pad Thai - tasty', calories: 600 }),
    logMeal: vi.fn().mockResolvedValue({}),
    deleteMeal: vi.fn().mockResolvedValue({}),
    ...over
  };
  const hook = renderHook(() => useMealTracker({ getSessionToken: () => 'tok', mealDataSource: source }));
  return { source, hook };
};

describe('useMealTracker', () => {
  it('loads today\'s meals and the dependent nutrition panels', async () => {
    const { source, hook } = setup();
    await act(async () => {
      await hook.result.current.loadTodayMeals('tok');
    });
    expect(hook.result.current.todayMealsSummary).toEqual(summary);
    await waitFor(() => expect(hook.result.current.energyBalance).toEqual({ net: 1 }));
    expect(source.getWeeklyAnalytics).toHaveBeenCalledWith('tok');
    expect(source.getDailyCoachFeedback).toHaveBeenCalledWith('tok');
  });

  it('fills the form from the AI text analysis', async () => {
    const { source, hook } = setup();
    act(() => hook.result.current.setMealForm((f) => ({ ...f, mealDescription: 'rice' })));
    await act(async () => {
      await hook.result.current.handleAnalyzeMealPreview();
    });
    expect(source.previewMealAnalysis).toHaveBeenCalledWith('rice', 'tok');
    expect(hook.result.current.mealForm).toMatchObject({ calories: 400, protein: 20, carbs: 50, fat: 10 });
    expect(hook.result.current.isAnalyzingMeal).toBe(false);
  });

  it('does not analyse an empty description', async () => {
    const { source, hook } = setup();
    await act(async () => {
      await hook.result.current.handleAnalyzeMealPreview();
    });
    expect(source.previewMealAnalysis).not.toHaveBeenCalled();
  });

  it('saves a meal with numeric values, resets the form and refreshes', async () => {
    const { source, hook } = setup();
    act(() => {
      hook.result.current.setShowLogMealModal(true);
      hook.result.current.setMealForm({ mealType: 'DINNER', mealDescription: 'soup', calories: '250.5', protein: '', carbs: '', fat: '' });
    });
    await act(async () => {
      await hook.result.current.handleSaveMeal({ preventDefault: vi.fn() });
    });
    expect(source.logMeal).toHaveBeenCalledWith(
      { mealType: 'DINNER', mealDescription: 'soup', calories: 250.5, protein: undefined, carbs: undefined, fat: undefined },
      'tok'
    );
    expect(hook.result.current.showLogMealModal).toBe(false);
    expect(hook.result.current.mealForm.mealDescription).toBe('');
    expect(source.getTodayMeals).toHaveBeenCalled();
  });

  it('keeps the modal open and reports when saving fails', async () => {
    const { hook } = setup({ logMeal: vi.fn().mockRejectedValue(new Error('nope')) });
    vi.stubGlobal('alert', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => {
      hook.result.current.setShowLogMealModal(true);
      hook.result.current.setMealForm((f) => ({ ...f, mealDescription: 'soup' }));
    });
    await act(async () => {
      await hook.result.current.handleSaveMeal({ preventDefault: vi.fn() });
    });
    expect(hook.result.current.showLogMealModal).toBe(true);
    expect(hook.result.current.isSavingMeal).toBe(false);
    expect(window.alert).toHaveBeenCalled();
  });

  it('deletes a meal only after confirmation', async () => {
    const { source, hook } = setup();
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    await act(async () => {
      await hook.result.current.handleDeleteMeal('m1');
    });
    expect(source.deleteMeal).not.toHaveBeenCalled();

    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    await act(async () => {
      await hook.result.current.handleDeleteMeal('m1');
    });
    expect(source.deleteMeal).toHaveBeenCalledWith('m1', 'tok');
  });

  it('asks for a photo before analysing', async () => {
    const { source, hook } = setup();
    vi.stubGlobal('alert', vi.fn());
    await act(async () => {
      await hook.result.current.handleAnalyzePhoto();
    });
    expect(window.alert).toHaveBeenCalled();
    expect(source.analyzeMealPhoto).not.toHaveBeenCalled();
  });

  it('analyses a selected photo and fills the form', async () => {
    const { source, hook } = setup();
    const file = new File(['abc'], 'meal.png', { type: 'image/png' });
    await act(async () => {
      hook.result.current.handlePhotoFileSelect({ target: { files: [file] } });
    });
    await waitFor(() => expect(hook.result.current.photoPreview).toMatch(/^data:image\/png/));

    await act(async () => {
      await hook.result.current.handleAnalyzePhoto();
    });
    expect(source.analyzeMealPhoto).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/png/), 'image/png', 'tok');
    expect(hook.result.current.mealForm.mealDescription).toBe('Pad Thai');
    expect(hook.result.current.mealForm.calories).toBe(600);
  });
});
