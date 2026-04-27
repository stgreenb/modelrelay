## Context

Model Relay assigns a default 0.45 SWE score to newly discovered models not in `scores.js`. Users cannot override this value without modifying the codebase. Two use cases exist: (1) new models getting 0.45 by default (e.g., DeepSeek V4 from Ollama Cloud), and (2) custom OpenAI-Compatible endpoints requiring user-defined scores.

### Distribution Workflow

This project uses a **container distribution model** via GitHub Actions:
1. Upstream modelrelay releases trigger manual build with specific version
2. GitHub Actions downloads upstream tarball, extracts it
3. Applies custom modifications from `custom-overrides/` directory
4. Builds Docker image and pushes to GHCR

Current score lookup flow:
1. `getScore(modelId)` → `scores.js` lookup → null
2. If null and dynamic model → `DEFAULT_DYNAMIC_MODEL_INTELL = 0.45`

## Goals / Non-Goals

**Goals:**
- Allow users to define custom SWE scores via **config file OR environment variable**
- Override works before `scores.js` lookup and before 0.45 default
- Works for all contexts: ranking, UI, filtering
- Non-invasive to upstream modelrelay code (no fork required)
- Compatible with future `scores.js` updates from upstream
- Integrate cleanly with existing GitHub Actions container build workflow

**Non-Goals:**
- No persistence layer beyond config file/env var
- No admin UI for managing overrides
- No per-model disable via override (keep simple)
- No forking of upstream repository

## Decisions

**1. Support both config file and environment variable**

| Option | Pros | Cons | Use Case |
|--------|------|------|----------|
| Config file (`/app/config/score-overrides.json`)
 | Clean JSON syntax, version controlled, no escaping | Requires file mount | Production/stable models |
| Environment variable (`MODELRELAY_SCORE_OVERRIDES`)
 | Quick experimentation, no file needed | JSON parsing complexity | Development/testing |

**Decision:** Support **both** with config file taking precedence over env var.

**Priority order:**
1. Config file `/app/config/score-overrides.json` (if exists)
2. Environment variable `MODELRELAY_SCORE_OVERRIDES` (if set)
3. scores.js lookup
4. DEFAULT_DYNAMIC_MODEL_INTELL (0.45)

**Docker-compose examples:**

```yaml
# Option A: Config file (recommended for production)
services:
  modelrelay:
    volumes:
      - ./score-overrides.json:/app/config/score-overrides.json

# Option B: Environment variable (quick testing)
services:
  modelrelay:
    environment:
      - MODELRELAY_SCORE_OVERRIDES={"deepseek-v4": 0.73}
```

**2. Single lookup point in `sources.js`**

All score lookups flow through `getScore(modelId)` in `sources.js`. Adding override check here means:
- Hardcoded models: override checked before `scores.js`
- Dynamic models: all 5 server.js call sites need to use `getScore()` instead of `DEFAULT_DYNAMIC_MODEL_INTELL`

**Decision:** Create `lib/score-overrides.js` module that:
- Tries to read config file first (cached at startup)
- Falls back to parsing `MODELRELAY_SCORE_OVERRIDES` env var
- Provides `getScoreOverride(modelId)` function
- `sources.js:getScore()` checks override first, then falls through to `scores.js`

**3. Override lookup implementation**

**Decision:** Check overrides in this order (once per startup):
1. Read `/app/config/score-overrides.json` (if exists) → parse → cache
2. If no config file, parse `MODELRELAY_SCORE_OVERRIDES` env var → cache
3. Empty override map if neither exists (fallback to normal behavior)

**4. Override completely replaces existing value**

Override wins always — no additive behavior. If a model exists in `scores.js` with 0.72 and user sets override to 0.80, the override is used.

**5. Patching strategy for distribution**

| Approach | Pros | Cons |
|----------|------|------|
| Fork upstream | Full control | Merge conflicts per release, out of sync with containers |
| **Patch file (selected)** | Clear separation, easy to update per release | Need to maintain custom-overrides/ directory |
| Code injection in workflow | Everything in one file | Harder to maintain, more complex workflow |

**Decision:** Maintain `custom-overrides/` directory with modified files.

**6. Scores.js untouched**

**Decision:** Never modify scores.js. Custom overrides layer on top:
- Upstream score updates automatically flow through
- Only models in override are affected
- All other models use upstream scores.js values

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Invalid JSON in env var | Parse with try/catch, fall back to empty overrides |
| Typo in model ID | Silently ignored, model uses default. Document exact ID format. |
| Override to invalid value (<0 or >1) | Validate on read, ignore invalid values |
| Config file not mounted | Graceful fallback to env var or no override |
| Upstream changes to source files we modify | Manual review required per release. Monitor `getScore()` signature changes. |

## Open Questions

None — design is complete based on explored requirements.
