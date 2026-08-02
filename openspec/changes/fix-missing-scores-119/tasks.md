## 1. Build-time hook injection

- [x] 1.1 Create `scripts/patch-sources.js` that injects the `getScoreOverride` hook into upstream `sources.js` (import line + override-first check inside `getScore()`)
- [x] 1.2 Patch script verifies upstream `getScore()` signature matches the expected shape and exits non-zero with a clear message if it doesn't
- [x] 1.3 Make the patch idempotent — no-op (exit 0) if the hook is already present
- [x] 1.4 Remove `custom-overrides/sources.js` (full copy no longer maintained)
- [x] 1.5 Validate the patch against a fixture `sources.js` copied from upstream 1.19.0 — confirm only the import + `getScore()` body change

## 2. Update packaging workflow

- [x] 2.1 Update `.github/workflows/publish-docker.yml` to run `node scripts/patch-sources.js build-context/sources.js` after extraction, before build
- [x] 2.2 Ensure only additive files (`custom-overrides/lib/*`, etc.) are copied into `build-context/` — no `sources.js` copy
- [x] 2.3 Confirm a workflow run with a deliberately broken fixture would fail the build (manual sanity check or CI) — covered by tests 4.3 (loud-failure exit codes)

## 3. Prune override config

- [x] 3.1 Remove entries covered by upstream 1.19 `scores.js`/alias map from `score-overrides.json`. Verified via lookup simulation: 5 of 6 are covered (`inclusionai/ling-2.6-1t:free`, `hy3-preview-free`, `tencent/hy3-preview:free`, `deepseek-v4-flash`, `deepseek-v4-pro`); `GLM-4.7-Flash` is genuinely missing upstream (alias map has `glm-4.7` → `z-ai/glm4.7`, not `glm-4.7-flash`) so it stays
- [x] 3.2 If no genuinely-missing models remain, set `score-overrides.json` to exactly `{}` (a 0-byte file is invalid JSON and must never be written). One genuinely-missing model remains, so the file now contains only `{"GLM-4.7-Flash": 0.59}`
- [x] 3.3 Confirm `custom-overrides/lib/score-overrides.js` is unchanged (aside from the observability log added in 4.5)
- [x] 3.4 Add a validation script that compares `score-overrides.json` entries against upstream `scores.js` + alias map and fails the build if any entry is covered upstream (prevents silent stale overrides). Scope is static-only — `scores.js` + hardcoded alias map, NOT the runtime live-catalog lookup, so CI stays deterministic with no network calls

## 4. Tests

- [x] 4.1 Add a test that runs `scripts/patch-sources.js` against a fixture `sources.js` (upstream 1.19 `getScore()`) and asserts the hook is injected and `getScore('fixture')` returns the override value
- [x] 4.2 Add a test that an empty `{}` override config parses cleanly (no throw, empty Map), plus edge cases: empty file (0 bytes) and whitespace-only file must not crash the parser
- [x] 4.3 Add a test that `patch-sources.js` fails loudly (non-zero exit) when `getScore()` has an unexpected shape (e.g. changed parameter order, async, or missing body)
- [x] 4.4 Add a test stubbing `resolveModelQuality` with a mocked live-catalog index, asserting an override is ignored when a catalog match exists and used when it doesn't (deterministic, no live API calls)
- [x] 4.5 Add a startup observability log in the patched `getScore()` or `lib/score-overrides.js` init path — print "score-overrides hook active" plus the override entry count so operators can confirm the hook loaded
- [x] 4.6 Run `node test-score-overrides.js` and confirm all tests pass — 13/13 pass

## 5. Verify and deploy

- [ ] 5.1 Build a local image from the patched upstream sources and smoke-test `GET /api/models`; confirm the startup log shows the override hook active
- [ ] 5.2 Before the audit, set `MODEL_QUALITY_CACHE_MS=0` (or restart the container to flush the cache) so `/api/models` returns fresh quality data — otherwise the audit may read stale catalog scores
- [ ] 5.3 Query the deployed instance for models with `qualitySource: "default-fallback"` and record them
- [ ] 5.4 Trigger the GHCR workflow for 1.19.0 and redeploy the host
- [ ] 5.5 Add overrides for any audited `default-fallback` models the team wants ranked
- [ ] 5.6 Add `docs/override-behavior.md` explaining when overrides are ignored (live-catalog match wins), how to check `qualitySource` on `GET /api/models`, and expected behavior for new models — DONE (file created; awaiting deploy to validate)
