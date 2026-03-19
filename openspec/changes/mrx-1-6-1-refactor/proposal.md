# MRX 1.6.1 Refactor Proposal (Revised for 1.9.0)

## What
Refactor the MRX modelrelay fork to adopt the official 1.9.0 architecture while preserving custom functionality including:
- Custom g4f proxy provider with Gemini 2.5 Flash Lite models
- Custom iflow provider with Chinese models  
- Model filtering capabilities (score threshold, ping threshold, context window minimum)
- PM2 easy start

## Why
The official modelrelay 1.9.0 release introduced significant architectural improvements:
- Simplified codebase using `buildModels()` function instead of manual MODELS array
- Externalized scores management via `scores.js` file
- Cleaner, more maintainable structure
- **Built-in minSweScore filtering** - models below threshold are excluded from pinging and routing
- Configuration export/import with base64url transfer tokens
- Per-provider ping intervals
- Auto-update improvements

## What Changed from Original Proposal

### Features Already in modelrelay 1.9.0 (NO LONGER NEEDED TO ADD):
1. ✅ **minSweScore filtering** - Already built into 1.9.0!
   - Config option: `minSweScore` (0-1 scale)
   - UI: Web UI has filter settings under Configuration
   - API: `POST /api/filter-rules` with `{ minSweScore: 0.5 }`
   - Excludes models below threshold from pinging and routing
   - **This replaces feature #2 in original requirements**

2. ✅ **Architecture (buildModels + scores.js)** - Already in 1.9.0
   - Uses `buildModels()` function
   - Scores in separate `scores.js` file
   - `canonicalizeModelId()` and `getScore()` helper functions

### Features NOT in modelrelay 1.9.0 (STILL NEED TO ADD):
1. ❌ **g4f provider** - Custom provider not in 1.9.0
   - Local proxy at 192.168.1.196:7980
   - Models: kimi-k2-thinking, glm-4.7, kimi-k2.5, deepseek-r1, gemini-2.0-flash, qwen3-coder, glm-5, gemini-2.5-flash-lite, gemini-2.5-flash-lite-preview-09-2025

2. ❌ **iflow provider** - Custom provider not in 1.9.0
   - API: https://apis.iflow.cn/v1/chat/completions
   - Multiple Chinese models (qwen3-max, kimi-k2, deepseek-v3.2, etc.)

3. ❌ **Latency/ping threshold filtering** - Not built in
   - Feature to exclude models by max latency (ping time) from routing
   - Should still ping them but not use them for routing if over threshold

4. ❌ **PM2 easy start** - Not built in
   - Simple way to start via PM2 for production use

## Impact
- **Positive**: 
  - Much less code to maintain (score filtering already done)
  - Cleaner architecture
  - Better alignment with upstream
  - Auto-update system improvements
- **Risk**: Need to ensure custom filtering logic integrates properly with new architecture
- **Effort**: Medium - requires adding custom providers and optional latency filtering

## What to Migrate from MRX to 1.9.0
1. Copy g4f and iflow providers into sources.js
2. Add their scores to scores.js
3. Add latency threshold config (new feature)
4. Add PM2 startup scripts/ecosystem config
