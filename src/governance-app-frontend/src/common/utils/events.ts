import type { SyntheticEvent } from 'react';

/**
 * React bubbles events from a portal, such as a dialog or a drawer, to the components that
 * render it, but the portal is not in their DOM subtree. A clickable parent ignores these events.
 */
export const isFromPortal = (event: SyntheticEvent): boolean =>
  !event.currentTarget.contains(event.target as Node);
