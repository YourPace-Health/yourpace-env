import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LoginForm } from './LoginForm';
import { MagicLinkForm } from './MagicLinkForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { SocialLogin } from './SocialLogin';
import { ErrorBoundary } from '../Common/ErrorBoundary';

afterEach(cleanup);

describe('LoginForm', () => {
  it('submits the entered credentials and the stay-signed-in choice', () => {
    const onSubmit = vi.fn();
    const { container } = render(<LoginForm onSubmit={onSubmit} isLoading={false} onForgotPasswordClick={() => {}} />);

    fireEvent.change(container.querySelector('input[type="email"]'), { target: { value: 'a@b.co' } });
    fireEvent.change(container.querySelector('input[type="password"]'), { target: { value: 'secret1' } });
    fireEvent.click(screen.getByLabelText(/Stay Signed In/));
    fireEvent.submit(container.querySelector('form'));

    expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.co', password: 'secret1', staySignedIn: false });
  });

  it('toggles password visibility and opens the forgot-password flow', () => {
    const onForgot = vi.fn();
    const { container } = render(<LoginForm onSubmit={() => {}} isLoading={false} onForgotPasswordClick={onForgot} />);

    expect(container.querySelector('input[type="password"]')).toBeTruthy();
    const toggle = container.querySelectorAll('button[type="button"]')[1];
    fireEvent.click(toggle);
    expect(container.querySelector('input[type="password"]')).toBeNull();
    fireEvent.click(toggle);
    expect(container.querySelector('input[type="password"]')).toBeTruthy();

    fireEvent.click(screen.getByText('ลืมรหัสผ่าน?'));
    expect(onForgot).toHaveBeenCalled();
  });

  it('shows a busy state and reacts to hover/focus without crashing', () => {
    const { container, rerender } = render(<LoginForm onSubmit={() => {}} isLoading={false} onForgotPasswordClick={() => {}} />);
    const submit = container.querySelector('button[type="submit"]');
    fireEvent.mouseEnter(submit);
    fireEvent.mouseLeave(submit);
    const email = container.querySelector('input[type="email"]');
    fireEvent.focus(email);
    fireEvent.blur(email);

    rerender(<LoginForm onSubmit={() => {}} isLoading onForgotPasswordClick={() => {}} />);
    const busy = container.querySelector('button[type="submit"]');
    expect(busy.disabled).toBe(true);
    expect(busy.textContent).toContain('กำลังดำเนินการ');
    fireEvent.mouseEnter(busy);
    fireEvent.mouseLeave(busy);
  });
});

describe('MagicLinkForm', () => {
  it('submits the email', () => {
    const onSubmit = vi.fn();
    const { container } = render(<MagicLinkForm onSubmit={onSubmit} isLoading={false} />);
    const input = container.querySelector('input[type="email"]');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'a@b.co' } });
    fireEvent.blur(input);
    const submit = screen.getByText('ส่ง Magic Link');
    fireEvent.mouseEnter(submit);
    fireEvent.mouseLeave(submit);
    fireEvent.submit(container.querySelector('form'));
    expect(onSubmit).toHaveBeenCalledWith('a@b.co');
  });

  it('disables the button while sending', () => {
    const { container } = render(<MagicLinkForm onSubmit={() => {}} isLoading />);
    const button = container.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('กำลังส่งลิงก์');
    fireEvent.mouseEnter(button);
    fireEvent.mouseLeave(button);
  });
});

describe('ForgotPasswordForm', () => {
  it('submits the email and can go back to login', () => {
    const onSubmit = vi.fn();
    const onBack = vi.fn();
    const { container } = render(<ForgotPasswordForm onSubmit={onSubmit} isLoading={false} onBackToLoginClick={onBack} />);

    const back = screen.getByText('ย้อนกลับไปหน้าล็อกอิน').closest('button');
    fireEvent.mouseEnter(back);
    fireEvent.mouseLeave(back);
    fireEvent.click(back);
    expect(onBack).toHaveBeenCalled();

    const input = container.querySelector('input[type="email"]');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'a@b.co' } });
    fireEvent.blur(input);
    const submit = container.querySelector('button[type="submit"]');
    fireEvent.mouseEnter(submit);
    fireEvent.mouseLeave(submit);
    fireEvent.submit(container.querySelector('form'));
    expect(onSubmit).toHaveBeenCalledWith('a@b.co');
  });

  it('is disabled while loading', () => {
    const { container } = render(<ForgotPasswordForm onSubmit={() => {}} isLoading onBackToLoginClick={() => {}} />);
    const submit = container.querySelector('button[type="submit"]');
    expect(submit.disabled).toBe(true);
    fireEvent.mouseEnter(submit);
    fireEvent.mouseLeave(submit);
  });
});

describe('SocialLogin', () => {
  it('starts Google sign-in', () => {
    const onGoogle = vi.fn();
    render(<SocialLogin onGoogleLogin={onGoogle} isLoading={false} />);
    const button = screen.getByText('ดำเนินการต่อด้วย Google').closest('button');
    fireEvent.mouseEnter(button);
    fireEvent.mouseLeave(button);
    fireEvent.click(button);
    expect(onGoogle).toHaveBeenCalled();
  });

  it('is disabled while another sign-in is running', () => {
    const onGoogle = vi.fn();
    render(<SocialLogin onGoogleLogin={onGoogle} isLoading />);
    const button = screen.getByText('ดำเนินการต่อด้วย Google').closest('button');
    expect(button.disabled).toBe(true);
    fireEvent.mouseEnter(button);
    fireEvent.mouseLeave(button);
    fireEvent.click(button);
    expect(onGoogle).not.toHaveBeenCalled();
  });
});

describe('ErrorBoundary', () => {
  function Bomb() {
    throw new Error('kaboom');
  }

  it('renders its children when nothing fails', () => {
    render(<ErrorBoundary><p>all good</p></ErrorBoundary>);
    expect(screen.getByText('all good')).toBeTruthy();
  });

  it('shows a fallback with a reload button when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } });

    const { container } = render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(container.textContent).toContain('เกิดข้อผิดพลาดในการแสดงผล');
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(reload).toHaveBeenCalled();

    Object.defineProperty(window, 'location', { configurable: true, value: original });
    vi.restoreAllMocks();
  });
});
