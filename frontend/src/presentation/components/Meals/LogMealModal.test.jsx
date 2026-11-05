// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { LogMealModal } from './LogMealModal';

afterEach(cleanup);

const props = (over = {}) => ({
  handleAnalyzeMealPreview: vi.fn(),
  handleAnalyzePhoto: vi.fn(),
  handlePhotoFileSelect: vi.fn(),
  handleSaveMeal: vi.fn((e) => e?.preventDefault?.()),
  isAnalyzingMeal: false,
  isAnalyzingPhoto: false,
  isSavingMeal: false,
  mealAnalysisPreview: null,
  mealForm: { mealType: 'LUNCH', mealDescription: 'ข้าวมันไก่', calories: '', protein: '', carbs: '', fat: '' },
  mealModalMode: 'text',
  photoPreview: null,
  setMealForm: vi.fn(),
  setMealModalMode: vi.fn(),
  setPhotoBase64: vi.fn(),
  setPhotoPreview: vi.fn(),
  setShowLogMealModal: vi.fn(),
  ...over
});

describe('LogMealModal', () => {
  it('shows the meal description in text mode', () => {
    const { container } = render(<LogMealModal {...props()} />);
    expect([...container.querySelectorAll('textarea,input')].some((i) => i.value === 'ข้าวมันไก่')).toBe(true);
  });

  it('renders in photo mode without crashing', () => {
    const { container } = render(<LogMealModal {...props({ mealModalMode: 'photo' })} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('closes via setShowLogMealModal(false)', () => {
    const p = props();
    const { container } = render(<LogMealModal {...p} />);
    container.querySelectorAll('button').forEach((b) => fireEvent.click(b));
    expect(p.setShowLogMealModal).toHaveBeenCalledWith(false);
  });
});
