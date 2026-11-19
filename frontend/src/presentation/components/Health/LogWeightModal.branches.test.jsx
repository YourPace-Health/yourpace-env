import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LogWeightModal } from './LogWeightModal';

afterEach(cleanup);

const props = (over = {}) => ({
  handleSaveWeight: vi.fn((e) => e.preventDefault()),
  isSavingWeight: false,
  setShowLogWeightModal: vi.fn(),
  setWeightForm: vi.fn(),
  weightForm: { weight: '', bodyFatPercentage: '', logDate: '2026-03-01', notes: '' },
  ...over,
});

describe('LogWeightModal', () => {
  it('edits every field through setWeightForm', () => {
    const p = props();
    const { container } = render(<LogWeightModal {...p} />);
    const [weight, fat] = container.querySelectorAll('input[type="number"]');
    fireEvent.change(weight, { target: { value: '70.5' } });
    fireEvent.change(fat, { target: { value: '20' } });
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2026-03-02' } });
    fireEvent.change(container.querySelector('textarea'), { target: { value: 'morning' } });
    const sent = p.setWeightForm.mock.calls.map((c) => Object.keys(c[0]).filter((k) => p.weightForm[k] !== c[0][k])[0]);
    expect(sent).toEqual(['weight', 'bodyFatPercentage', 'logDate', 'notes']);
  });

  it('saves, cancels and closes', () => {
    const p = props();
    const { container } = render(<LogWeightModal {...p} />);
    fireEvent.submit(container.querySelector('form'));
    expect(p.handleSaveWeight).toHaveBeenCalled();
    fireEvent.click(screen.getByText('ยกเลิก'));
    fireEvent.click(container.querySelector('button')); // header close button
    expect(p.setShowLogWeightModal).toHaveBeenCalledWith(false);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(p.setShowLogWeightModal.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('shows the busy state', () => {
    render(<LogWeightModal {...props({ isSavingWeight: true })} />);
    expect(screen.getByText('กำลังบันทึก...')).toBeTruthy();
    expect(screen.getByText('ยกเลิก').closest('button').disabled).toBe(true);
  });
});
