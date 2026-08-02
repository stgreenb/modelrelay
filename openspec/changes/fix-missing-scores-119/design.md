## Context

Upstream modelrelay **1.19.0** (released 2026-08-02) rewrote scoring. Previously it used a static `scores.js` (SWE-bench values) with a 0.45 default. Now `lib/model-quality.js` resolves quality against a **live OpenRouter catalog** fetched from `fetchOpenRouterQualityIndex()`:

```
resolveModelQuality() precedence:
  1. Live catalog match (artificial-analysis → design-arena → metadata heuristic)
  2. localScore — the getScore() value passed in (our override path)
  3. default-fallback 0.45
```

Our packaging repo currently ships `custom-overrides/sources.js`, which overrides upstream's `sources.js` wholesale during the GHCR build (`cp -r custom-overrides/* build-context/`). Our file is still based on **1.15.1**. Diffing it against 1.19.0 shows we are missing ~20 aliases (`glm-5.2`, `kimi-k2.7-code`, `kimi-k3`, `laguna-s-2.1`, `minimax-m3`, `nemotron-3-ultra`, `north-mini-code`, `step-3.7-flash`, `ling-3.0-flash`, `ring-2.6-1t`, `mimo-v2.5`, `deepseek-v4-flash:0731`, `hy3-free`, ...), new label/context overrides, and an entire new **Kiro** provider source. Shipping it now would regress the model catalog — and the full-file-replacement model requires manual re-sync on every upstream release.

### Score override mechanism (unchanged in scope)

`custom-overrides/lib/score-overrides.js` provides `getScoreOverride(modelId)`, reading `/app/config/score-overrides.json` or `MODELRELAY_SCORE_OVERRIDES`. Once injected, upstream's `sources.js:getScore()` calls it first, then falls back to `scores.js`. In 1.19 this value becomes the `localScore` parameter to `resolveModelQuality`, so it only fires when the live catalog has no match — exactly the "missing scores only" behavior we want.

### Current override set vs. 1.19 coverage

The current `score-overrides.json` has 6 entries. After the 1.19 rebase, upstream `scores.js` now covers most of them:

| Override entry | 1.19 upstream coverage | Action |
|---|---|---|
| `inclusionai/ling-2.6-1t:free` | `scores.js`: 0.80 | remove (covered) |
| `hy3-preview-free` | `scores.js`: 0.744 | remove (covered) |
| `tencent/hy3-preview:free` | `scores.js`: 0.744 | remove (covered) |
| `deepseek-v4-flash` | `scores.js`: 0.521 + design-arena | remove (covered) |
| `deepseek-v4-pro` | `scores.js`: 0.806 | remove (covered) |
| `GLM-4.7-Flash` | alias `glm-4.7` → `z-ai/glm4.7` 0.738 | remove (covered) |

So under the "missing scores only" scope, all six existing entries become redundant and should be pruned. New overrides should be added only for models still resolving to `default-fallback` 0.45.

## Goals / Non-Goals

**Goals:**
- Stop replacing upstream `sources.js` wholesale; inject only the `getScoreOverride` hook at build time
- Keep the existing score-override config mechanics (`score-overrides.json` + `MODELRELAY_SCORE_OVERRIDES`) unchanged
- Scope the override config to genuinely missing scores — models with no live-catalog match and no upstream `scores.js`/alias entry
- Never override scores that the live catalog or upstream already provides
- Maximize portability across future upstream releases

**Non-Goals:**
- No upstream code changes — 1.19's `resolveModelQuality` already gives overrides last-resort precedence
- No forking of upstream modelrelay
- No attempt to force our own values over Artificial Analysis / Design Arena / upstream metadata

## Decisions

**1. Build-time hook injection instead of wholesale file replacement**

The only modification we ever need against upstream is a 5-line delta to `getScore()`:

```
+import { getScoreOverride } from './lib/score-overrides.js'
...
+  const override = getScoreOverride(modelId);
+  if (override !== null) {
+    return override;
+  }
```

**Decision:** Create `scripts/patch-sources.js`, run in the workflow against the freshly-extracted upstream `build-context/sources.js`. It:
1. Verifies upstream `sources.js` still has the expected `getScore()` signature (fails loudly if upstream changed shape — no silent regression)
2. Adds the import line after the existing `import { scores } from './scores.js'`
3. Injects the override-first check at the top of `getScore()`
4. Idempotent — no-op if the hook is already present

Rationale: upstream model data (aliases, labels, contexts, Kiro provider, all future additions) flows in automatically on every build from the released tarball. We never maintain a copy of `sources.js`, so there is nothing to drift or forget to re-sync. The patch script is the single, small, reviewable artifact that stays in sync with upstream's `getScore()`.

Alternatives considered:
- **Wholesale replacement (current):** every release needs manual re-sync; forgot → whole catalog regresses. Rejected.
- **Workflow `sed`:** brittle against formatting, hard to validate. Rejected.
- **AST parsing (@babel/parser + generator):** most robust against upstream formatting changes, but adds a build-time dependency for a 5-line injection and is overkill when the patch script already fails loudly on shape mismatch. Considered but deferred — revisit only if upstream `getScore()` becomes unstable.
- **Runtime monkey-patching via a wrapper module:** keeps the upstream tarball pristine, but requires Node module-alias wiring in the Dockerfile (`--import`) and adds runtime indirection for every `sources.js` import. Higher complexity than a build-time injection for the same guarantee. Rejected for now.

**2. Scope of override entries**

Only ship overrides for models whose resolved source is `default-fallback` (score 0.45). Prune all entries already covered by 1.19 `scores.js`, alias map, or the live catalog.

Identification method: after deploying the patched image, query `GET /api/models` and look for `qualitySource: "default-fallback"`. Add overrides for any of those the team wants to rank. Current evidence (live host, 1.19) shows **zero** models at `default-fallback` — so the pruned override file may be empty or near-empty until new models appear.

**3. Config file format unchanged**

`score-overrides.json` (mounted at `/app/config/`) and `MODELRELAY_SCORE_OVERRIDES` keep identical parsing/validation. `lib/score-overrides.js` is untouched. Only the shipped `score-overrides.json` contents change.

**4. Tests updated for the injection approach**

`test-score-overrides.js` exercises `parseScoreOverrides`/`getScoreOverride` against the `custom-overrides/lib/score-overrides.js` module — unaffected by injection. Add a test that runs `scripts/patch-sources.js` against a fixture `sources.js` (a stripped-down copy of upstream 1.19's `getScore()`) and asserts the hook is present and `getScore()` returns the override value. This guards against future upstream signature changes breaking the patch silently.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Upstream changes `getScore()` signature in a future release | Patch script fails loudly with a clear message; CI catches it, manual fix is a small edit to `scripts/patch-sources.js` |
| Patch script accidentally modifies more than intended | It only touches the import line and the `getScore()` body; a test asserts the exact final shape |
| 1.19's `resolveModelQuality` may cache quality data (`MODEL_QUALITY_CACHE_MS`) so new catalog scores are delayed | Existing upstream behavior; overrides still apply immediately as `localScore` |
| Pruning all six entries leaves no shipped overrides → team may not notice when a new model defaults to 0.45 | Document the audit command (`GET /api/models`, filter `default-fallback`) in the tasks |
| `GLM-4.7-Flash` label key may not resolve in upstream's alias map | Dropped with the prune; upstream now labels `glm-4.7` → `GLM 4.7` |

## Migration Plan

1. Create `scripts/patch-sources.js` and validate it against a fixture `sources.js` containing upstream 1.19's `getScore()`
2. Remove `custom-overrides/sources.js` from the repo
3. Update `.github/workflows/publish-docker.yml` to run the patch script on `build-context/sources.js` after extraction (and to copy only additive files)
4. Prune `score-overrides.json` to missing-only entries (likely empty)
5. Update `test-score-overrides.js` for the injection approach
6. Build/push new GHCR tag via the workflow, redeploy on the host, audit `/api/models` for `default-fallback` entries
7. Rollback: previous GHCR tag is untouched; `latest` is only advanced on the new build

## Open Questions

- Should the audited `default-fallback` models get researched SWE-bench/AI-analysis scores now, or wait until the patched image is live? (Assumes wait — patch first, then audit.)
- Do we want a CI check that fails when upstream's `getScore()` shape changes and the patch script aborts? (The script already fails loudly; a CI wrapper is optional.)
