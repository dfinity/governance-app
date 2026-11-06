import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

// Usage:
// This script checks the JavaScript that the browser must load before the app can render.
// Run it after `npm run build`. It reads `dist/index.html`, takes the entry script and the
// modulepreload links, and sums the gzip size of these files.
// It prints a Markdown report, which CI adds to the build stats comment.
//
// Exit code 0: the startup JS is in the budget.
// Exit code 1: the startup JS is above the budget, or it holds an on-demand chunk.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist');

// About 3% above the current size. Raise it only for code that must load at startup.
const BUDGET_BYTES = 480_000;

// These chunks load on demand. They must never be in the startup list.
const ON_DEMAND_CHUNKS = ['vendor-ledger'];

const formatBytes = (bytes: number): string => bytes.toLocaleString('en-US');

function readStartupFiles(): string[] {
  const html = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
  const tags = html.match(/<(?:script|link)\b[^>]*>/g) ?? [];

  const files = tags
    .filter((tag) => /type="module"/.test(tag) || /rel="modulepreload"/.test(tag))
    .map((tag) => tag.match(/\b(?:src|href)="\/?([^"]+\.js)"/)?.[1])
    .filter((file) => file !== undefined);

  if (files.length === 0) throw new Error('dist/index.html has no startup JS files.');

  return files;
}

function main() {
  const files = readStartupFiles()
    .map((name) => ({
      name,
      gzipBytes: gzipSync(fs.readFileSync(path.join(DIST_DIR, name))).length,
    }))
    .sort((a, b) => b.gzipBytes - a.gzipBytes);

  const totalBytes = files.reduce((sum, { gzipBytes }) => sum + gzipBytes, 0);
  const onDemandFiles = files
    .map(({ name }) => name)
    .filter((name) => ON_DEMAND_CHUNKS.some((chunk) => path.basename(name).startsWith(chunk)));
  const isAboveBudget = totalBytes > BUDGET_BYTES;

  const size = `${formatBytes(totalBytes)} bytes gzip. The budget is ${formatBytes(BUDGET_BYTES)}.`;

  console.log('### 🚦 Startup JS budget\n');
  console.log(`${isAboveBudget ? '❌' : '✅'} The startup JS is ${size}\n`);
  for (const name of onDemandFiles) {
    console.log(`❌ \`${name}\` is in the startup list. It must load on demand.\n`);
  }
  console.log(`<details><summary>${files.length} startup files</summary>\n`);
  console.log('| File | Gzip bytes |\n| --- | ---: |');
  for (const { name, gzipBytes } of files) {
    console.log(`| \`${name}\` | ${formatBytes(gzipBytes)} |`);
  }
  console.log('\n</details>');

  if (isAboveBudget || onDemandFiles.length > 0) process.exit(1);
}

main();
