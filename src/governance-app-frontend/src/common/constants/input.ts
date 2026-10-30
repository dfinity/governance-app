/**
 * Props for a field that takes an address, a principal, or an ID.
 * Mobile keyboards must not capitalize, autocorrect, or spell check the value.
 */
export const IDENTIFIER_INPUT_PROPS = {
  autoCapitalize: 'none',
  autoComplete: 'off',
  autoCorrect: 'off',
  spellCheck: false,
} as const;
