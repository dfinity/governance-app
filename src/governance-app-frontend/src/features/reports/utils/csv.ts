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
 * An amount in ICP with all 8 decimals and no group separators, so that spreadsheets read it as
 * a number. For example, `150_000_000n` gives `1.50000000`.
 */
export const formatE8sForCsv = (e8s: bigint, { signed = false } = {}): string => {
  const negative = e8s < 0n;
  const abs = negative ? -e8s : e8s;
  const unit = 10n ** BigInt(E8S_PRECISION);
  const fraction = (abs % unit).toString().padStart(E8S_PRECISION, '0');
  const sign = negative ? '-' : signed && abs > 0n ? '+' : '';

  return `${sign}${abs / unit}.${fraction}`;
};

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

export const downloadCsv = ({ fileName, content }: { fileName: string; content: string }) => {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Safari and Firefox start the download after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
};
