import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { AuthPage } from './AuthPage';

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
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete window.google;
});

// jsdom does not expose named form controls as properties (form.username), which the page
// relies on in real browsers, so add them before submitting.
function submitForm(container) {
  const form = container.querySelector('form');
  form.querySelectorAll('[name]').forEach((el) => {
    Object.defineProperty(form, el.name, { configurable: true, value: el });
  });
  fireEvent.submit(form);
}

function fillLogin(container, email = 'a@b.co', password = 'secret1') {
  fireEvent.change(container.querySelector('input[type="email"]'), { target: { value: email } });
  fireEvent.change(container.querySelector('input[type="password"]'), { target: { value: password } });
  fireEvent.submit(container.querySelector('form'));
}

describe('AuthPage', () => {
  it('goes back to the landing page', () => {
    const onBack = vi.fn();
    render(<AuthPage onBackToHome={onBack} onAuthSuccess={() => {}} />);
    const back = screen.getByText('กลับหน้าแรก yourPace').closest('button');
    fireEvent.mouseEnter(back);
    fireEvent.mouseLeave(back);
    fireEvent.click(back);
    expect(onBack).toHaveBeenCalled();
  });

  it('signs in with email and reports success to the app', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(loginBody)));
    const onSuccess = vi.fn();
    const { container } = render(<AuthPage onBackToHome={() => {}} onAuthSuccess={onSuccess} />);

    fillLogin(container);
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0][0].email).toBe('a@b.co');
    expect(screen.getByText(/เข้าสู่ระบบเรียบร้อย/)).toBeTruthy();

    // the message banner can be dismissed
    const banner = screen.getByText(/เข้าสู่ระบบเรียบร้อย/).parentElement;
    fireEvent.click(banner.querySelector('button'));
    expect(screen.queryByText(/เข้าสู่ระบบเรียบร้อย/)).toBeNull();
  });

  it('shows the server error and lets the user dismiss it', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply({ error: 'รหัสผ่านผิด' }, false)));
    const onSuccess = vi.fn();
    const { container } = render(<AuthPage onBackToHome={() => {}} onAuthSuccess={onSuccess} />);

    fillLogin(container);
    const message = await screen.findByText('รหัสผ่านผิด');
    expect(onSuccess).not.toHaveBeenCalled();
    fireEvent.click(message.parentElement.querySelector('button'));
    expect(screen.queryByText('รหัสผ่านผิด')).toBeNull();
  });

  it('works without an onAuthSuccess callback', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(loginBody)));
    const { container } = render(<AuthPage onBackToHome={() => {}} />);
    fillLogin(container);
    expect(await screen.findByText(/เข้าสู่ระบบเรียบร้อย/)).toBeTruthy();
  });

  it('requests a magic link from the second tab', async () => {
    const fetchMock = vi.fn(() => reply({}));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<AuthPage onBackToHome={() => {}} onAuthSuccess={() => {}} />);

    fireEvent.click(screen.getByText(/Magic Link \(/));
    fireEvent.change(container.querySelector('input[type="email"]'), { target: { value: 'a@b.co' } });
    fireEvent.submit(container.querySelector('form'));

    expect(await screen.findByText(/ส่ง Magic Link ไปที่ a@b.co/)).toBeTruthy();
    expect(fetchMock.mock.calls[0][0]).toContain('/auth/magic-link');

    fireEvent.click(screen.getByText('อีเมลและรหัสผ่าน'));
    expect(container.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('walks through the forgot-password flow', async () => {
    const { container } = render(<AuthPage onBackToHome={() => {}} onAuthSuccess={() => {}} />);
    fireEvent.click(screen.getByText('ลืมรหัสผ่าน?'));
    fireEvent.change(container.querySelector('input[type="email"]'), { target: { value: 'a@b.co' } });
    fireEvent.submit(container.querySelector('form'));
    expect(await screen.findByText(/ตั้งค่ารหัสผ่านใหม่ไปที่ a@b.co/)).toBeTruthy();

    fireEvent.click(screen.getByText('ย้อนกลับไปหน้าล็อกอิน').closest('button'));
    expect(screen.getByText('ยินดีต้อนรับกลับมา')).toBeTruthy();
  });

  it('registers a new user, confirms the OTP and returns to sign-in', async () => {
    const fetchMock = vi.fn(() => reply({ message: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<AuthPage onBackToHome={() => {}} onAuthSuccess={() => {}} />);

    fireEvent.click(screen.getByText('สมัครใช้งานฟรี'));
    expect(screen.getByText('สร้างบัญชีใช้งานฟรี')).toBeTruthy();

    fireEvent.change(container.querySelector('input[name="username"]'), { target: { value: 'Ann' } });
    fireEvent.change(container.querySelector('input[name="email"]'), { target: { value: 'a@b.co' } });
    fireEvent.change(container.querySelector('input[name="password"]'), { target: { value: 'secret1' } });
    submitForm(container);

    expect(await screen.findByText('ยืนยันรหัส OTP', { selector: 'h3' })).toBeTruthy();
    expect(screen.getByText('a@b.co')).toBeTruthy();

    fireEvent.change(container.querySelector('input[name="otp"]'), { target: { value: '123456' } });
    submitForm(container);
    expect(await screen.findByText(/ยืนยันอีเมลสำเร็จ/)).toBeTruthy();
    expect(screen.getByText('ยินดีต้อนรับกลับมา')).toBeTruthy();
    expect(fetchMock.mock.calls.map((c) => c[0]).join(' ')).toContain('/auth/verify-otp');
  });

  it('can leave the OTP screen and shows registration errors', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => reply({ error: 'email already exists' }, false))
      .mockImplementation(() => reply({ message: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<AuthPage onBackToHome={() => {}} onAuthSuccess={() => {}} />);

    fireEvent.click(screen.getByText('สมัครใช้งานฟรี'));
    const submitSignup = () => {
      fireEvent.change(container.querySelector('input[name="username"]'), { target: { value: 'Ann' } });
      fireEvent.change(container.querySelector('input[name="email"]'), { target: { value: 'a@b.co' } });
      fireEvent.change(container.querySelector('input[name="password"]'), { target: { value: 'secret1' } });
      submitForm(container);
    };
    submitSignup();
    expect(await screen.findByText('email already exists')).toBeTruthy();

    submitSignup();
    await screen.findByText('ยืนยันรหัส OTP', { selector: 'h3' });
    fireEvent.click(screen.getByText('ย้อนกลับไปหน้าสมัครสมาชิก'));
    expect(screen.getByText('สร้างบัญชีใช้งานฟรี')).toBeTruthy();

    // toggling back to sign-in clears the banners
    fireEvent.click(screen.getByText('เข้าสู่ระบบที่นี่'));
    expect(screen.getByText('ยินดีต้อนรับกลับมา')).toBeTruthy();
  });

  it('shows OTP errors without leaving the screen', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => reply({ message: 'ok' }))
      .mockImplementation(() => reply({ error: 'รหัส OTP ผิด' }, false));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<AuthPage onBackToHome={() => {}} onAuthSuccess={() => {}} />);

    fireEvent.click(screen.getByText('สมัครใช้งานฟรี'));
    fireEvent.change(container.querySelector('input[name="username"]'), { target: { value: 'Ann' } });
    fireEvent.change(container.querySelector('input[name="email"]'), { target: { value: 'a@b.co' } });
    fireEvent.change(container.querySelector('input[name="password"]'), { target: { value: 'secret1' } });
    submitForm(container);
    await screen.findByText('ยืนยันรหัส OTP', { selector: 'h3' });

    fireEvent.change(container.querySelector('input[name="otp"]'), { target: { value: '000000' } });
    submitForm(container);
    expect(await screen.findByText('รหัส OTP ผิด')).toBeTruthy();
    expect(screen.getByText('ยืนยันรหัส OTP', { selector: 'h3' })).toBeTruthy();
  });

  it('signs in with Google, and reports when the SDK is missing', async () => {
    const onSuccess = vi.fn();
    render(<AuthPage onBackToHome={() => {}} onAuthSuccess={onSuccess} />);
    const googleButton = () => screen.getByText('ดำเนินการต่อด้วย Google').closest('button');
    // the button is disabled while the stored session is being restored
    await waitFor(() => expect(googleButton().disabled).toBe(false));
    fireEvent.click(googleButton());
    await waitFor(() => expect(document.body.textContent).toContain('SDK is not loaded'));
    expect(onSuccess).not.toHaveBeenCalled();

    window.google = {
      accounts: { oauth2: { initTokenClient: (cfg) => ({ requestAccessToken: () => cfg.callback({ access_token: 'g' }) }) } },
    };
    vi.stubGlobal('fetch', vi.fn(() => reply(loginBody)));
    await waitFor(() => expect(googleButton().disabled).toBe(false));
    fireEvent.click(googleButton());
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
