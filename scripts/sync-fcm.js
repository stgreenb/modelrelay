#!/usr/bin/env node

import https from 'https';
import http from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const FCM_RAW_URL = 'https://raw.githubusercontent.com/vava-nessa/free-coding-models/main/sources.js';
const SOURCES_PATH = resolve(rootDir, 'sources.js');
const SCORES_PATH = resolve(rootDir, 'scores.js');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function validateSources(code) {
  const sourcesMatch = code.match(/export\s+const\s+sources\s*=\s*\{/);
  if (!sourcesMatch) {
    throw new Error('Invalid sources.js: missing "export const sources = {"');
  }
  return true;
}

async function downloadFcmSources() {
  console.log('Fetching FCM sources from:', FCM_RAW_URL);
  const code = await fetchUrl(FCM_RAW_URL);
  validateSources(code);
  console.log('✓ Downloaded and validated FCM sources');
  return code;
}

function extractScores(sourcesCode) {
  const scores = {};
  const modelPattern = /\['([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'/g;
  let match;
  while ((match = modelPattern.exec(sourcesCode)) !== null) {
    const modelId = match[1];
    const tier = match[3];
    const sweScore = match[4];
    scores[modelId] = { tier, sweScore, score: scoreStringToNumber(sweScore) };
  }
  return scores;
}

function scoreStringToNumber(scoreStr) {
  const num = parseFloat(scoreStr.replace('%', ''));
  return num / 100;
}

function generateScoresFile(scores) {
  let code = '/**\n * @file scores.js\n * @description Model tier/scores for routing.\n */\n\n';
  code += 'export const scores = {\n';
  const entries = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
  for (const [modelId, { tier, sweScore, score }] of entries) {
    code += `  "${modelId}": { tier: "${tier}", score: ${score.toFixed(2)} },\n`;
  }
  code += '};\n';
  return code;
}

const MRX_CUSTOM_PROVIDERS = `
  // MRX custom providers (not in FCM)
  g4f: {
    name: 'g4f Proxy',
    url: 'http://192.168.1.196:7980/v1/chat/completions',
    models: [
      ['kimi-k2-thinking', 'Kimi K2 Thinking', 'S+', '71.3%', '256k'],
      ['glm-4.7', 'GLM 4.7', 'S+', '73.8%', '200k'],
      ['kimi-k2.5', 'Kimi K2.5', 'S+', '76.8%', '128k'],
      ['deepseek-r1', 'DeepSeek R1', 'S', '61.0%', '128k'],
      ['gemini-2.0-flash', 'Gemini 2.0 Flash', 'A+', '50.0%', '1M'],
      ['qwen3-coder', 'Qwen3 Coder', 'S+', '70.6%', '256k'],
      ['glm-5', 'GLM 5', 'S+', '77.8%', '128k'],
      ['models/gemini-2.5-flash-lite', 'Gemini 2.5 Flash Lite', 'B+', '30.0%', '1M'],
      ['models/gemini-2.5-flash-lite-preview-09-2025', 'Gemini 2.5 Flash Lite Preview', 'B+', '30.0%', '1M'],
    ],
  },
  g4f_deepinfra: {
    name: 'g4f DeepInfra',
    url: 'https://g4f.deepinfra.com/v1/chat/completions',
    models: [
      ['kimi-k2-thinking', 'Kimi K2 Thinking', 'S+', '71.3%', '256k'],
      ['deepseek-v3', 'DeepSeek V3', 'S', '62.0%', '128k'],
      ['deepseek-r1', 'DeepSeek R1', 'S', '61.0%', '128k'],
      ['qwen3-coder-plus', 'Qwen3 Coder Plus', 'S+', '69.6%', '256k'],
      ['qwen3-32b', 'Qwen3 32B', 'A+', '50.0%', '128k'],
    ],
  },
`;

function addMrxProviders(code) {
  const searchStr = '  },\n}\n\n// 📖 Flatten all models from all sources';
  const idx = code.indexOf(searchStr);
  if (idx === -1) {
    console.warn('  Could not find insertion point');
    return code;
  }
  const insertAt = idx + '  },\n'.length;
  return code.slice(0, insertAt) + MRX_CUSTOM_PROVIDERS + code.slice(insertAt);
}

async function main() {
  console.log('=== MRX FCM Sync ===\n');
  
  console.log('Step 1: Downloading FCM sources...');
  const fcmCode = await downloadFcmSources();
  
  console.log('\nStep 2: Extracting scores...');
  const scores = extractScores(fcmCode);
  console.log(`  Found ${Object.keys(scores).length} models with scores`);
  
  console.log('\nStep 3: Writing scores.js...');
  const scoresCode = generateScoresFile(scores);
  writeFileSync(SCORES_PATH, scoresCode);
  console.log('  ✓ Written to', SCORES_PATH);
  
  console.log('\nStep 4: Adding MRX custom providers (g4f, g4f_deepinfra)...');
  let finalCode = addMrxProviders(fcmCode);
  console.log('  ✓ Added g4f provider');
  console.log('  ✓ Added g4f_deepinfra provider');
  
  console.log('\nStep 5: Writing sources.js...');
  writeFileSync(SOURCES_PATH, finalCode);
  console.log('  ✓ Written to', SOURCES_PATH);
  
  console.log('\n=== Sync complete! ===');
  console.log('\nProviders in sources.js:');
  const providerMatch = finalCode.match(/export\s+const\s+sources\s*=\s*\{([\s\S]*?)\n\}/);
  if (providerMatch) {
    const providers = providerMatch[1].match(/^\s{2}(\w+):/gm) || [];
    providers.forEach(p => console.log('  - ' + p.replace(/^\s{2}|:\s*$/g, '')));
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
