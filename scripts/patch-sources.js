#!/usr/bin/env node
/**
 * Injects the score-overrides hook into an upstream modelrelay sources.js.
 *
 * Usage: node scripts/patch-sources.js <path-to-sources.js>
 *
 * This is the ONLY modification we ever make to upstream code. It:
 *   1. Verifies the expected getScore() signature is present (fails loudly if not)
 *   2. Adds `import { getScoreOverride } from './lib/score-overrides.js'`
 *   3. Injects an override-first check at the top of getScore()
 *   4. Is idempotent — no-op (exit 0) if the hook is already present
 *
 * Exit codes:
 *   0  success (or already patched)
 *   1  getScore() shape mismatch or missing expected anchors
 *   2  file read/write error
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const IMPORT_ANCHOR = "import { scores } from './scores.js'";
const IMPORT_LINE = "import { getScoreOverride } from './lib/score-overrides.js'";

const SCORE_FN_START = /^export function getScore\(\s*(\w+)\s*\)\s*\{/m;
const SCORE_FN_RETURN = /return\s+scores\s*\[\s*base\s*\]\s*\?\?\s*scores\s*\[\s*unprefixed\s*\]\s*\?\?\s*null\s*;/;

const OVERRIDE_BLOCK = (paramName) => [
  `  const override = getScoreOverride(${paramName});`,
  `  if (override !== null) {`,
  `    return override;`,
  `  }`,
  '',
].join('\n');

const HOOK_PRESENT = /const\s+override\s*=\s*getScoreOverride\(/;

function fail(message) {
  console.error(`[patch-sources] ERROR: ${message}`);
  console.error('[patch-sources] This may mean upstream changed the shape of sources.js.');
  console.error('[patch-sources] Update scripts/patch-sources.js to match the new shape.');
  process.exit(1);
}

function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('[patch-sources] Usage: node scripts/patch-sources.js <path-to-sources.js>');
    process.exit(2);
  }

  if (!existsSync(target)) {
    fail(`file not found: ${target}`);
  }

  let source;
  try {
    source = readFileSync(target, 'utf-8');
  } catch (e) {
    console.error(`[patch-sources] ERROR reading ${target}: ${e.message}`);
    process.exit(2);
  }

  if (HOOK_PRESENT.test(source)) {
    console.log('[patch-sources] Hook already present, skipping (idempotent no-op).');
    process.exit(0);
  }

  if (!source.includes(IMPORT_ANCHOR)) {
    fail(`expected import anchor not found: ${IMPORT_ANCHOR}`);
  }

  const fnMatch = source.match(SCORE_FN_START);
  if (!fnMatch) {
    fail('getScore() declaration not found in expected shape: `export function getScore(modelId) {`');
  }

  const fnStartIndex = fnMatch.index;
  const bodyStartIndex = fnStartIndex + fnMatch[0].length;
  const bodyEndIndex = source.indexOf('\n}', bodyStartIndex);
  if (bodyEndIndex === -1) {
    fail('getScore() body not found (no closing brace).');
  }

  const body = source.slice(bodyStartIndex, bodyEndIndex);
  if (!SCORE_FN_RETURN.test(body)) {
    fail('getScore() body does not match expected shape (expected `return scores[base] ?? scores[unprefixed] ?? null;`).');
  }

  const paramName = fnMatch[1];

  const importIndex = source.indexOf(IMPORT_ANCHOR);
  const importEndIndex = importIndex + IMPORT_ANCHOR.length;

  const overrideBlock = '\n' + OVERRIDE_BLOCK(paramName);

  const patched =
    source.slice(0, importEndIndex)
    + '\n' + IMPORT_LINE
    + source.slice(importEndIndex, bodyStartIndex)
    + overrideBlock
    + source.slice(bodyStartIndex);

  try {
    writeFileSync(target, patched, 'utf-8');
  } catch (e) {
    console.error(`[patch-sources] ERROR writing ${target}: ${e.message}`);
    process.exit(2);
  }

  console.log('[patch-sources] Injected score-overrides hook into getScore().');
}

main();
