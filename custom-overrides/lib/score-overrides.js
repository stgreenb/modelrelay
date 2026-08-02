import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';

const CONFIG_FILE_PATH = '/app/config/score-overrides.json';
const ENV_VAR_NAME = 'MODELRELAY_SCORE_OVERRIDES';

let overrideMap = new Map();
let initialized = false;

function parseScoreOverrides() {
  if (initialized) {
    return overrideMap;
  }

  overrideMap = new Map();
  initialized = true;

  const configFileExists = existsSync(CONFIG_FILE_PATH);

  if (configFileExists) {
    try {
      const content = readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      populateOverrideMap(parsed);
      logOverrideState('config file');
      return overrideMap;
    } catch (e) {
      console.warn('[score-overrides] Invalid JSON in config file, using empty overrides');
      logOverrideState('config file');
      return overrideMap;
    }
  }

  const envValue = process.env[ENV_VAR_NAME];
  if (envValue) {
    try {
      const parsed = JSON.parse(envValue);
      populateOverrideMap(parsed);
    } catch (e) {
      console.warn('[score-overrides] Invalid JSON in MODELRELAY_SCORE_OVERRIDES env var, using empty overrides');
    }
  }

  logOverrideState('env var');
  return overrideMap;
}

function logOverrideState(source) {
  console.log(`[score-overrides] Hook active, ${overrideMap.size} override(s) from ${source}`);
}

function populateOverrideMap(obj) {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  for (const [modelId, score] of Object.entries(obj)) {
    const numScore = Number(score);
    if (!isNaN(numScore) && numScore >= 0 && numScore <= 1) {
      overrideMap.set(modelId, numScore);
    }
  }
}

function getScoreOverride(modelId) {
  if (!initialized) {
    parseScoreOverrides();
  }
  return overrideMap.get(modelId) ?? null;
}

export { parseScoreOverrides, getScoreOverride };