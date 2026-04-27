## Why

Model Relay currently assigns an estimated 0.45 SWE score to newly discovered models that aren't in `scores.js`. Users have no way to override this value before the system is updated upstream. This affects: (1) new models like DeepSeek V4 from Ollama Cloud getting a poor default ranking, and (2) custom OpenAI-Compatible endpoints where users need to define scores for their own deployments.

## What Changes

- Add support for SWE score overrides via **either**:
  - A `score-overrides.json` configuration file (mounted as Docker volume)
  - Environment variable `MODELRELAY_SCORE_OVERRIDES` containing inline JSON
- Override values checked before both `scores.js` lookup and `DEFAULT_DYNAMIC_MODEL_INTELL` (0.45)
- Override works for all contexts: ranking, UI display, and filtering
- Override completely replaces any existing value (no additive behavior)

## Capabilities

### New Capabilities

- `score-overrides`: Allow users to define custom SWE scores for models via configuration file or environment variable, overriding both static registry and dynamic defaults

## Impact

- `lib/score-overrides.js`: New module to parse config file or env var and provide override lookup
- `sources.js`: Update `getScore()` to check override map first
- `lib/server.js`: 5 call sites using `DEFAULT_DYNAMIC_MODEL_INTELL` will use `getScore()` instead, allowing overrides to work for dynamic models

## Compatibility Note

This feature is designed to be **non-invasive** to upstream modelrelay code. User overrides are:
- Applied as a layer on top of `scores.js` without modifying it
- Compatible with future `scores.js` updates from upstream
- Will receive updates when upstream updates the base scores

## Distribution Note

**This change uses a GitHub Actions-driven patching strategy:**

1. **Custom code changes** are stored in `custom-overrides/` directory in this repo
2. **GitHub Actions workflow** downloads upstream modelrelay → extracts → copies files from `custom-overrides/` to overwrite upstream equivalents
3. **Modified files:**
   - `sources.js`: Updated `getScore()` function (single stable lookup point)
   - `lib/server.js`: 5 call sites now use `getScore()` instead of hardcoded 0.45
   - `lib/score-overrides.js`: New module (doesn't conflict with upstream)

4. **scores.js is NEVER modified** — future upstream score updates automatically flow through

### When Upstream Changes

| Scenario | Result |
|----------|--------|
| Upstream adds new scores to scores.js | **Automatic** — your build gets them, overrides still work |
| Upstream modifies getScore() signature | **Manual update** — you'll need to sync your custom sources.js |
| Upstream changes how dynamic models work | **Manual update** — may need to adjust server.js modifications |

This approach maintains compatibility with the container distribution workflow while adding persistent customization.
