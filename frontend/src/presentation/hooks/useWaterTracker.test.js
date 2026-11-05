// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWaterTracker } from './useWaterTracker';

describe('useWaterTracker', () => {
  it('updates optimistically, then takes the server value and target', async () => {
    const authDataSource = { updateTodayWaterLog: vi.fn().mockResolvedValue({ glasses: 4, targetGlasses: 8 }) };
    const { result } = renderHook(() => useWaterTracker({ authDataSource }));

    await act(async () => {
      await result.current.handleWaterGlassesChange(3);
    });

    expect(authDataSource.updateTodayWaterLog).toHaveBeenCalledWith(3);
    expect(result.current.waterGlasses).toBe(4);
    expect(result.current.targetWaterGlasses).toBe(8);
  });

  it('never goes below zero', async () => {
    const authDataSource = { updateTodayWaterLog: vi.fn().mockResolvedValue(null) };
    const { result } = renderHook(() => useWaterTracker({ authDataSource }));
    await act(async () => {
      await result.current.handleWaterGlassesChange(-2);
    });
    expect(authDataSource.updateTodayWaterLog).toHaveBeenCalledWith(0);
    expect(result.current.waterGlasses).toBe(0);
  });

  it('keeps the optimistic value when the API call fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const authDataSource = { updateTodayWaterLog: vi.fn().mockRejectedValue(new Error('offline')) };
    const { result } = renderHook(() => useWaterTracker({ authDataSource }));
    await act(async () => {
      await result.current.handleWaterGlassesChange(5);
    });
    expect(result.current.waterGlasses).toBe(5);
  });
});
