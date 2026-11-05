// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckinDemo } from './useCheckinDemo';

afterEach(() => vi.useRealTimers());

describe('useCheckinDemo', () => {
  it('analyses a mood for a second, then recommends a plan', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCheckinDemo());

    act(() => result.current.handleCheckin('tired'));
    expect(result.current.checkinStatus).toBe('tired');
    expect(result.current.isAnalyzing).toBe(true);
    expect(result.current.aiRecommendation).toBe('');

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.isAnalyzing).toBe(false);
    expect(result.current.aiRecommendation).not.toBe('');
  });

  it('gives a different recommendation per mood and none for an unknown one', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCheckinDemo());
    const seen = new Set();
    for (const mood of ['energetic', 'tired', 'stressed', 'focused']) {
      act(() => result.current.handleCheckin(mood));
      act(() => vi.advanceTimersByTime(1000));
      seen.add(result.current.aiRecommendation);
    }
    expect(seen.size).toBe(4);

    act(() => result.current.handleCheckin('???'));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.aiRecommendation).toBe('');
  });

  it('keeps at least one equipment selected and toggles the rest', () => {
    const { result } = renderHook(() => useCheckinDemo());
    expect(result.current.selectedEquipment).toEqual(['bodyweight']);

    act(() => result.current.handleEquipmentToggle('bodyweight'));
    expect(result.current.selectedEquipment).toEqual(['bodyweight']); // cannot deselect the last one

    act(() => result.current.handleEquipmentToggle('dumbbells'));
    expect(result.current.selectedEquipment).toEqual(['bodyweight', 'dumbbells']);

    act(() => result.current.handleEquipmentToggle('bodyweight'));
    expect(result.current.selectedEquipment).toEqual(['dumbbells']);
  });
});
