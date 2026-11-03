import { describe, it, expect } from 'vitest';
import { WARMUP_COOLDOWN_DATA, detectWorkoutMuscleCategory } from './warmupCooldownData';

describe('warmup/cooldown data', () => {
  it('exposes data and a category detector that returns a string', () => {
    expect(WARMUP_COOLDOWN_DATA).toBeTruthy();
    expect(typeof detectWorkoutMuscleCategory('Squat')).toBe('string');
  });
});
