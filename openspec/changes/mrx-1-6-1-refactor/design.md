# MRX 1.6.1 Refactor Design (Revised for 1.9.0)

## Architecture Overview
Adopt the official 1.9.0 pattern while extending it for MRX-specific needs:

### Core Components (Already in 1.9.0)
1. **sources.js**: Provider definitions (official + MRX custom)
2. **scores.js**: External scores file with canonical model IDs
3. **buildModels() function**: Auto-generates MODELS array from sources (already in 1.9.0!)
4. **Filtering logic**: Built-in minSweScore filtering via config

### Features Status

| Feature | In 1.9.0? | MRX Action |
|---------|------------|------------|
| buildModels() | ✅ Yes | Use as-is |
| scores.js | ✅ Yes | Use as-is + add MRX scores |
| minSweScore filtering | ✅ Yes | Use config option directly |
| g4f provider | ❌ No | Add to sources.js |
| iflow provider | ❌ No | Add to sources.js |
| Latency threshold | ❌ No | Implement new config |
| PM2 start | ❌ No | Add ecosystem.config.js |

## Provider Structure
Add MRX-specific providers to official sources.js:

```javascript
// Add after existing providers in sources.js

// === MRX: g4f proxy (supplementary provider) ===
"g4f": {
  "name": "g4f Proxy",
  "url": "http://192.168.1.196:7980/v1/chat/completions",
  "models": [
    ["kimi-k2-thinking", "Kimi K2 Thinking", "256k"],
    ["glm-4.7", "GLM 4.7", "200k"],
    ["kimi-k2.5", "Kimi K2.5", "128k"],
    ["deepseek-r1", "DeepSeek R1", "128k"],
    ["gemini-2.0-flash", "Gemini 2.0 Flash", "1M"],
    ["qwen3-coder", "Qwen3 Coder", "128k"],
    ["glm-5", "GLM 5", "128k"],
    ["models/gemini-2.5-flash-lite", "Gemini 2.5 Flash Lite", "1M"],
    ["models/gemini-2.5-flash-lite-preview-09-2025", "Gemini 2.5 Flash Lite Preview", "1M"]
  ]
},

// === MRX: iflow provider ===
"iflow": {
  "name": "iFlow",
  "url": "https://apis.iflow.cn/v1/chat/completions",
  "models": [
    ["iflow-rome-30ba3b", "iFlow Rome", "128k"],
    ["qwen3-coder-plus", "Qwen3 Coder Plus", "128k"],
    ["qwen3-max", "Qwen3 Max", "128k"],
    // ... other iflow models
  ]
}
```

## Scores Management
Add MRX custom scores to official scores.js:

```javascript
// Add to scores.js

// MRX: g4f models
"kimi-k2-thinking": 0.713,
"glm-4.7": 0.738,
"kimi-k2.5": 0.75,
"deepseek-r1": 0.439,  // Note: check correct score
"gemini-2.0-flash": 0.18,
"qwen3-coder": 0.742,
"glm-5": 0.778,
"models/gemini-2.5-flash-lite": 0.65,
"models/gemini-2.5-flash-lite-preview-09-2025": 0.65,

// MRX: iflow models
"iflow-rome-30ba3b": 0.5,
"qwen3-coder-plus": 0.706,
"qwen3-max": 0.75,
// ... other iflow scores
```

## Model Building (Already Implemented in 1.9.0)
The buildModels() function already exists in 1.9.0:

```javascript
function buildModels() {
  const result = []
  for (const [providerKey, provider] of Object.entries(sources)) {
    for (const m of provider.models) {
      const [modelId, label, ctx] = m
      const intell = getScore(modelId)
      result.push([modelId, label, intell, ctx, providerKey])
    }
  }
  return result
}

export const MODELS = buildModels()
```

## Filtering Integration

### minSweScore (Already Built-In!)
Use the existing config option:
```javascript
// In config or via API
{
  "minSweScore": 0.5  // Excludes models below 50% SWE from pinging/routing
}
```

### Latency Threshold (New - Implement)
The 1.9.0 QoS calculation includes a latency tie-breaker, but it's too small to overcome significant SWE differences (e.g., 74% SWE at 4s will still beat 72% SWE at 500ms).

Add new config option for hard max latency threshold:
```javascript
// In config
{
  "maxLatency": 5000  // Exclude from routing (not pinging) if latency > 5s
}
```

This should:
- Still ping all models (for health monitoring)
- Exclude high-latency models from routing only
- Apply during model selection in lib/utils.js

## PM2 Integration (New)

Create ecosystem.config.js for easy PM2 start:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'modelrelay',
    script: './bin/modelrelay.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 7352
    }
  }]
}
```

Commands:
- `pm2 start ecosystem.config.js` - Start
- `pm2 save` - Save for restart
- `pm2 startup` - Generate startup script

## File Structure
- `sources.js`: Provider definitions (official + MRX custom) ✅
- `scores.js`: All model scores (official + MRX custom) ✅
- `ecosystem.config.js`: PM2 config (NEW)
- No manual MODELS array - uses buildModels() ✅
