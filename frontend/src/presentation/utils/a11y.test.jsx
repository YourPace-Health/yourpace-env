// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { clickable, useEscapeKey } from './a11y';

afterEach(cleanup);

describe('clickable', () => {
  it('is focusable, a button, and activates with Enter and Space but not other keys', () => {
    const handler = vi.fn();
    const { getByText } = render(<div {...clickable(handler)}>go</div>);
    const el = getByText('go');
    expect(el.getAttribute('role')).toBe('button');
    expect(el.tabIndex).toBe(0);

    fireEvent.click(el);
    fireEvent.keyDown(el, { key: 'Enter' });
    fireEvent.keyDown(el, { key: ' ' });
    expect(handler).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(el, { key: 'a' });
    expect(handler).toHaveBeenCalledTimes(3);
  });
});

describe('useEscapeKey', () => {
  function Probe({ onClose }) {
    useEscapeKey(onClose);
    return null;
  }

  it('calls onClose on Escape only, and stops after unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(<Probe onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
