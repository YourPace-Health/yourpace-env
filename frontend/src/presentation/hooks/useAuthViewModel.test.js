import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuthViewModel } from './useAuthViewModel';

function reply(body, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });
}

const loginBody = {
  accessToken: 'AT',
  refreshToken: 'RT',
  user: { userId: 'u1', email: 'a@b.co', username: 'Ann' },
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete window.google;
});

async function setup() {
  const hook = renderHook(() => useAuthViewModel());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe('useAuthViewModel', () => {
  it('starts signed out in sign-in mode', async () => {
    const { result } = await setup();
    expect(result.current.currentUser).toBeNull();
    expect(result.current.authMode).toBe('signin');
    expect(result.current.loginMethod).toBe('email');
  });

  it('restores a stored session on mount and on demand', async () => {
    localStorage.setItem('yourpace_session', JSON.stringify({ user: { id: 'u1', email: 'a@b.co', name: 'Ann' }, token: 'T' }));
    const { result } = await setup();
    await waitFor(() => expect(result.current.currentUser?.email).toBe('a@b.co'));

    let user;
    await act(async () => {
      user = await result.current.checkSession();
    });
    expect(user.email).toBe('a@b.co');
  });

  it('checkSession survives a corrupt stored session', async () => {
    const { result } = await setup();
    localStorage.setItem('yourpace_session', '{not json');
    await act(async () => {
      await result.current.checkSession();
    });
    expect(result.current.currentUser).toBeNull();
  });

  it('signs in with email and password', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(loginBody)));
    const { result } = await setup();
    await act(async () => {
      await result.current.loginWithEmail('a@b.co', 'secret1', true);
    });
    expect(result.current.currentUser.name).toBe('Ann');
    expect(result.current.successMessage).toContain('เข้าสู่ระบบเรียบร้อย');
    expect(result.current.error).toBeNull();
  });

  it('reports validation and server errors from email login', async () => {
    const { result } = await setup();
    await act(async () => {
      await expect(result.current.loginWithEmail('bad', 'secret1', true)).rejects.toThrow();
    });
    expect(result.current.error).toContain('อีเมล');

    vi.stubGlobal('fetch', vi.fn(() => reply({ error: 'wrong password' }, false)));
    await act(async () => {
      await expect(result.current.loginWithEmail('a@b.co', 'secret1', true)).rejects.toThrow();
    });
    expect(result.current.error).toBe('wrong password');
  });

  it('registers, then confirms the OTP and returns to sign-in', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply({ message: 'ok' })));
    const { result } = await setup();
    await act(async () => {
      await result.current.registerUser('Ann', 'a@b.co', 'secret1');
    });
    expect(result.current.isVerifyingOTP).toBe(true);
    expect(result.current.otpEmail).toBe('a@b.co');

    act(() => result.current.setAuthMode('signup'));
    await act(async () => {
      await result.current.confirmOTP('123456');
    });
    expect(result.current.isVerifyingOTP).toBe(false);
    expect(result.current.authMode).toBe('signin');
    expect(result.current.successMessage).toContain('ยืนยันอีเมลสำเร็จ');
  });

  it('reports registration and OTP failures', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply({ error: 'email already exists' }, false)));
    const { result } = await setup();
    await act(async () => {
      await expect(result.current.registerUser('Ann', 'a@b.co', 'secret1')).rejects.toThrow();
    });
    expect(result.current.error).toBe('email already exists');
    await act(async () => {
      await expect(result.current.confirmOTP('000000')).rejects.toThrow();
    });
    expect(result.current.error).toBe('email already exists');
  });

  it('signs in with Google', async () => {
    window.google = {
      accounts: { oauth2: { initTokenClient: (cfg) => ({ requestAccessToken: () => cfg.callback({ access_token: 'g' }) }) } },
    };
    vi.stubGlobal('fetch', vi.fn(() => reply(loginBody)));
    const { result } = await setup();
    await act(async () => {
      await result.current.loginWithGoogle();
    });
    expect(result.current.currentUser.email).toBe('a@b.co');
    expect(result.current.successMessage).toContain('Google');
  });

  it('reports a Google sign-in failure', async () => {
    const { result } = await setup(); // no SDK loaded
    await act(async () => {
      await expect(result.current.loginWithGoogle()).rejects.toThrow();
    });
    expect(result.current.error).toContain('Google');
  });

  it('requests and verifies magic links', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(loginBody)));
    const { result } = await setup();
    await act(async () => {
      await result.current.requestMagicLink('a@b.co');
    });
    expect(result.current.successMessage).toContain('a@b.co');

    await act(async () => {
      await result.current.verifyMagicLink('tok');
    });
    expect(result.current.currentUser.name).toBe('Ann');

    await act(async () => {
      await expect(result.current.requestMagicLink('nope')).rejects.toThrow();
    });
    expect(result.current.error).toContain('อีเมล');

    vi.stubGlobal('fetch', vi.fn(() => reply({ error: 'expired' }, false)));
    await act(async () => {
      await expect(result.current.verifyMagicLink('tok')).rejects.toThrow();
    });
    expect(result.current.error).toBe('expired');
  });

  it('handles password reset requests', async () => {
    const { result } = await setup();
    await act(async () => {
      await result.current.requestResetPassword('a@b.co');
    });
    expect(result.current.successMessage).toContain('a@b.co');
    await act(async () => {
      await expect(result.current.requestResetPassword('')).rejects.toThrow();
    });
    expect(result.current.error).toContain('อีเมล');
  });

  it('logs out and clears the stored session', async () => {
    localStorage.setItem('yourpace_session', JSON.stringify({ user: { id: 'u1', email: 'a@b.co' }, token: 'T' }));
    const { result } = await setup();
    await waitFor(() => expect(result.current.currentUser).not.toBeNull());
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.currentUser).toBeNull();
    expect(localStorage.getItem('yourpace_session')).toBeNull();
    expect(result.current.successMessage).toContain('ออกจากระบบ');
  });
});
