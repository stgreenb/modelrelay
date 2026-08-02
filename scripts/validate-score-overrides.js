#!/usr/bin/env node
/**
 * Validates score-overrides.json against static upstream data.
 *
 * Usage: node scripts/validate-score-overrides.js <path-to-sources.js> <path-to-scores.js> [path-to-score-overrides.json]
 *
 * Fails (exit 1) if any override entry is already covered by upstream
 * scores.js or the hardcoded alias map — those overrides would be silent
 * no-ops (either live catalog wins, or scores.js already provides a value).
 *
 * Scope is STATIC-ONLY: it checks scores.js + the alias map. It does NOT
 * emulate the runtime live-catalog lookup, so CI stays deterministic with
 * no network calls.
 *
 * Exit codes:
 *   0  all override entries are genuinely missing upstream (or file is {})
 *   1  at least one override entry is covered upstream
 *   2  usage or read error
 */

import { readFileSync } from 'node:fs';

const DEFAULT_OVERRIDES = 'score-overrides.json';

function parseScores(scoresJsPath) {
  const raw = readFileSync(scoresJsPath, 'utf-8');
  const scores = {};
  for (const m of raw.matchAll(/["']([^"']+)["']\s*:\s*([0-9.]+)/g)) {
    scores[m[1].toLowerCase()] = Number(m[2]);
  }
  return scores;
}

function parseAliasMap(sourcesJsPath) {
  const raw = readFileSync(sourcesJsPath, 'utf-8');
  const aliases = {};
  for (const m of raw.matchAll(/['"]\s*([A-Za-z0-9_./:~-]+)\s*['"]\s*:\s*['"]\s*([A-Za-z0-9_./:~-]+)\s*['"]/g)) {
    aliases[m[1].toLowerCase()] = m[2].toLowerCase();
  }
  return aliases;
}

function resolveKey(modelId, aliases) {
  let key = String(modelId).trim().toLowerCase();
  const seen = new Set();
  while (aliases[key] && !seen.has(key)) {
    seen.add(key);
    key = aliases[key];
  }
  return key;
}

function covered(modelId, aliases, scores) {
  const resolved = resolveKey(modelId, aliases);
  const base = resolved.replace(/(?::(?:free|optimized|cloud))+$/i, '');
  const unprefixed = base.includes('/') ? base.split('/').pop() : base;
  return scores[base] != null || scores[unprefixed] != null;
}

function main() {
  const [sourcesJs, scoresJs, overridesJson] = process.argv.slice(2);
  if (!sourcesJs || !scoresJs) {
    console.error('[validate-score-overrides] Usage: node scripts/validate-score-overrides.js <sources.js> <scores.js> [score-overrides.json]');
    process.exit(2);
  }

  const overridesPath = overridesJson || DEFAULT_OVERRIDES;

  let overrides;
  try {
    overrides = JSON.parse(readFileSync(overridesPath, 'utf-8'));
  } catch (e) {
    console.error(`[validate-score-overrides] ERROR reading ${overridesPath}: ${e.message}`);
    process.exit(2);
  }

  const aliases = parseAliasMap(sourcesJs);
  const scores = parseScores(scoresJs);

  const coveredEntries = [];
  for (const [modelId] of Object.entries(overrides)) {
    if (covered(modelId, aliases, scores)) {
      coveredEntries.push(modelId);
    }
  }

  if (coveredEntries.length > 0) {
    console.error('[validate-score-overrides] ERROR: these override entries are covered upstream and would be ignored:');
    for (const id of coveredEntries) {
      console.error(`  - ${id}`);
    }
    console.error('[validate-score-overrides] Remove them from score-overrides.json (or update this validator if coverage changed).');
    process.exit(1);
  }

  console.log(`[validate-score-overrides] OK: all ${Object.keys(overrides).length} override entries are missing upstream.`);
}

main();
