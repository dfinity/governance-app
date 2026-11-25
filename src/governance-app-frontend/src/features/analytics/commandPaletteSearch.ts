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
 * Gives one form to text that reads the same: compatibility characters, case (`ß` becomes `ss`),
 * accents, and the Greek final sigma. A prefix of a name then matches the folded name.
 */
const fold = (text: string): string =>
  text
    .normalize('NFKD')
    .toUpperCase()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/ς/g, 'σ');

/**
 * Splits a folded word into runs of letters and digits, and runs of symbols such as emoji.
 * Quotes, dashes, slashes, and other punctuation separate the parts. A word with only
 * punctuation stays as one part.
 */
const toParts = (word: string): string[] => {
  const folded = fold(word);
  const parts = folded.match(/[\p{L}\p{N}]+|\p{S}+/gu) ?? [];
  return parts.length > 0 ? parts : [folded];
};

const isPrivateWord = (word: string, privateParts: string[]): boolean =>
  toParts(word).some((part) => privateParts.some((privatePart) => privatePart.startsWith(part)));

// A command name such as `light-theme` also matches the pattern. The checksum tells them apart.
const isPrincipal = (word: string): boolean =>
  PRINCIPAL_PATTERN.test(word) && nonNullish(getPrincipalFromString(word));

/**
 * Counts the runs of letters and digits. Commas, dashes, and other marks also separate words,
 * for example in a pasted recovery phrase. A principal or an email address is one word.
 */
const countWords = (word: string): number =>
  word.includes('@') || isPrincipal(word) ? 1 : (word.match(/[\p{L}\p{N}]+/gu)?.length ?? 0);

const maskWord = (word: string, privateParts: string[]): string => {
  // An amount, a neuron ID, a proposal ID, or a hex account ID.
  if (/\d/.test(word)) return '#';
  if (word.length > MAX_WORD_LENGTH || word.includes('@')) return '*';
  if (isPrincipal(word)) return '*';
  // Only punctuation, for example `"!!!"`. A private name can be only punctuation too.
  if (!/[\p{L}\p{N}\p{S}]/u.test(word)) return '*';
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
  // Before the mask, so the words in a masked long word also count.
  const wordCount = words.reduce((count, word) => count + countWords(word), 0);
  if (wordCount > MAX_QUERY_WORDS) return undefined;

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
