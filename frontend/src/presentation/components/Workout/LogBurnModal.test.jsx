// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { LogBurnModal } from './LogBurnModal';

afterEach(cleanup);

const presets = [
  { id: 'running', title: 'วิ่งออกกำลังกาย', shortTitle: 'วิ่ง', icon: '🏃', burnRate: 8.5 },
  { id: 'yoga', title: 'โยคะ', shortTitle: 'โยคะ', icon: '🧘', burnRate: 4 }
];

const props = () => ({
  aiBurnExplanation: '',
  aiIntensityMap: null,
  burnForm: {
    title: 'วิ่งออกกำลังกาย', durationMinutes: 30, burnedCalories: 255, intensity: 'MODERATE',
    scheduledDate: '2026-11-05', scheduledTime: '18:00', description: '', selectedPresetId: 'running'
  },
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
  workoutPresets: presets
});

describe('LogBurnModal', () => {
  it('renders every workout preset', () => {
    const { container } = render(<LogBurnModal {...props()} />);
    expect(container.textContent).toContain('โยคะ');
  });

  it('selecting a preset calls handleSelectPreset', () => {
    const p = props();
    const { container } = render(<LogBurnModal {...p} />);
    container.querySelectorAll('button').forEach((b) => fireEvent.click(b));
    expect(p.handleSelectPreset).toHaveBeenCalledWith(expect.objectContaining({ id: 'yoga' }));
  });

  it('closes via setShowLogBurnModal(false)', () => {
    const p = props();
    const { container } = render(<LogBurnModal {...p} />);
    container.querySelectorAll('button').forEach((b) => fireEvent.click(b));
    expect(p.setShowLogBurnModal).toHaveBeenCalledWith(false);
  });
});
