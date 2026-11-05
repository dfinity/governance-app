/**
 * Makes a summary card clickable as a whole (the "stretched link" pattern).
 * The action stays the only interactive element: its `::after` covers the
 * card, so screen readers and keyboards get one control with a clear name.
 * Give the action `data-card-action`, and give other controls in the card
 * `relative z-10` to keep them above the cover.
 */
export const CLICKABLE_CARD_CLASS =
  'group relative transition has-[[data-card-action]:focus-visible]:ring-[3px] has-[[data-card-action]:focus-visible]:ring-ring/50 motion-safe:active:scale-[0.99]';

/** Hover border for a clickable card that has no tint. */
export const CLICKABLE_CARD_HOVER_CLASS = 'hover:border-muted-foreground/40';

/**
 * The label and its icon flow as text, so a long label wraps with the icon
 * after the last word. Put a no-break space between the label and the icon.
 */
export const CARD_ACTION_CLASS =
  'cursor-pointer text-left text-sm outline-none after:absolute after:inset-0 disabled:pointer-events-none';

export const CARD_ACTION_ICON_CLASS = 'inline-block size-3.5 align-[-2px]';

/** Icon that moves on card hover, for an action that opens another page. */
export const CARD_ACTION_CHEVRON_CLASS = `${CARD_ACTION_ICON_CLASS} motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5`;

/** Icon that grows on card hover, for an action that runs in place. */
export const CARD_ACTION_CHECK_CLASS = `${CARD_ACTION_ICON_CLASS} motion-safe:transition-transform motion-safe:group-hover:scale-120`;
