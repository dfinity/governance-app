import { jsonReplacer } from '@dfinity/utils';

export const stringifyAll = (data: unknown) => JSON.stringify(data, jsonReplacer);
