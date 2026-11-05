import { useEffect } from 'react';

/**
 * Props that make a non-button element behave like one for keyboard and screen
 * reader users: focusable, announced as a button, activated with Enter or Space.
 * Prefer a real <button>; use this where restyling the element would be risky.
 */
export function clickable(handler) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: handler,
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handler(event);
      }
    },
  };
}

/** Calls onClose when Escape is pressed while the component is mounted. */
export function useEscapeKey(onClose) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
}
