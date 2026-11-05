import { useEscapeKey } from './a11y';

/** Render inside a dialog to close it with the Escape key (usable where hooks cannot be called). */
export function EscapeToClose({ onClose }) {
  useEscapeKey(onClose);
  return null;
}
