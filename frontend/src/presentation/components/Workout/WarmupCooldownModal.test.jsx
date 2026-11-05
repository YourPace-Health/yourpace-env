// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { WarmupCooldownModal } from './WarmupCooldownModal';
import { WARMUP_COOLDOWN_DATA } from '../../../data/warmupCooldownData';

afterEach(cleanup);

const props = (over = {}) => ({
  completedWarmupIds: new Set(),
  handleToggleWarmupCheck: vi.fn(),
  setCompletedWarmupIds: vi.fn(),
  setShowWarmupModal: vi.fn(),
  setWarmupCategory: vi.fn(),
  setWarmupSelectedTab: vi.fn(),
  warmupCategory: 'UPPER_BODY',
  warmupModalTitle: 'Test workout',
  warmupSelectedTab: 'warmup',
  ...over
});

describe('WarmupCooldownModal', () => {
  it('lists the warm-up exercises of the selected category', () => {
    const { container } = render(<WarmupCooldownModal {...props()} />);
    const first = WARMUP_COOLDOWN_DATA.UPPER_BODY.warmupExercises[0];
    expect(container.textContent).toContain(first.name);
  });

  it('switches to cool-down exercises when that tab is selected', () => {
    const { container } = render(<WarmupCooldownModal {...props({ warmupSelectedTab: 'cooldown' })} />);
    const first = WARMUP_COOLDOWN_DATA.UPPER_BODY.cooldownExercises[0];
    expect(container.textContent).toContain(first.name);
  });

  it('falls back to the core/cardio guide for an unknown category', () => {
    const { container } = render(<WarmupCooldownModal {...props({ warmupCategory: 'NOPE' })} />);
    const first = WARMUP_COOLDOWN_DATA.CORE_CARDIO.warmupExercises[0];
    expect(container.textContent).toContain(first.name);
  });

  it('wires its buttons to the toggle and close handlers', () => {
    const p = props();
    const { container } = render(<WarmupCooldownModal {...p} />);
    container.querySelectorAll('button').forEach((b) => fireEvent.click(b));
    const first = WARMUP_COOLDOWN_DATA.UPPER_BODY.warmupExercises[0];
    expect(p.handleToggleWarmupCheck).toHaveBeenCalledWith(first.id);
    expect(p.setShowWarmupModal).toHaveBeenCalledWith(false);
  });
});
