// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWarmupGuide } from './useWarmupGuide';

describe('useWarmupGuide', () => {
  it('starts closed on the warm-up tab', () => {
    const { result } = renderHook(() => useWarmupGuide());
    expect(result.current.showWarmupModal).toBe(false);
    expect(result.current.warmupSelectedTab).toBe('warmup');
    expect(result.current.completedWarmupIds.size).toBe(0);
  });

  it('opens with the title, the chosen tab and a detected muscle category', () => {
    const { result } = renderHook(() => useWarmupGuide());
    act(() => result.current.handleOpenWarmupGuide('Leg day squats', 'legs', 'cooldown'));
    expect(result.current.showWarmupModal).toBe(true);
    expect(result.current.warmupModalTitle).toBe('Leg day squats');
    expect(result.current.warmupSelectedTab).toBe('cooldown');
    expect(['UPPER_BODY', 'LOWER_BODY', 'CORE_CARDIO']).toContain(result.current.warmupCategory);
  });

  it('toggles exercises on and off', () => {
    const { result } = renderHook(() => useWarmupGuide());
    act(() => result.current.handleToggleWarmupCheck('a'));
    act(() => result.current.handleToggleWarmupCheck('b'));
    expect([...result.current.completedWarmupIds]).toEqual(['a', 'b']);
    act(() => result.current.handleToggleWarmupCheck('a'));
    expect([...result.current.completedWarmupIds]).toEqual(['b']);
  });
});
