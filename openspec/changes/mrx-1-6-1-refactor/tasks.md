# MRX 1.6.1 Refactor Implementation Tasks (Revised for 1.9.0)

## Phase 1: Prepare Base Structure (Minimal - Already Done in 1.9.0)
- [x] 1.9.0 already uses buildModels() function
- [x] 1.9.0 already uses scores.js
- [x] 1.9.0 already has canonicalizeModelId() and getScore() helpers

## Phase 2: Add MRX Custom Providers
- [x] Add g4f provider to sources.js
  - URL: http://192.168.1.196:7980/v1/chat/completions
  - Models: kimi-k2-thinking, glm-4.7, kimi-k2.5, deepseek-r1, gemini-2.0-flash, qwen3-coder, glm-5, models/gemini-2.5-flash-lite, models/gemini-2.5-flash-lite-preview-09-2025
- [x] Add iflow provider to sources.js
  - URL: https://apis.iflow.cn/v1/chat/completions
  - Models: iflow-rome-30ba3b, qwen3-coder-plus, qwen3-max, qwen3-vl-plus, kimi-k2-0905, qwen3-max-preview, glm-4.6, kimi-k2, deepseek-v3.2, deepseek-r1, deepseek-v3, qwen3-32b, qwen3-235b-a22b-thinking-2507, qwen3-235b-a22b-instruct, qwen3-235b

## Phase 3: Add MRX Custom Scores
- [x] Add g4f model scores to scores.js
- [x] Add iflow model scores to scores.js

## Phase 4: Use Built-in minSweScore Filtering
- [x] Already available in 1.9.0 via config
- [x] Document how to use: `POST /api/filter-rules` with `{ "minSweScore": 0.5 }`
- [x] Document Web UI: Settings > Filter Rules

## Phase 5: Latency Handling (Enhanced)
- [x] **Existing latency tie-breaker**: The 1.9.0 QoS already has a latency tie-breaker (max 1000ms = +1 point)
- [x] **Existing maxPingMs**: Already implemented in MRX - excludes from routing (not pinging) if latency > threshold
  - Configured via `filters.maxPingMs` (default: 1200ms)
  - Works via `isModelEligibleForRouting()` in lib/utils.js

## Phase 6: PM2 Integration (NEW)
- [x] Create ecosystem.config.js
- [x] Add PM2 commands to README or docs
- [x] Test `pm2 start ecosystem.config.js`

## Phase 7: Testing & Validation
- [x] Verify g4f proxy models in API (9 models found)
- [x] Verify iflow provider models in API (15 models found)
- [x] Test minSweScore filtering works (built into 1.9.0)
- [x] Test maxPingMs filtering works (MRX custom)
- [x] Test PM2 startup works
- [x] Test chat endpoint works
- [x] Update README with filter documentation

## Key Models to Verify
- `models/gemini-2.5-flash-lite` (SWE: 0.65, Context: 1M)
- `models/gemini-2.5-flash-lite-preview-09-2025` (SWE: 0.65, Context: 1M)
- All existing g4f models (kimi-k2-thinking, glm-4.7, kimi-k2.5, deepseek-r1, etc.)
- All iflow models

## Feature Comparison

| Feature | 1.5 (Original) | 1.9.0 (New) | MRX Action |
|---------|-----------------|--------------|------------|
| buildModels() | ❌ | ✅ | Use as-is |
| scores.js | ❌ | ✅ | Use as-is + add MRX scores |
| minSweScore | ❌ (MRX added) | ✅ (built-in) | Use config option |
| Latency tie-breaker | ❌ | ✅ (small) | May enhance if needed |
| Latency threshold | ❌ | ❌ | Implement new |
| g4f provider | ✅ | ❌ | Add to sources.js |
| iflow provider | ✅ | ❌ | Add to sources.js |
| PM2 | ❌ | ❌ | Create ecosystem.config.js |
