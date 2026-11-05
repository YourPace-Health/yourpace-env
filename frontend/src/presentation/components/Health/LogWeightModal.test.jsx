// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { LogWeightModal } from './LogWeightModal';

afterEach(cleanup);

const props = () => ({
  handleSaveWeight: vi.fn((e) => e?.preventDefault?.()),
  isSavingWeight: false,
  setShowLogWeightModal: vi.fn(),
  setWeightForm: vi.fn(),
  weightForm: { weight: '70.5', bodyFatPercentage: '', logDate: '2026-11-05', notes: '' }
});

describe('LogWeightModal', () => {
  it('shows the current weight value', () => {
    const { container } = render(<LogWeightModal {...props()} />);
    expect([...container.querySelectorAll('input')].some((i) => i.value === '70.5')).toBe(true);
  });

  it('submits through the save handler', () => {
    const p = props();
    const { container } = render(<LogWeightModal {...p} />);
    fireEvent.submit(container.querySelector('form'));
    expect(p.handleSaveWeight).toHaveBeenCalled();
  });

  it('closes via setShowLogWeightModal(false)', () => {
    const p = props();
    const { container } = render(<LogWeightModal {...p} />);
    container.querySelectorAll('button').forEach((b) => fireEvent.click(b));
    expect(p.setShowLogWeightModal).toHaveBeenCalledWith(false);
  });
});
