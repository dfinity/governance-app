import { useSessionCountdownToast } from '@hooks/useSessionCountdownToast';

/**
 * Hosts the session-countdown toast side effect in its own leaf so the once-per-second
 * session timer re-renders only this (null-rendering) component instead of the whole
 * layout it used to live in. Renders nothing.
 */
export const SessionCountdownToast = () => {
  useSessionCountdownToast();
  return null;
};
