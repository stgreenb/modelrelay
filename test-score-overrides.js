#!/usr/bin/env node
import { parseScoreOverrides, getScoreOverride } from './custom-overrides/lib/score-overrides.js';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tests = [];
let passed = 0;
let failed = 0;

// The module is a singleton (caches overrides on first parse). To test
// different env/config inputs deterministically, load fresh module instances
// via dynamic import with a unique query string.
let instanceCounter = 0;
function freshInstance() {
  return import(`./custom-overrides/lib/score-overrides.js?t=${instanceCounter++}`);
}

async function test(name, fn) {
  try {
    await fn();
    tests.push({ name, status: 'pass' });
    passed++;
  } catch (e) {
    tests.push({ name, status: 'fail', error: e.message });
    failed++;
  }
}

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'score-overrides-test-'));
}

// A minimal upstream-1.19-shaped sources.js fixture.
const FIXTURE_SOURCES = `/**
 * @file sources.js
 * @description Model sources for AI availability checker.
 */

import { scores } from './scores.js'

export const MODEL_ID_ALIASES = {
  'glm-4.7': 'z-ai/glm4.7',
}

export function getScore(modelId) {
  const { base, unprefixed } = canonicalizeModelId(modelId);
  // Try exact match first (e.g. google/gemma-3-4b-it), then fallback to unprefixed (e.g. gemma-3-4b-it)
  return scores[base] ?? scores[unprefixed] ?? null;
}
`;

// Vendored from upstream modelrelay 1.19.0 lib/model-quality.js — mirrors the
// runtime precedence: live catalog wins, then localScore, then default 0.45.
// Update if upstream changes the function's contract.
const DEFAULT_MODEL_QUALITY = 0.45;
function resolveModelQuality(qualityData, modelId, localScore = null) {
  for (const key of qualityLookupKeys(modelId)) {
    const match = qualityData?.index?.get(key);
    if (match) return match;
  }
  const normalized = Number(localScore);
  if (Number.isFinite(normalized) && normalized > 0) {
    return { score: normalized > 1 ? normalized / 100 : normalized, source: 'local-fallback', isEstimated: true, detail: 'scores.js offline fallback' };
  }
  return { score: DEFAULT_MODEL_QUALITY, source: 'default-fallback', isEstimated: true, detail: 'no catalog or local score' };
}
// Vendored from upstream 1.19 qualityLookupKeys (sources.js aliases).
function qualityLookupKeys(modelId) {
  const resolved = String(modelId || '').trim().toLowerCase();
  if (!resolved) return [];
  const base = resolved.replace(/(?::(?:free|optimized|cloud))+$/i, '');
  const unprefixed = base.includes('/') ? base.split('/').pop() : base;
  return [...new Set([
    base,
    unprefixed,
    base.replace(/:/g, '-'),
    unprefixed.replace(/:/g, '-'),
  ].filter(Boolean))];
}

function runPatch(sourcesPath) {
  return execFileSync('node', ['scripts/patch-sources.js', sourcesPath], { encoding: 'utf-8' });
}

function runPatchExpectFail(sourcesPath) {
  try {
    execFileSync('node', ['scripts/patch-sources.js', sourcesPath], { encoding: 'utf-8', stdio: 'pipe' });
  } catch (e) {
    if (e.status === undefined) throw e;
    return e;
  }
  throw new Error('patch-sources.js unexpectedly exited 0');
}

console.log('Running score-overrides tests...\n');

await test('parseScoreOverrides returns a Map', async () => {
  const { parseScoreOverrides: parse } = await freshInstance();
  const result = parse();
  if (!(result instanceof Map)) {
    throw new Error('Expected Map');
  }
});

await test('getScoreOverride returns null for unknown model', async () => {
  const { getScoreOverride: get } = await freshInstance();
  const result = get('unknown-model');
  if (result !== null) {
    throw new Error('Expected null');
  }
});

await test('Score values validated (0.0 to 1.0 range)', async () => {
  const originalEnv = process.env.MODELRELAY_SCORE_OVERRIDES;
  process.env.MODELRELAY_SCORE_OVERRIDES = '{"test-valid": 0.85, "test-invalid": 1.5, "test-negative": -0.1}';

  const { parseScoreOverrides: parse } = await freshInstance();
  const result = parse();

  if (result.get('test-valid') !== 0.85) {
    throw new Error('Valid score should be 0.85');
  }
  if (result.has('test-invalid')) {
    throw new Error('Invalid score > 1 should be ignored');
  }
  if (result.has('test-negative')) {
    throw new Error('Negative score should be ignored');
  }

  if (originalEnv) {
    process.env.MODELRELAY_SCORE_OVERRIDES = originalEnv;
  } else {
    delete process.env.MODELRELAY_SCORE_OVERRIDES;
  }
});

await test('Invalid JSON handled gracefully', async () => {
  const originalEnv = process.env.MODELRELAY_SCORE_OVERRIDES;
  process.env.MODELRELAY_SCORE_OVERRIDES = 'not-valid-json';

  const { parseScoreOverrides: parse } = await freshInstance();
  const result = parse();

  if (result.size !== 0) {
    throw new Error('Invalid JSON should result in empty map');
  }

  if (originalEnv) {
    process.env.MODELRELAY_SCORE_OVERRIDES = originalEnv;
  } else {
    delete process.env.MODELRELAY_SCORE_OVERRIDES;
  }
});

await test('Empty {} override config parses cleanly (no throw, empty Map)', async () => {
  const originalEnv = process.env.MODELRELAY_SCORE_OVERRIDES;
  process.env.MODELRELAY_SCORE_OVERRIDES = '{}';

  const { parseScoreOverrides: parse } = await freshInstance();
  const result = parse();

  if (!(result instanceof Map) || result.size !== 0) {
    throw new Error('Expected empty Map for {} config');
  }

  if (originalEnv) {
    process.env.MODELRELAY_SCORE_OVERRIDES = originalEnv;
  } else {
    delete process.env.MODELRELAY_SCORE_OVERRIDES;
  }
});

await test('Whitespace-only env value parses cleanly (empty Map)', async () => {
  const originalEnv = process.env.MODELRELAY_SCORE_OVERRIDES;
  process.env.MODELRELAY_SCORE_OVERRIDES = '   \n  ';

  const { parseScoreOverrides: parse } = await freshInstance();
  const result = parse();

  if (!(result instanceof Map) || result.size !== 0) {
    throw new Error('Expected empty Map for whitespace-only value');
  }

  if (originalEnv) {
    process.env.MODELRELAY_SCORE_OVERRIDES = originalEnv;
  } else {
    delete process.env.MODELRELAY_SCORE_OVERRIDES;
  }
});

await test('patch-sources.js injects hook into upstream-shaped getScore()', async () => {
  const dir = tempDir();
  try {
    const srcPath = join(dir, 'sources.js');
    writeFileSync(srcPath, FIXTURE_SOURCES, 'utf-8');

    const output = runPatch(srcPath);
    const patched = readFileSync(srcPath, 'utf-8');

    if (!output.includes('Injected score-overrides hook')) {
      throw new Error('Expected success message');
    }
    if (!patched.includes("import { getScoreOverride } from './lib/score-overrides.js'")) {
      throw new Error('Import line not injected');
    }
    if (!patched.includes('const override = getScoreOverride(modelId);')) {
      throw new Error('Override-first check not injected');
    }
    const match = patched.match(/^export function getScore\((\w+)\) \{([\s\S]*?)^\}/m);
    if (!match) throw new Error('getScore() not found in patched output');
    if (!match[2].includes('return override;')) {
      throw new Error('getScore() does not return override first');
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('patch-sources.js is idempotent (no-op on second run)', async () => {
  const dir = tempDir();
  try {
    const srcPath = join(dir, 'sources.js');
    writeFileSync(srcPath, FIXTURE_SOURCES, 'utf-8');

    runPatch(srcPath);
    const afterFirst = readFileSync(srcPath, 'utf-8');
    const output = runPatch(srcPath);
    const afterSecond = readFileSync(srcPath, 'utf-8');

    if (!output.includes('already present')) {
      throw new Error('Expected idempotent no-op message');
    }
    if (afterFirst !== afterSecond) {
      throw new Error('Second run modified the file');
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('patch-sources.js fails loudly when getScore() signature changes', async () => {
  const dir = tempDir();
  try {
    const srcPath = join(dir, 'sources.js');
    writeFileSync(srcPath, `import { scores } from './scores.js'\n\nexport function getScore(modelId, extra) {\n  return scores[base] ?? scores[unprefixed] ?? null;\n}\n`, 'utf-8');

    const err = runPatchExpectFail(srcPath);
    if (err.status !== 1) {
      throw new Error(`Expected exit 1, got ${err.status}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('patch-sources.js fails loudly when getScore() body changes', async () => {
  const dir = tempDir();
  try {
    const srcPath = join(dir, 'sources.js');
    writeFileSync(srcPath, `import { scores } from './scores.js'\n\nexport function getScore(modelId) {\n  return 0;\n}\n`, 'utf-8');

    const err = runPatchExpectFail(srcPath);
    if (err.status !== 1) {
      throw new Error(`Expected exit 1, got ${err.status}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('resolveModelQuality: override ignored when live catalog has a match', async () => {
  const index = new Map([['step-3.7-flash', { score: 0.396, source: 'artificial-analysis' }]]);
  const result = resolveModelQuality({ index }, 'stepfun/step-3.7-flash:free', 0.77);
  if (result.score !== 0.396 || result.source !== 'artificial-analysis') {
    throw new Error(`Expected catalog score, got ${JSON.stringify(result)}`);
  }
});

await test('resolveModelQuality: override used when catalog has no match', async () => {
  const index = new Map();
  const result = resolveModelQuality({ index }, 'custom/ollama-model', 0.68);
  if (result.score !== 0.68 || result.source !== 'local-fallback') {
    throw new Error(`Expected local-fallback override, got ${JSON.stringify(result)}`);
  }
});

await test('resolveModelQuality: default 0.45 when no catalog and no override', async () => {
  const index = new Map();
  const result = resolveModelQuality({ index }, 'brand-new-model', null);
  if (result.score !== 0.45 || result.source !== 'default-fallback') {
    throw new Error(`Expected default 0.45, got ${JSON.stringify(result)}`);
  }
});

console.log('Test Results:');
console.log('=============');
for (const t of tests) {
  const icon = t.status === 'pass' ? '✓' : '✗';
  console.log(`${icon} ${t.name}`);
  if (t.error) {
    console.log(`  Error: ${t.error}`);
  }
}
console.log(`\n${passed} passed, ${failed} failed`);

process.exit(failed > 0 ? 1 : 0);
