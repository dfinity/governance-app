/**
 * Determines whether a keyboard shortcut event should be ignored.
 *
 * Returns `true` if:
 * - The key is being held down (repeat)
 * - A modifier key is pressed (Ctrl, Cmd, Alt, Shift)
 * - The event target is an input field, textarea, select, or contenteditable element
 */
export const shouldIgnoreKeyboardShortcut = (event: KeyboardEvent): boolean => {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return true;

  const target = event.target as HTMLElement;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
};
