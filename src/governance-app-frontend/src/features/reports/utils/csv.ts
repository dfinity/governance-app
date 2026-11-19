import { E8S_PRECISION } from '@constants/extra';

export type CsvColumn<Row> = {
  header: string;
  value: (row: Row) => string;
};

const escapeCell = (cell: string): string =>
  /[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;

/** Lines end with CRLF, as RFC 4180 says. The byte order mark makes Excel read UTF-8. */
export const buildCsv = <Row>(columns: CsvColumn<Row>[], rows: Row[]): string => {
  const lines = [
    columns.map(({ header }) => escapeCell(header)),
    ...rows.map((row) => columns.map(({ value }) => escapeCell(value(row)))),
  ];

  return `\uFEFF${lines.map((cells) => cells.join(',')).join('\r\n')}\r\n`;
};

/**
 * A fixed-point number with all its decimals and no group separators, so that spreadsheets read
 * it as a number. For example, `150n` with 2 decimals gives `1.50`.
 */
const formatFixedForCsv = (
  value: bigint,
  decimals: number,
  { signed = false }: { signed?: boolean },
): string => {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const unit = 10n ** BigInt(decimals);
  const fraction = (abs % unit).toString().padStart(decimals, '0');
  const sign = negative ? '-' : signed && abs > 0n ? '+' : '';

  return `${sign}${abs / unit}.${fraction}`;
};

/** An amount in ICP with all 8 decimals. For example, `150_000_000n` gives `1.50000000`. */
export const formatE8sForCsv = (e8s: bigint, { signed = false } = {}): string =>
  formatFixedForCsv(e8s, E8S_PRECISION, { signed });

/** A fiat value with 2 decimals. For example, `396n` gives `3.96`. */
export const formatHundredthsForCsv = (hundredths: bigint, { signed = false } = {}): string =>
  formatFixedForCsv(hundredths, 2, { signed });

/** A UTC date and time, for example `2026-11-12 14:03:22`. */
export const formatUtcDateTime = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

/** A UTC date, for example `2026-11-12`. */
export const formatUtcDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/**
 * Keeps a long number as text in Excel. Without it, Excel shows a neuron ID in scientific
 * notation and drops its last digits. The NNS dapp uses the same form.
 */
export const asSpreadsheetText = (value: string): string => `="${value}"`;

/**
 * Keeps user text from running as a formula in a spreadsheet: a leading `=`, `+`, `-`, `@`, tab,
 * or carriage return gets a `'` prefix, as OWASP advises against CSV injection.
 */
export const asSafeSpreadsheetText = (value: string): string =>
  /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

export const downloadCsv = ({ fileName, content }: { fileName: string; content: string }) => {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Safari and Firefox start the download after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
};
