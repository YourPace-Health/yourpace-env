import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LogMealModal } from './LogMealModal';
import { LogBurnModal } from '../Workout/LogBurnModal';

afterEach(cleanup);

const mealProps = (over = {}) => ({
  handleAnalyzeMealPreview: vi.fn(),
  handleAnalyzePhoto: vi.fn(),
  handlePhotoFileSelect: vi.fn(),
  handleSaveMeal: vi.fn((e) => e?.preventDefault?.()),
  isAnalyzingMeal: false,
  isAnalyzingPhoto: false,
  isSavingMeal: false,
  mealAnalysisPreview: null,
  mealForm: { mealType: 'LUNCH', mealDescription: 'ข้าวมันไก่', calories: '450', protein: '30', carbs: '45', fat: '12' },
  mealModalMode: 'text',
  photoPreview: null,
  setMealForm: vi.fn(),
  setMealModalMode: vi.fn(),
  setPhotoBase64: vi.fn(),
  setPhotoPreview: vi.fn(),
  setShowLogMealModal: vi.fn(),
  ...over,
});

describe('LogMealModal states', () => {
  it('edits macros and meal type, and uses a preset', () => {
    const p = mealProps();
    const { container } = render(<LogMealModal {...p} />);
    container.querySelectorAll('input[type="number"], input[placeholder^="เช่น"]').forEach((i) =>
      fireEvent.change(i, { target: { value: '12' } })
    );
    fireEvent.change(container.querySelector('textarea'), { target: { value: 'ต้มยำ' } });
    expect(p.setMealForm.mock.calls.length).toBeGreaterThanOrEqual(4);

    container.querySelectorAll('button[type="button"]').forEach((b) => fireEvent.click(b));
    expect(p.setMealModalMode).toHaveBeenCalledWith('photo');
    expect(p.setMealModalMode).toHaveBeenCalledWith('text');
    expect(p.handleAnalyzeMealPreview).toHaveBeenCalled();
    expect(p.setMealForm.mock.calls.some(([f]) => f.mealType && f.mealType !== 'LUNCH')).toBe(true);
  });

  it('disables analyse and save while the description is blank', () => {
    const { container } = render(<LogMealModal {...mealProps({ mealForm: { mealType: 'LUNCH', mealDescription: '  ', calories: '', protein: '', carbs: '', fat: '' } })} />);
    const disabled = [...container.querySelectorAll('button')].filter((b) => b.disabled);
    expect(disabled.length).toBeGreaterThanOrEqual(2);
  });

  it('shows the analysis result with and without a score, summary and tips', () => {
    const full = render(<LogMealModal {...mealProps({ mealAnalysisPreview: { healthScore: 91, summary: 'สมดุล', tips: 'เพิ่มผัก' } })} />);
    expect(full.container.textContent).toContain('91/100');
    expect(full.container.textContent).toContain('เพิ่มผัก');
    cleanup();
    const bare = render(<LogMealModal {...mealProps({ mealAnalysisPreview: {} })} />);
    expect(bare.container.textContent).toContain('80/100');
    expect(bare.container.textContent).not.toContain('คำแนะนำ:');
  });

  it('shows the busy states', () => {
    const analysing = render(<LogMealModal {...mealProps({ isAnalyzingMeal: true })} />);
    expect(analysing.container.querySelectorAll('.skeleton-shimmer').length).toBe(4);
    cleanup();
    const saving = render(<LogMealModal {...mealProps({ isSavingMeal: true })} />);
    expect([...saving.container.querySelectorAll('button')].some((b) => b.disabled)).toBe(true);
  });

  it('photo mode: pick a file, preview, analyse, remove', () => {
    const empty = mealProps({ mealModalMode: 'photo' });
    const first = render(<LogMealModal {...empty} />);
    const file = first.container.querySelector('input[type="file"]');
    fireEvent.change(file, { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    expect(empty.handlePhotoFileSelect).toHaveBeenCalled();
    cleanup();

    const withPhoto = mealProps({ mealModalMode: 'photo', photoPreview: 'data:image/png;base64,AAA' });
    const second = render(<LogMealModal {...withPhoto} />);
    expect(second.container.querySelector('img').getAttribute('src')).toContain('AAA');
    second.container.querySelectorAll('button[type="button"]').forEach((b) => fireEvent.click(b));
    expect(withPhoto.handleAnalyzePhoto).toHaveBeenCalled();
    expect(withPhoto.setPhotoPreview).toHaveBeenCalledWith(null);
    expect(withPhoto.setPhotoBase64).toHaveBeenCalledWith('');
    cleanup();

    const scanning = render(<LogMealModal {...mealProps({ mealModalMode: 'photo', photoPreview: 'data:x', isAnalyzingPhoto: true })} />);
    expect(scanning.container.querySelector('.scanner-laser')).toBeTruthy();
  });

  it('submits and cancels', () => {
    const p = mealProps();
    const { container } = render(<LogMealModal {...p} />);
    fireEvent.submit(container.querySelector('form'));
    expect(p.handleSaveMeal).toHaveBeenCalled();
    fireEvent.click(screen.getByText('ยกเลิก'));
    expect(p.setShowLogMealModal).toHaveBeenCalledWith(false);
  });
});

const burnProps = (over = {}) => ({
  aiBurnExplanation: '',
  aiIntensityMap: null,
  burnForm: { title: 'วิ่ง', durationMinutes: 30, burnedCalories: 255, intensity: 'MODERATE', scheduledDate: '2026-11-05', scheduledTime: '18:00', description: '', selectedPresetId: 'running' },
  calculateEndTimeString: vi.fn(() => '18:30'),
  handleBurnDurationChange: vi.fn(),
  handleBurnIntensityChange: vi.fn(),
  handleCalculateBurnWithN8N: vi.fn(),
  handleSaveBurnLog: vi.fn((e) => e?.preventDefault?.()),
  handleSelectPreset: vi.fn(),
  isCalculatingAiBurn: false,
  isCalendarConnected: false,
  isSavingBurnLog: false,
  setBurnForm: vi.fn(),
  setShowLogBurnModal: vi.fn(),
  workoutPresets: [
    { id: 'running', title: 'วิ่ง', shortTitle: 'วิ่ง', icon: '🏃', burnRate: 8.5 },
    { id: 'other', title: 'อื่นๆ', shortTitle: 'อื่นๆ', icon: '✨', burnRate: 0 },
  ],
  ...over,
});

describe('LogBurnModal states', () => {
  it('edits every field and picks an intensity', () => {
    const p = burnProps();
    const { container } = render(<LogBurnModal {...p} />);
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2026-11-06' } });
    fireEvent.change(container.querySelector('input[type="time"]'), { target: { value: '07:00' } });
    container.querySelectorAll('input[type="number"]').forEach((i) => fireEvent.change(i, { target: { value: '40' } }));
    container.querySelectorAll('input[type="text"]').forEach((i) => fireEvent.change(i, { target: { value: 'x' } }));
    container.querySelectorAll('textarea').forEach((i) => fireEvent.change(i, { target: { value: 'notes' } }));
    expect(p.handleBurnDurationChange).toHaveBeenCalledWith('40');
    expect(p.setBurnForm.mock.calls.length).toBeGreaterThanOrEqual(4);

    container.querySelectorAll('button[type="button"]').forEach((b) => fireEvent.click(b));
    expect(p.handleBurnIntensityChange).toHaveBeenCalled();
    expect(p.handleCalculateBurnWithN8N).toHaveBeenCalled();
  });

  it('shows AI-estimated intensities and the explanation', () => {
    const map = { LIGHT: { calories: 100, desc: 'เบา' }, MODERATE: { calories: 200, desc: 'กลาง' }, INTENSE: { calories: 300, desc: 'หนัก' } };
    const { container } = render(<LogBurnModal {...burnProps({ aiIntensityMap: map, aiBurnExplanation: 'คำนวณจาก METs' })} />);
    expect(container.textContent).toContain('คำนวณจาก METs');
    expect(container.textContent).toContain('300');
  });

  it('handles the "other" preset before and after calculation', () => {
    const waiting = render(<LogBurnModal {...burnProps({ burnForm: { title: 'เทนนิส', durationMinutes: 30, burnedCalories: '', intensity: 'MODERATE', scheduledDate: '', scheduledTime: '', description: '', selectedPresetId: 'other' } })} />);
    expect(waiting.container.textContent).toContain('รอ n8n AI คำนวณ');
    cleanup();
    const zero = render(<LogBurnModal {...burnProps({ burnForm: { title: 'x', durationMinutes: 0, burnedCalories: 0, intensity: 'LIGHT', scheduledDate: '', scheduledTime: '', description: '', selectedPresetId: 'running' } })} />);
    expect(zero.container.textContent).toContain('+0 kcal');
    expect(zero.container.textContent).toContain('ตอนนี้');
  });

  it('shows busy states, a blank-title lock, and the calendar notice', () => {
    const busy = render(<LogBurnModal {...burnProps({ isCalculatingAiBurn: true, isSavingBurnLog: true, isCalendarConnected: true })} />);
    expect([...busy.container.querySelectorAll('button')].filter((b) => b.disabled).length).toBeGreaterThanOrEqual(2);
    cleanup();
    const blank = render(<LogBurnModal {...burnProps({ burnForm: { ...burnProps().burnForm, title: ' ' } })} />);
    expect([...blank.container.querySelectorAll('button')].some((b) => b.disabled)).toBe(true);
  });

  it('submits the form', () => {
    const p = burnProps();
    const { container } = render(<LogBurnModal {...p} />);
    fireEvent.submit(container.querySelector('form'));
    expect(p.handleSaveBurnLog).toHaveBeenCalled();
  });
});
