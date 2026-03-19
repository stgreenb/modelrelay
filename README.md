# MRX (Model Relay Extended)

Fork of modelrelay - OpenAI-compatible local router with iflow.cn, g4f proxy, and intelligent routing filters.

## Features

- **Free Model Routing**: Route requests to free LLM providers based on latency, uptime, and availability
- **FCM Integration**: Built-in sync with Free Coding Models (FCM) for 19+ providers with Stability Scores
- **HTTP Proxy Support**: Respects HTTP_PROXY, HTTPS_PROXY, and NO_PROXY environment variables
- **Custom Providers**: Includes g4f, g4f_deepinfra, and iflow providers
- **OAuth Support**: Qwen Code OAuth authentication
- **Auto-Update**: Automatic updates and restart coordination

## Install

```bash
cd mrx
npm install
```

## Syncing with Free Coding Models (FCM)

MRX syncs with [free-coding-models](https://github.com/vava-nessa/free-coding-models) to get the latest providers and models.

```bash
# Sync FCM sources (downloads latest sources.js and merges MRX custom providers)
pnpm run sync-fcm

# Or using npm
npm run sync-fcm
```

This will:
1. Download the latest `sources.js` from FCM
2. Merge in MRX custom providers (g4f, iflow, g4f_deepinfra)
3. Generate updated `scores.js` with tier/SWE scores

## Quick Start

```bash
# Start with pm2 (recommended for background)
pm2 start ecosystem.config.cjs

# Or run directly
node bin/modelrelay.js --port 7352
```

## PM2 Commands

```bash
# Start MRX (recommended)
pm2 start ecosystem.config.cjs

# Or with inline options
pm2 start bin/modelrelay.js --name mrx -- --port 7352

# View logs
pm2 logs mrx

# Restart
pm2 restart mrx

# Stop
pm2 stop mrx

# Delete
pm2 delete mrx
```

## Router Endpoint

- Base URL: `http://127.0.0.1:7352/v1`
- API key: any string (ignored)
- Model: `auto-fastest` (router picks best available)

## New Providers in MRX

| Provider | Models | Latency | Notes |
|----------|--------|---------|-------|
| **iflow.cn** | 15 | ~900ms | Primary - reliable |
| **g4f Proxy** | 7 | 500-4000ms | Supplementary - flaky |
| nvidia NIM | 44 | 400-2000ms | Original |
| groq | 10 | 300-500ms | Original |

## Routing Filters

Edit `~/.modelrelay.json`:

```json
{
  "filters": {
    "maxPingMs": 1200,
    "minContextTokens": 100000,
    "minIntell": 0.70
  },
  "minSweScore": 0.50
}
```

| Filter | Default | Description |
|--------|---------|-------------|
| `maxPingMs` | 1200 | Skip models slower than this (ms) - still pings but doesn't route |
| `minContextTokens` | 100000 | Skip models with smaller context |
| `minIntell` | 0.70 | Skip models with lower SWE score - still pings but doesn't route |
| `minSweScore` | null | 1.9.0 built-in - excludes models below threshold from pinging AND routing |

## Config

Config file: `~/.modelrelay.json`

```json
{
  "apiKeys": {
    "nvidia": "nvapi-...",
    "iflow": "your-iflow-key",
    "groq": "gsk_..."
  },
  "filters": {
    "maxPingMs": 1200,
    "minContextTokens": 100000,
    "minIntell": 0.70
  },
  "minSweScore": 0.50,
  "excludedProviders": [],
  "apiKeyExpiry": {
    "iflow": "2026-03-07"
  }
}
```

### API Key Environment Variables
- `NVIDIA_API_KEY`
- `IFLOW_API_KEY`
- `GROQ_API_KEY`
- `CEREBRAS_API_KEY`
- `OPENROUTER_API_KEY`
- `CODESTRAL_API_KEY`
- `SCALEWAY_API_KEY`
- `QWEN_CODE_API_KEY` (or `DASHSCOPE_API_KEY`)
- `GOOGLE_API_KEY`

### API Key Expiry
iflow keys expire every 7 days. Add expiry date to config to get warnings:

```json
"apiKeyExpiry": {
  "iflow": "2026-03-07"
}
```

## Notes

- Auto-update is **disabled** (this is a local fork, not published to npm)
- g4f proxy is supplementary - use when primary providers are slow/unavailable
- Models below minIntell (0.70) are not pinged to reduce traffic
- Slow models are dynamically filtered - they return when they speed up

## OpenCode Config

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "router": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "mrx",
      "options": {
        "baseURL": "http://127.0.0.1:7352/v1",
        "apiKey": "dummy-key"
      },
      "models": {
        "auto-fastest": {
          "name": "Auto Fastest",
          "limit": {
            "context": 100000,
            "output": 65536
          }
        }
      }
    }
  },
  "model": "router/auto-fastest"
}
```
