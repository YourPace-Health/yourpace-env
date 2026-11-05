// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { N8nPlanModal } from './N8nPlanModal';

afterEach(cleanup);

const props = (over = {}) => ({
  calendarEvents: [],
  handlePlanFreeTimeWithN8N: vi.fn(),
  isCalendarConnected: true,
  isN8nPlanning: false,
  n8nCustomNote: 'no jumping',
  n8nDaysCount: 3,
  setN8nCustomNote: vi.fn(),
  setN8nDaysCount: vi.fn(),
  setShowN8nPlanModal: vi.fn(),
  ...over
});

describe('N8nPlanModal', () => {
  it('renders the custom note', () => {
    const { container } = render(<N8nPlanModal {...props()} />);
    expect([...container.querySelectorAll('textarea,input')].some((i) => i.value === 'no jumping')).toBe(true);
  });

  it('closes via setShowN8nPlanModal(false)', () => {
    const p = props();
    const { container } = render(<N8nPlanModal {...p} />);
    container.querySelectorAll('button').forEach((b) => fireEvent.click(b));
    expect(p.setShowN8nPlanModal).toHaveBeenCalledWith(false);
  });

  it('starts planning from a button', () => {
    const p = props();
    const { container } = render(<N8nPlanModal {...p} />);
    container.querySelectorAll('button').forEach((b) => fireEvent.click(b));
    expect(p.handlePlanFreeTimeWithN8N).toHaveBeenCalled();
  });
});
