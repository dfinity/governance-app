/**
 * Shortens an ID string by keeping a specified number of characters
 * from the start and end, joined by an ellipsis.
 *
 * @param id - The string to shorten.
 * @param length - Number of characters to keep from each end.
 * @returns The shortened string with "..." in the middle, or the original if it's short enough.
 */
export const shortenId = (id: string, length: number): string => {
  const separator = '...';

  if (id.length <= length * 2 + separator.length) return id;

  return `${id.slice(0, length)}${separator}${id.slice(-length)}`;
};
