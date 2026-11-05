// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ChatWidget } from './ChatWidget';

afterEach(cleanup);

const base = () => ({
  chatEndRef: { current: null },
  chatLog: [],
  chatMessage: '',
  handleClearChatHistory: vi.fn(),
  handleSendChatMessage: vi.fn((e) => e?.preventDefault?.()),
  isChatHistoryLoading: false,
  isChatLoading: false,
  isChatOpen: false,
  setChatMessage: vi.fn(),
  setIsChatOpen: vi.fn()
});

describe('ChatWidget', () => {
  it('shows the launcher button when closed and opens on click', () => {
    const p = base();
    const { container } = render(<ChatWidget {...p} />);
    const button = container.querySelector('button');
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(p.setIsChatOpen).toHaveBeenCalledWith(true);
  });

  it('renders the drawer with the message input when open', () => {
    const p = { ...base(), isChatOpen: true, chatMessage: 'hello' };
    const { container } = render(<ChatWidget {...p} />);
    const input = container.querySelector('input, textarea');
    expect(input.value).toBe('hello');
    fireEvent.change(input, { target: { value: 'hi' } });
    expect(p.setChatMessage).toHaveBeenCalled();
  });

  it('shows the loading indicator while the mentor replies', () => {
    const p = { ...base(), isChatOpen: true, isChatLoading: true };
    render(<ChatWidget {...p} />);
    expect(screen.getByText(/กำลังประมวลผล/)).toBeTruthy();
  });
});
