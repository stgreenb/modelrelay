#!/usr/bin/env node
import { parseScoreOverrides, getScoreOverride } from './custom-overrides/lib/score-overrides.js';
import { readFileSync } from 'node:fs';

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    tests.push({ name, status: 'pass' });
    passed++;
  } catch (e) {
    tests.push({ name, status: 'fail', error: e.message });
    failed++;
  }
}

console.log('Running score-overrides tests...\n');

test('parseScoreOverrides returns a Map', () => {
  const result = parseScoreOverrides();
  if (!(result instanceof Map)) {
    throw new Error('Expected Map');
  }
});

test('getScoreOverride returns null for unknown model', () => {
  const result = getScoreOverride('unknown-model');
  if (result !== null) {
    throw new Error('Expected null');
  }
});

test('Score values validated (0.0 to 1.0 range)', () => {
  const originalEnv = process.env.MODELRELAY_SCORE_OVERRIDES;
  process.env.MODELRELAY_SCORE_OVERRIDES = '{"test-valid": 0.85, "test-invalid": 1.5, "test-negative": -0.1}';
  
  const result = parseScoreOverrides();
  
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

test('Invalid JSON handled gracefully', () => {
  const originalEnv = process.env.MODELRELAY_SCORE_OVERRIDES;
  process.env.MODELRELAY_SCORE_OVERRIDES = 'not-valid-json';
  
  const result = parseScoreOverrides();
  
  if (result.size !== 0) {
    throw new Error('Invalid JSON should result in empty map');
  }
  
  if (originalEnv) {
    process.env.MODELRELAY_SCORE_OVERRIDES = originalEnv;
  } else {
    delete process.env.MODELRELAY_SCORE_OVERRIDES;
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