import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { API_BASE_URL } from '../../config/api';
import { AuthApiDataSource } from './AuthApiDataSource';
import { MealApiDataSource } from './MealApiDataSource';
import { MentorApiDataSource } from './MentorApiDataSource';
import { ProfileApiDataSource } from './ProfileApiDataSource';

function reply(body, ok = true, status = ok ? 200 : 400) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) });
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete window.google;
});

const loginBody = {
  accessToken: 'AT',
  refreshToken: 'RT',
  user: { userId: 'u1', email: 'a@b.co', username: 'Ann' },
};

describe('AuthApiDataSource', () => {
  it('logs in and keeps the session in localStorage when "stay signed in" is on', async () => {
    const fetchMock = vi.fn(() => reply(loginBody));
    vi.stubGlobal('fetch', fetchMock);

    const session = await new AuthApiDataSource().loginWithEmail('a@b.co', 'secret1', true);

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/auth/login`, expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'a@b.co', password: 'secret1' });
    expect(session).toMatchObject({ token: 'AT', refreshToken: 'RT', user: { id: 'u1', name: 'Ann', email: 'a@b.co' } });
    expect(session.user.profilePicture).toContain('Ann');
    expect(JSON.parse(localStorage.getItem('yourpace_session')).token).toBe('AT');
    expect(sessionStorage.getItem('yourpace_session')).toBeNull();
  });

  it('uses sessionStorage when the user does not stay signed in', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply({ ...loginBody, user: { ...loginBody.user, profilePicture: 'pic.png' } })));
    const session = await new AuthApiDataSource().loginWithEmail('a@b.co', 'secret1', false);
    expect(session.user.profilePicture).toBe('pic.png');
    expect(sessionStorage.getItem('yourpace_session')).not.toBeNull();
    expect(localStorage.getItem('yourpace_session')).toBeNull();
  });

  it('surfaces the server message (or a default) when login fails', async () => {
    const ds = new AuthApiDataSource();
    vi.stubGlobal('fetch', vi.fn(() => reply({ error: 'nope' }, false, 401)));
    await expect(ds.loginWithEmail('a@b.co', 'x', true)).rejects.toThrow('nope');
    vi.stubGlobal('fetch', vi.fn(() => reply({}, false, 401)));
    await expect(ds.loginWithEmail('a@b.co', 'x', true)).rejects.toThrow('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  });

  it.each([
    ['register', ['Ann', 'a@b.co', 'pw'], '/auth/register', { username: 'Ann', email: 'a@b.co', password: 'pw' }],
    ['verifyOTP', ['a@b.co', '123456'], '/auth/verify-otp', { email: 'a@b.co', otp: '123456' }],
  ])('%s posts to the API and rethrows errors', async (method, args, path, body) => {
    const ds = new AuthApiDataSource();
    const fetchMock = vi.fn(() => reply({ message: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(ds[method](...args)).resolves.toEqual({ message: 'ok' });
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}${path}`);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(body);

    vi.stubGlobal('fetch', vi.fn(() => reply({ error: 'bad' }, false)));
    await expect(ds[method](...args)).rejects.toThrow('bad');
    vi.stubGlobal('fetch', vi.fn(() => reply({}, false)));
    await expect(ds[method](...args)).rejects.toThrow();
  });

  it('requests a magic link and reports success', async () => {
    const ds = new AuthApiDataSource();
    vi.stubGlobal('fetch', vi.fn(() => reply({})));
    const res = await ds.requestMagicLink('a@b.co');
    expect(res.success).toBe(true);
    expect(res.message).toContain('a@b.co');

    vi.stubGlobal('fetch', vi.fn(() => reply({ error: 'unknown user' }, false)));
    await expect(ds.requestMagicLink('a@b.co')).rejects.toThrow('unknown user');
    vi.stubGlobal('fetch', vi.fn(() => reply({}, false)));
    await expect(ds.requestMagicLink('a@b.co')).rejects.toThrow('Magic Link');
  });

  it('verifies a magic link and stores the session', async () => {
    const ds = new AuthApiDataSource();
    vi.stubGlobal('fetch', vi.fn(() => reply(loginBody)));
    const session = await ds.verifyMagicLink('tok');
    expect(session.token).toBe('AT');
    expect(localStorage.getItem('yourpace_session')).not.toBeNull();

    vi.stubGlobal('fetch', vi.fn(() => reply({ error: 'expired' }, false)));
    await expect(ds.verifyMagicLink('tok')).rejects.toThrow('expired');
    vi.stubGlobal('fetch', vi.fn(() => reply({}, false)));
    await expect(ds.verifyMagicLink('tok')).rejects.toThrow();
  });

  it('simulates password reset locally', async () => {
    const res = await new AuthApiDataSource().resetPassword('a@b.co');
    expect(res.success).toBe(true);
    expect(res.message).toContain('a@b.co');
  });

  it('reads and clears the stored session from either storage', async () => {
    const ds = new AuthApiDataSource();
    expect(await ds.getCurrentSession()).toBeNull();
    sessionStorage.setItem('yourpace_session', JSON.stringify({ token: 's' }));
    expect(await ds.getCurrentSession()).toEqual({ token: 's' });
    localStorage.setItem('yourpace_session', JSON.stringify({ token: 'l' }));
    expect(await ds.getCurrentSession()).toEqual({ token: 'l' });
    expect(await ds.clearSession()).toBe(true);
    expect(await ds.getCurrentSession()).toBeNull();
  });

  describe('Google sign-in', () => {
    function stubGoogle(behaviour) {
      window.google = {
        accounts: {
          oauth2: {
            initTokenClient: (config) => ({ requestAccessToken: () => behaviour(config) }),
          },
        },
      };
    }

    it('fails clearly when the SDK is missing', async () => {
      await expect(new AuthApiDataSource().loginWithGoogle()).rejects.toThrow('not loaded');
    });

    it('exchanges the Google token for a session', async () => {
      stubGoogle((cfg) => cfg.callback({ access_token: 'g-token' }));
      const fetchMock = vi.fn(() => reply(loginBody));
      vi.stubGlobal('fetch', fetchMock);
      const session = await new AuthApiDataSource().loginWithGoogle();
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ accessToken: 'g-token' });
      expect(session.token).toBe('AT');
      expect(localStorage.getItem('yourpace_session')).not.toBeNull();
    });

    it('rejects when the backend refuses the token', async () => {
      stubGoogle((cfg) => cfg.callback({ access_token: 'g-token' }));
      vi.stubGlobal('fetch', vi.fn(() => reply({ error: 'bad token' }, false)));
      await expect(new AuthApiDataSource().loginWithGoogle()).rejects.toThrow('bad token');
    });

    it('rejects when the backend call throws', async () => {
      stubGoogle((cfg) => cfg.callback({ access_token: 'g-token' }));
      vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
      await expect(new AuthApiDataSource().loginWithGoogle()).rejects.toThrow('offline');
    });

    it('rejects when the user cancels or the client id is invalid', async () => {
      stubGoogle((cfg) => cfg.callback({}));
      await expect(new AuthApiDataSource().loginWithGoogle()).rejects.toThrow('ยกเลิก');
      stubGoogle((cfg) => cfg.error_callback({ type: 'invalid' }));
      await expect(new AuthApiDataSource().loginWithGoogle()).rejects.toThrow('invalid_client');
    });

    it('replaces a client secret mistakenly used as the client id', async () => {
      vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'GOCSPX-secret');
      let used;
      stubGoogle((cfg) => {
        used = cfg.client_id;
        cfg.callback({});
      });
      await new AuthApiDataSource().loginWithGoogle().catch(() => {});
      expect(used).not.toMatch(/^GOCSPX-/);
      vi.unstubAllEnvs();
    });
  });

  describe('water log', () => {
    it('returns null without a session', async () => {
      const ds = new AuthApiDataSource();
      expect(await ds.getTodayWaterLog()).toBeNull();
      expect(await ds.updateTodayWaterLog(1, 250)).toBeNull();
    });

    it('reads and updates the log with the stored token', async () => {
      localStorage.setItem('yourpace_session', JSON.stringify({ token: 'T' }));
      const ds = new AuthApiDataSource();
      const fetchMock = vi.fn(() => reply({ glasses: 3 }));
      vi.stubGlobal('fetch', fetchMock);

      expect(await ds.getTodayWaterLog()).toEqual({ glasses: 3 });
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer T');

      await ds.updateTodayWaterLog(4, 1000);
      expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ glasses: 4, amountMl: 1000 });
      await ds.updateTodayWaterLog('x', undefined);
      expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({});
    });

    it('returns null on HTTP or network failures', async () => {
      localStorage.setItem('yourpace_session', JSON.stringify({ token: 'T' }));
      const ds = new AuthApiDataSource();
      vi.stubGlobal('fetch', vi.fn(() => reply({}, false, 500)));
      expect(await ds.getTodayWaterLog()).toBeNull();
      expect(await ds.updateTodayWaterLog(1, 1)).toBeNull();
      vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('down'))));
      expect(await ds.getTodayWaterLog()).toBeNull();
      expect(await ds.updateTodayWaterLog(1, 1)).toBeNull();
    });
  });
});

// Every remaining datasource method follows one shape: call an endpoint with a bearer token,
// return the JSON on success and throw the server's message otherwise.
const cases = [
  [MealApiDataSource, 'getTodayMeals', ['T'], 'GET', '/meals/today'],
  [MealApiDataSource, 'previewMealAnalysis', ['rice', 'T'], 'POST', '/meals/preview', { mealDescription: 'rice' }],
  [MealApiDataSource, 'logMeal', [{ mealDescription: 'rice' }, 'T'], 'POST', '/meals/log', { mealDescription: 'rice' }],
  [MealApiDataSource, 'analyzeMealPhoto', ['b64', undefined, 'T'], 'POST', '/meals/analyze-photo', { imageData: 'b64', mimeType: 'image/jpeg' }],
  [MealApiDataSource, 'getEnergyBalance', ['T'], 'GET', '/meals/energy-balance'],
  [MealApiDataSource, 'getWeeklyAnalytics', ['T'], 'GET', '/meals/weekly-analytics'],
  [MealApiDataSource, 'getDailyCoachFeedback', ['T'], 'GET', '/meals/coach-feedback'],
  [MealApiDataSource, 'deleteMeal', ['m1', 'T'], 'DELETE', '/meals/m1'],
  [MentorApiDataSource, 'chatWithMentor', ['hi', 'T'], 'POST', '/mentor/chat', { message: 'hi' }],
  [MentorApiDataSource, 'getChatHistory', ['T'], 'GET', '/mentor/history'],
  [MentorApiDataSource, 'clearChatHistory', ['T'], 'DELETE', '/mentor/history'],
  [ProfileApiDataSource, 'getUserProfile', ['T'], 'GET', '/users/profile'],
  [ProfileApiDataSource, 'updateUserProfile', [{ age: 30 }, 'T'], 'PUT', '/users/profile', { age: 30 }],
  [ProfileApiDataSource, 'getEquipments', ['T'], 'GET', '/equipments'],
  [ProfileApiDataSource, 'getSettings', ['T'], 'GET', '/users/setting'],
  [ProfileApiDataSource, 'saveSettings', [{ timezone: 'UTC' }, 'T'], 'PUT', '/users/setting', { timezone: 'UTC' }],
];

describe.each(cases)('%o.%s', (Source, method, args, httpMethod, path, body) => {
  it('sends an authenticated request and returns the payload', async () => {
    const fetchMock = vi.fn(() => reply({ response: 'r', messages: [{ id: 1 }], ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new Source()[method](...args);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}${path}`);
    expect(init.method ?? 'GET').toBe(httpMethod);
    expect(init.headers.Authorization).toBe('Bearer T');
    if (body) expect(JSON.parse(init.body)).toEqual(body);
    expect(result).toBeDefined();
  });

  it('throws the server message when the request is rejected', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply({ error: 'server says no' }, false)));
    await expect(new Source()[method](...args)).rejects.toThrow('server says no');
  });

  it('throws a fallback message when the server gives none', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply({}, false)));
    await expect(new Source()[method](...args)).rejects.toThrow();
  });
});

describe('MentorApiDataSource return values', () => {
  it('unwraps the reply, the messages and the clear confirmation', async () => {
    const ds = new MentorApiDataSource();
    vi.stubGlobal('fetch', vi.fn(() => reply({ response: 'Go!' })));
    expect(await ds.chatWithMentor('hi', 'T')).toBe('Go!');
    vi.stubGlobal('fetch', vi.fn(() => reply({})));
    expect(await ds.getChatHistory('T')).toEqual([]);
    expect(await ds.clearChatHistory('T')).toBe(true);
  });
});
