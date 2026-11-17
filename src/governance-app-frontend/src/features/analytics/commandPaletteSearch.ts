export const NO_RESULT_DELAY_MS = 1000;

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 40;
const MAX_WORD_LENGTH = 20;
// A principal in text form: groups of base32 characters with dashes, for example `aaaaa-aa`.
const PRINCIPAL_PATTERN = /^[a-z2-7]{5}(-[a-z2-7]{1,5})+$/;

const maskWord = (word: string): string => {
  // An amount, a neuron ID, a proposal ID, or a hex account ID.
  if (/\d/.test(word)) return '#';
  if (word.length > MAX_WORD_LENGTH || word.includes('@') || PRINCIPAL_PATTERN.test(word)) {
    return '*';
  }
  return word;
};

/**
 * Returns the search query in a form that is safe to send to analytics, or `undefined` if the
 * query is too short. A word with a digit becomes `#`. A long word, an email address, or a
 * principal becomes `*`.
 */
export const maskSearchQuery = (query: string): string | undefined => {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < MIN_QUERY_LENGTH) return undefined;

  return normalized.split(/\s+/).map(maskWord).join(' ').slice(0, MAX_QUERY_LENGTH).trimEnd();
};

/**
 * Sends a search that has no result after a pause in typing, or when `flush` runs.
 * A search with results or an empty search cancels the pending send.
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

  const update = (search: string, hasResults: boolean) => {
    clearTimeout(timer);
    pending = hasResults ? undefined : maskSearchQuery(search);
    if (pending !== undefined) timer = setTimeout(flush, NO_RESULT_DELAY_MS);
  };

  return { update, flush };
};
