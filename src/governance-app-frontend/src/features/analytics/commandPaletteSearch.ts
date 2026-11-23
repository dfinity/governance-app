import { nonNullish } from '@dfinity/utils';

import { getPrincipalFromString } from '@utils/principal';

export const NO_RESULT_DELAY_MS = 1000;

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 40;
// A command search is short. A longer query can be a pasted recovery phrase or a sentence.
const MAX_QUERY_WORDS = 4;
const MAX_WORD_LENGTH = 20;
// A principal in text form: groups of base32 characters with dashes, for example `aaaaa-aa`.
const PRINCIPAL_PATTERN = /^[a-z2-7]{5}(-[a-z2-7]{1,5})+$/;

const toWords = (text: string): string[] => text.trim().toLowerCase().split(/\s+/);

/**
 * Splits a word at quotes, dashes, slashes, and other marks. A word with no letter or digit, for
 * example an emoji, stays as one part. NFKC gives the same form to the same text.
 */
const toParts = (word: string): string[] => {
  const normalized = word.normalize('NFKC');
  const parts = normalized.split(/[^\p{L}\p{M}\p{N}]+/u).filter((part) => part.length > 0);
  return parts.length > 0 ? parts : [normalized];
};

const isPrivateWord = (word: string, privateParts: string[]): boolean =>
  toParts(word).some((part) => privateParts.some((privatePart) => privatePart.startsWith(part)));

const maskWord = (word: string, privateParts: string[]): string => {
  // An amount, a neuron ID, a proposal ID, or a hex account ID.
  if (/\d/.test(word)) return '#';
  if (word.length > MAX_WORD_LENGTH || word.includes('@')) return '*';
  // A command name such as `light-theme` also matches the pattern. The checksum tells them apart.
  if (PRINCIPAL_PATTERN.test(word) && nonNullish(getPrincipalFromString(word))) return '*';
  // A prefix too, because a pause in typing sends the search before the user types the full name.
  if (isPrivateWord(word, privateParts)) return '*';
  return word;
};

/**
 * Returns the search query in a form that is safe to send to analytics, or `undefined` if the
 * query is too short or has too many words. A word with a digit becomes `#`. A long word, an
 * email address, a principal, or a word of a private name becomes `*`.
 *
 * @param privateNames Names that the user gave, for example address book names.
 */
export const maskSearchQuery = (
  query: string,
  privateNames: readonly string[] = [],
): string | undefined => {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < MIN_QUERY_LENGTH) return undefined;

  const words = toWords(normalized);
  if (words.length > MAX_QUERY_WORDS) return undefined;

  const privateParts = privateNames
    .flatMap(toWords)
    .flatMap(toParts)
    .filter((part) => part.length > 0);
  return words
    .map((word) => maskWord(word, privateParts))
    .join(' ')
    .slice(0, MAX_QUERY_LENGTH)
    .trimEnd();
};

/**
 * Sends a search that has no result after a pause in typing, or when `flush` runs.
 * A search with results, an empty search, or `undefined` private names cancels the pending send.
 * The same query is sent one time only.
 */
export const createNoResultReporter = (send: (query: string) => void) => {
  let pending: string | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastSent: string | undefined;

  const flush = () => {
    clearTimeout(timer);
    const query = pending;
    pending = undefined;
    if (query === undefined || query === lastSent) return;
    lastSent = query;
    send(query);
  };

  const update = (
    search: string,
    hasResults: boolean,
    privateNames: readonly string[] | undefined,
  ) => {
    clearTimeout(timer);
    // While the private names load, the mask cannot hide them.
    pending =
      hasResults || privateNames === undefined ? undefined : maskSearchQuery(search, privateNames);
    if (pending !== undefined) timer = setTimeout(flush, NO_RESULT_DELAY_MS);
  };

  return { update, flush };
};
