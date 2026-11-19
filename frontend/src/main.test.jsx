import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  document.body.innerHTML = '';
});

describe('main entry point', () => {
  it('mounts the app into #root and installs the token-refresh fetch wrapper', async () => {
    const originalFetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }));
    vi.stubGlobal('fetch', originalFetch);
    window.fetch = originalFetch;
    window.scrollTo = vi.fn();
    document.body.innerHTML = '<div id="root"></div>';

    await import('./main.jsx');

    // the wrapper replaced window.fetch
    expect(window.fetch).not.toBe(originalFetch);
    await vi.waitFor(() => expect(document.getElementById('root').children.length).toBeGreaterThan(0));
  });
});
