// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMentorChat } from './useMentorChat';

beforeEach(() => {
  // jsdom has no scrollIntoView
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

const setup = (over = {}) => {
  const source = {
    getChatHistory: vi.fn().mockResolvedValue([]),
    chatWithMentor: vi.fn().mockResolvedValue('AI says hi'),
    clearChatHistory: vi.fn().mockResolvedValue(undefined),
    ...over
  };
  const hook = renderHook(() => useMentorChat({ getSessionToken: () => 'tok', mentorApiDataSource: source }));
  return { source, hook };
};

describe('useMentorChat', () => {
  it('starts with a greeting and a closed drawer', () => {
    const { hook } = setup();
    expect(hook.result.current.chatLog).toHaveLength(1);
    expect(hook.result.current.chatLog[0].sender).toBe('ai');
    expect(hook.result.current.isChatOpen).toBe(false);
  });

  it('sends a message, clears the input and appends the AI reply', async () => {
    const { source, hook } = setup();
    act(() => hook.result.current.setChatMessage('hello'));
    await act(async () => {
      await hook.result.current.handleSendChatMessage({ preventDefault: vi.fn() });
    });

    expect(source.chatWithMentor).toHaveBeenCalledWith('hello', 'tok');
    const log = hook.result.current.chatLog;
    expect(log.at(-2)).toMatchObject({ sender: 'user', text: 'hello' });
    expect(log.at(-1)).toMatchObject({ sender: 'ai', text: 'AI says hi' });
    expect(hook.result.current.chatMessage).toBe('');
    expect(hook.result.current.isChatLoading).toBe(false);
  });

  it('ignores blank messages', async () => {
    const { source, hook } = setup();
    act(() => hook.result.current.setChatMessage('   '));
    await act(async () => {
      await hook.result.current.handleSendChatMessage({ preventDefault: vi.fn() });
    });
    expect(source.chatWithMentor).not.toHaveBeenCalled();
  });

  it('shows an error message in the chat when the mentor call fails', async () => {
    const { hook } = setup({ chatWithMentor: vi.fn().mockRejectedValue(new Error('down')) });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => hook.result.current.setChatMessage('hi'));
    await act(async () => {
      await hook.result.current.handleSendChatMessage({ preventDefault: vi.fn() });
    });
    expect(hook.result.current.chatLog.at(-1).text).toContain('❌');
    expect(hook.result.current.isChatLoading).toBe(false);
  });

  it('replaces the log with the saved history', async () => {
    const { hook } = setup({
      getChatHistory: vi.fn().mockResolvedValue([{ id: 1, sender: 'user', message: 'old', createdAt: 't' }])
    });
    await act(async () => {
      await hook.result.current.loadChatHistory('tok');
    });
    expect(hook.result.current.chatLog).toEqual([{ id: 1, sender: 'user', text: 'old', createdAt: 't' }]);
    expect(hook.result.current.isChatHistoryLoading).toBe(false);
  });

  it('clears the history only after confirmation', async () => {
    const { source, hook } = setup();
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    await act(async () => {
      await hook.result.current.handleClearChatHistory();
    });
    expect(source.clearChatHistory).not.toHaveBeenCalled();

    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    await act(async () => {
      await hook.result.current.handleClearChatHistory();
    });
    expect(source.clearChatHistory).toHaveBeenCalledWith('tok');
    vi.unstubAllGlobals();
  });
});
