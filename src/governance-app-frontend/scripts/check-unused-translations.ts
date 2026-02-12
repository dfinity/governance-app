import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Usage:
// This script detects unused translation keys in the codebase.
// It parses the i18n config to find all translation files and their namespace mappings,
// extracts every leaf key, then checks if each key is referenced in source code.
//
// Detected patterns:
//   1. Selector syntax:    t(($) => $.namespace.key)
//   2. String literals:    'namespace.key' or "namespace.key"
//
// Exit code 0: all keys are in use.
// Exit code 1: unused keys found.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const I18N_DIR = path.resolve(__dirname, '../src/i18n');
const SRC_DIR = path.resolve(__dirname, '../src');
const CONFIG_FILE = path.join(I18N_DIR, 'config.ts');

/**
 * Parse the i18n config.ts to extract the mapping from variable names to JSON file paths.
 * e.g. `import common from './en/common.json'` → { common: '<abs>/en/common.json' }
 */
function parseConfigImports(): Map<string, string> {
  const configContent = fs.readFileSync(CONFIG_FILE, 'utf-8');
  const importRegex = /import\s+(\w+)\s+from\s+['"]\.\/(en\/[\w/]+\.json)['"]/g;
  const mapping = new Map<string, string>();

  let match;
  while ((match = importRegex.exec(configContent)) !== null) {
    mapping.set(match[1], path.join(I18N_DIR, match[2]));
  }

  return mapping;
}

/**
 * Recursively extract all leaf key paths from a nested JSON object.
 * e.g. { notFound: { title: "..." } } with prefix "common" → ["common.notFound.title"]
 */
function extractLeafKeys(obj: Record<string, unknown>, prefix: string): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = `${prefix}.${key}`;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...extractLeafKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Recursively collect all .ts and .tsx source files, skipping the i18n directory.
 */
function getSourceFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'i18n' || entry.name === 'node_modules') continue;
      files.push(...getSourceFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract all translation key references from the combined source content.
 *
 * Detects two patterns:
 *   1. Selector syntax: `$.namespace.key.path`  →  e.g. t(($) => $.common.loading)
 *   2. String literals: `'namespace.key.path'` or `"namespace.key.path"`
 *      →  e.g. label: 'common.dashboard' (resolved dynamically via t())
 *
 * String literal detection is limited to keys that start with a known namespace
 * to avoid false positives from unrelated strings.
 */
function collectTranslationReferences(
  sourceContents: string,
  namespaces: Set<string>,
): Set<string> {
  const references = new Set<string>();

  // Pattern 1: selector syntax — $.namespace.key.path
  const selectorRegex = /\$\.[\w.]+/g;
  let match;
  while ((match = selectorRegex.exec(sourceContents)) !== null) {
    references.add(match[0].substring(2));
  }

  // Pattern 2: string literals — 'namespace.key.path' or "namespace.key.path"
  const stringLiteralRegex = /['"](\w+(?:\.\w+)+)['"]/g;
  while ((match = stringLiteralRegex.exec(sourceContents)) !== null) {
    const key = match[1];
    const prefix = key.split('.')[0];
    if (namespaces.has(prefix)) {
      references.add(key);
    }
  }

  return references;
}

/**
 * Check if a key (or any of its parent paths) is present in the references set.
 * This handles the case where an entire object subtree is accessed via returnObjects,
 * e.g. `t(($) => $.common.notFound)` makes all keys under `common.notFound.*` used.
 */
function isKeyUsed(fullKey: string, references: Set<string>): boolean {
  if (references.has(fullKey)) return true;

  const parts = fullKey.split('.');
  for (let i = 1; i < parts.length; i++) {
    if (references.has(parts.slice(0, i).join('.'))) return true;
  }

  return false;
}

function getLeafValue(json: Record<string, unknown>, keyParts: string[]): string {
  let value: unknown = json;
  for (const part of keyParts.slice(1)) {
    value = (value as Record<string, unknown>)?.[part];
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function main() {
  console.log('Checking for unused translations...\n');

  const importMapping = parseConfigImports();

  if (importMapping.size === 0) {
    console.error('No translation imports found in config.ts. Is the file format correct?');
    process.exit(1);
  }

  const namespaces = new Set(importMapping.keys());
  const sourceFiles = getSourceFiles(SRC_DIR);
  const sourceContents = sourceFiles.map((f) => fs.readFileSync(f, 'utf-8')).join('\n');
  const references = collectTranslationReferences(sourceContents, namespaces);

  const unusedKeys: { namespace: string; key: string; value: string }[] = [];

  for (const [variableName, filePath] of importMapping) {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const leafKeys = extractLeafKeys(json, variableName);

    for (const fullKey of leafKeys) {
      if (!isKeyUsed(fullKey, references)) {
        unusedKeys.push({
          namespace: variableName,
          key: fullKey,
          value: getLeafValue(json, fullKey.split('.')),
        });
      }
    }
  }

  if (unusedKeys.length === 0) {
    console.log('All translation keys are in use.');
    process.exit(0);
  }

  console.error(`Found ${unusedKeys.length} unused translation key(s):\n`);

  // Group by namespace for readability
  const grouped = new Map<string, typeof unusedKeys>();
  for (const item of unusedKeys) {
    const group = grouped.get(item.namespace) ?? [];
    group.push(item);
    grouped.set(item.namespace, group);
  }

  for (const [namespace, keys] of grouped) {
    console.error(`  ${namespace}:`);
    for (const { key, value } of keys) {
      const displayValue = value.length > 60 ? value.substring(0, 60) + '...' : value;
      console.error(`    - ${key} = "${displayValue}"`);
    }
    console.error('');
  }

  console.error('Remove unused translations.');
  process.exit(1);
}

main();
