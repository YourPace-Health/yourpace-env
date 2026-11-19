import { describe, it, expect, vi } from 'vitest';
import { AuthRepositoryImpl } from './AuthRepositoryImpl';
import { AuthRepository } from '../../domain/repositories/AuthRepository';
import { User } from '../../domain/entities/User';
import { LoginWithEmailUseCase } from '../../domain/usecases/LoginWithEmailUseCase';
import { LoginWithGoogleUseCase } from '../../domain/usecases/LoginWithGoogleUseCase';
import { LoginWithMagicLinkUseCase } from '../../domain/usecases/LoginWithMagicLinkUseCase';
import { ResetPasswordUseCase } from '../../domain/usecases/ResetPasswordUseCase';

const rawUser = { id: 'u1', email: 'a@b.co', name: 'Ann', profilePicture: 'p.png', createdAt: '2026-01-01T00:00:00Z' };

function fakeSource() {
  return {
    loginWithEmail: vi.fn(async () => ({ user: rawUser, token: 'T' })),
    loginWithGoogle: vi.fn(async () => ({ user: rawUser, token: 'G' })),
    verifyMagicLink: vi.fn(async () => ({ user: rawUser, token: 'M' })),
    requestMagicLink: vi.fn(async () => ({ success: true })),
    resetPassword: vi.fn(async () => ({ success: true })),
    getCurrentSession: vi.fn(async () => ({ user: rawUser })),
    register: vi.fn(async () => ({ message: 'registered' })),
    verifyOTP: vi.fn(async () => ({ message: 'verified' })),
    clearSession: vi.fn(async () => true),
  };
}

describe('AuthRepositoryImpl', () => {
  it('maps session users to User entities', async () => {
    const repo = new AuthRepositoryImpl(fakeSource());
    for (const [method, args, token] of [
      ['loginWithEmail', ['a@b.co', 'pw', true], 'T'],
      ['loginWithGoogle', [], 'G'],
      ['verifyMagicLink', ['tok'], 'M'],
    ]) {
      const { user, token: t } = await repo[method](...args);
      expect(user).toBeInstanceOf(User);
      expect(user.isValid()).toBe(true);
      expect(user.name).toBe('Ann');
      expect(t).toBe(token);
    }
  });

  it('passes simple calls straight through', async () => {
    const source = fakeSource();
    const repo = new AuthRepositoryImpl(source);
    expect(await repo.requestMagicLink('a@b.co')).toEqual({ success: true });
    expect(await repo.resetPassword('a@b.co')).toEqual({ success: true });
    expect(await repo.register('Ann', 'a@b.co', 'pw')).toEqual({ message: 'registered' });
    expect(await repo.verifyOTP('a@b.co', '1')).toEqual({ message: 'verified' });
    expect(await repo.logout()).toBe(true);
    expect(source.register).toHaveBeenCalledWith('Ann', 'a@b.co', 'pw');
  });

  it('returns the current user, or null when signed out', async () => {
    const source = fakeSource();
    const repo = new AuthRepositoryImpl(source);
    expect((await repo.getCurrentUser()).email).toBe('a@b.co');
    source.getCurrentSession.mockResolvedValue(null);
    expect(await repo.getCurrentUser()).toBeNull();
    expect(repo._mapToUserEntity(null)).toBeNull();
  });
});

describe('AuthRepository contract', () => {
  it('every method must be implemented by a subclass', async () => {
    const repo = new AuthRepository();
    for (const method of ['loginWithEmail', 'loginWithGoogle', 'requestMagicLink', 'verifyMagicLink',
      'resetPassword', 'getCurrentUser', 'register', 'verifyOTP', 'logout']) {
      await expect(repo[method]()).rejects.toThrow(`${method}()`);
    }
  });
});

describe('User entity', () => {
  it('fills in a creation date and validates required fields', () => {
    const u = new User({ id: '1', email: 'a@b.co', name: 'A' });
    expect(u.createdAt).toMatch(/^\d{4}-/);
    expect(u.isValid()).toBe(true);
    expect(new User({ email: 'a@b.co' }).isValid()).toBe(false);
  });
});

describe('use cases', () => {
  const repo = () => ({
    loginWithEmail: vi.fn(async () => 'session'),
    loginWithGoogle: vi.fn(async () => 'google-session'),
    requestMagicLink: vi.fn(async () => 'sent'),
    resetPassword: vi.fn(async () => 'reset'),
  });

  it('LoginWithEmailUseCase validates before calling the repository', async () => {
    const r = repo();
    const uc = new LoginWithEmailUseCase(r);
    await expect(uc.execute('nope', 'secret1')).rejects.toThrow('อีเมล');
    await expect(uc.execute('a@b.co', '123')).rejects.toThrow('6');
    await expect(uc.execute('a@b.co', '')).rejects.toThrow('6');
    expect(r.loginWithEmail).not.toHaveBeenCalled();
    await expect(uc.execute('a@b.co', 'secret1', true)).resolves.toBe('session');
    expect(r.loginWithEmail).toHaveBeenCalledWith('a@b.co', 'secret1', true);
  });

  it('LoginWithGoogleUseCase delegates', async () => {
    await expect(new LoginWithGoogleUseCase(repo()).execute()).resolves.toBe('google-session');
  });

  it.each([
    [LoginWithMagicLinkUseCase, 'sent'],
    [ResetPasswordUseCase, 'reset'],
  ])('%o validates the email address', async (UseCase, result) => {
    const uc = new UseCase(repo());
    await expect(uc.execute('')).rejects.toThrow('อีเมล');
    await expect(uc.execute('no-at-sign')).rejects.toThrow('อีเมล');
    await expect(uc.execute('a@b.co')).resolves.toBe(result);
  });
});
