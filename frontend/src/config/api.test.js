import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('API_BASE_URL', () => {
  it('uses VITE_API_URL when provided', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/api');
    const { API_BASE_URL } = await import('./api.js');
    expect(API_BASE_URL).toBe('https://api.example.com/api');
  });
});
