import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Usage:
//   node scripts/e2e-shards.ts plan --project <name> --shard <n> --total <n>
//     Prints the spec files of one shard, one per line, relative to the frontend folder.
//     A shard holds whole spec files. The shards are balanced by the time that
//     tests/e2e/durations.json records for each file.
//   node scripts/e2e-shards.ts record <report.json>...
//     Reads Playwright JSON reports and writes the time of each spec file to
//     tests/e2e/durations.json. scripts/update-e2e-durations.sh gets the reports from CI.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, '..');
const E2E_DIR = path.join(FRONTEND_DIR, 'tests/e2e');
const DURATIONS_FILE = path.join(E2E_DIR, 'durations.json');

// The same as `workers` on CI in playwright.config.ts.
const CI_WORKERS = 4;
// The time of a spec file that has no record yet, when the project has no records either.
const DEFAULT_SECONDS = 60;

/** Seconds for each spec file (relative to tests/e2e), for each Playwright project. */
export type Durations = Record<string, Record<string, number>>;

export type SpecFile = { file: string; seconds: number; serial: boolean };

/**
 * A shard runs its files on `workers` workers. A serial file runs on one worker from start to
 * end, so the shard takes at least as long as its longest serial file.
 */
export const estimateShardSeconds = (files: SpecFile[], workers: number): number => {
  const total = files.reduce((sum, file) => sum + file.seconds, 0);
  const longestSerial = Math.max(0, ...files.filter((f) => f.serial).map((f) => f.seconds));
  return Math.max(total / workers, longestSerial);
};

/**
 * Puts the longest file first into the shard with the lowest estimate after the file is added.
 * Each file goes into exactly one shard, and the result is the same for the same input.
 */
export const planShards = (files: SpecFile[], total: number, workers: number): string[][] => {
  const shards: SpecFile[][] = Array.from({ length: total }, () => []);
  const sorted = [...files].sort((a, b) => b.seconds - a.seconds || a.file.localeCompare(b.file));

  for (const file of sorted) {
    let best = 0;
    let bestEstimate = Infinity;
    let bestTotal = Infinity;
    shards.forEach((shard, index) => {
      const candidate = [...shard, file];
      const estimate = estimateShardSeconds(candidate, workers);
      const shardTotal = candidate.reduce((sum, f) => sum + f.seconds, 0);
      if (estimate < bestEstimate || (estimate === bestEstimate && shardTotal < bestTotal)) {
        best = index;
        bestEstimate = estimate;
        bestTotal = shardTotal;
      }
    });
    shards[best].push(file);
  }

  return shards.map((shard) => shard.map((f) => f.file).sort());
};

/** A file is serial when its tests share one worker, in order. */
export const isSerialSource = (source: string): boolean =>
  /\bdescribe\.serial\b|mode:\s*['"]serial['"]/.test(source);

const median = (values: number[]): number | undefined => {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/** Spec files with their recorded time. A file with no record gets the median of the project. */
export const withDurations = (
  files: { file: string; serial: boolean }[],
  recorded: Record<string, number> = {},
): SpecFile[] => {
  const fallback = median(Object.values(recorded)) ?? DEFAULT_SECONDS;
  return files.map((f) => ({ ...f, seconds: recorded[f.file] ?? fallback }));
};

type ReportResult = { duration: number; retry: number; startTime: string };
type ReportTest = { projectName: string; results: ReportResult[] };
type ReportSpec = { file: string; tests: ReportTest[] };
type ReportSuite = { file: string; specs?: ReportSpec[]; suites?: ReportSuite[] };
export type Report = { suites: ReportSuite[] };

/**
 * The time of each spec file in a Playwright JSON report. Only first attempts count, so a retry
 * does not change the record. A parallel file takes the sum of its tests. A serial file takes the
 * time from its first start to its last end, which also holds the hooks between the tests.
 */
export const durationsFromReport = (
  report: Report,
  isSerial: (file: string) => boolean,
): Durations => {
  const runs = new Map<string, { project: string; file: string; results: ReportResult[] }>();

  const visit = (suite: ReportSuite) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const first = test.results.find((result) => result.retry === 0);
        if (!first) continue;
        const key = `${test.projectName}\n${spec.file}`;
        const run = runs.get(key) ?? { project: test.projectName, file: spec.file, results: [] };
        run.results.push(first);
        runs.set(key, run);
      }
    }
    suite.suites?.forEach(visit);
  };
  report.suites.forEach(visit);

  const durations: Durations = {};
  for (const { project, file, results } of runs.values()) {
    let ms: number;
    if (isSerial(file)) {
      const starts = results.map((r) => Date.parse(r.startTime));
      const ends = results.map((r) => Date.parse(r.startTime) + r.duration);
      ms = Math.max(...ends) - Math.min(...starts);
    } else {
      ms = results.reduce((sum, r) => sum + r.duration, 0);
    }
    durations[project] ??= {};
    durations[project][file] = Math.round(ms / 1000);
  }
  return durations;
};

/** Adds the new records to the old ones. Projects and files that are not in `next` stay. */
export const mergeDurations = (previous: Durations, next: Durations): Durations => {
  const merged: Durations = {};
  for (const project of [...new Set([...Object.keys(previous), ...Object.keys(next)])].sort()) {
    const files = { ...previous[project], ...next[project] };
    merged[project] = Object.fromEntries(
      Object.entries(files).sort(([a], [b]) => a.localeCompare(b)),
    );
  }
  return merged;
};

const listSpecFiles = (): { file: string; serial: boolean }[] =>
  fs
    .readdirSync(E2E_DIR, { recursive: true, encoding: 'utf-8' })
    .filter((file) => file.endsWith('.spec.ts'))
    .sort()
    .map((file) => ({
      file,
      serial: isSerialSource(fs.readFileSync(path.join(E2E_DIR, file), 'utf-8')),
    }));

const readDurations = (): Durations =>
  fs.existsSync(DURATIONS_FILE) ? JSON.parse(fs.readFileSync(DURATIONS_FILE, 'utf-8')) : {};

const readOption = (args: string[], name: string): string => {
  const index = args.indexOf(`--${name}`);
  const value = index === -1 ? undefined : args[index + 1];
  if (!value) throw new Error(`Missing --${name}`);
  return value;
};

const plan = (args: string[]) => {
  const project = readOption(args, 'project');
  const shard = Number(readOption(args, 'shard'));
  const total = Number(readOption(args, 'total'));
  if (
    !Number.isInteger(total) ||
    total < 1 ||
    !Number.isInteger(shard) ||
    shard < 1 ||
    shard > total
  ) {
    throw new Error(`Invalid shard ${shard}/${total}`);
  }

  const files = withDurations(listSpecFiles(), readDurations()[project]);
  const shards = planShards(files, total, CI_WORKERS);
  for (const file of shards[shard - 1]) {
    console.log(path.posix.join('tests/e2e', file.split(path.sep).join('/')));
  }
};

const record = (reportFiles: string[]) => {
  if (reportFiles.length === 0) throw new Error('Pass one or more Playwright JSON reports.');

  const serial = new Map(listSpecFiles().map((f) => [f.file, f.serial]));
  let durations = readDurations();
  for (const reportFile of reportFiles) {
    const report: Report = JSON.parse(fs.readFileSync(reportFile, 'utf-8'));
    durations = mergeDurations(
      durations,
      durationsFromReport(report, (file) => serial.get(file) ?? false),
    );
  }
  fs.writeFileSync(DURATIONS_FILE, `${JSON.stringify(durations, null, 2)}\n`);
  console.log(`Updated ${path.relative(process.cwd(), DURATIONS_FILE)}`);
};

const main = () => {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'plan') plan(args);
  else if (command === 'record') record(args);
  else throw new Error('Usage: e2e-shards.ts plan|record ...');
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
