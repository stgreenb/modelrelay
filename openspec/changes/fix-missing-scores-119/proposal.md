## Why

Upstream modelrelay 1.19 switched scoring from static SWE-bench `scores.js` to a live OpenRouter catalog (Artificial Analysis coding index → Design Arena regression → metadata heuristic → local fallback). Our packaging currently ships `custom-overrides/sources.js` — a full copy of upstream's `sources.js` from **1.15.1** with a `getScoreOverride` hook bolted on. It is missing ~20 aliases, new labels/context overrides, and the Kiro provider source introduced since then, and because the build workflow copies it over upstream's file, shipping it now would regress the model catalog. Worse, the full-file replacement means every upstream release requires manual re-sync — the opposite of portability.

## What Changes

- **Stop replacing upstream `sources.js` entirely.** Remove the full copy from `custom-overrides/`.
- **Inject the `getScoreOverride` hook at build time** with a small patch script that edits upstream's freshly-downloaded `sources.js` — adding the import and the override-first check inside `getScore()`. The patch script fails loudly if upstream's `getScore()` changes shape, instead of silently regressing.
- **Scope the override config to missing scores only**: `score-overrides.json` (and env var equivalent) will only carry entries for models that the live OpenRouter catalog and upstream `scores.js` do not cover. Scores for models already ranked by Artificial Analysis / Design Arena / upstream metadata are left untouched.
- **Update the shipped `score-overrides.json`** to remove entries now covered by 1.19's catalog/fallbacks and add entries for models still defaulting to 0.45.
- Keep `custom-overrides/lib/score-overrides.js` and the `MODELRELAY_SCORE_OVERRIDES` / config-file mechanics unchanged.
- Update tests to match the new injection approach and the revised override set.

## Capabilities

### New Capabilities
- none

### Modified Capabilities
- `score-overrides`: Add a requirement that overrides are the last-resort score source — they SHALL only supply scores for models lacking a live-catalog match or upstream `scores.js` entry, and SHALL NOT attempt to override scores already provided by Artificial Analysis, Design Arena, or upstream metadata.

## Impact

- `custom-overrides/sources.js`: Removed (no longer replaces upstream)
- `scripts/patch-sources.js` (new): Injects `getScoreOverride` hook into upstream `sources.js` at build time
- `.github/workflows/publish-docker.yml`: Run patch script on `build-context/sources.js`; copy only additive `custom-overrides/lib/*` and `custom-overrides/*` excluding `sources.js`
- `score-overrides.json`: Pruned to missing-only entries
- `custom-overrides/lib/score-overrides.js`: Unchanged
- `test-score-overrides.js`: Updated for injection approach
- Behavior in 1.19: `resolveModelQuality(qualityData, modelId, getScore(modelId))` already checks the live catalog first and only falls back to `getScore()` (our override) when there is no catalog match — this aligns with the new "missing scores only" scope, so no upstream code change is needed.
