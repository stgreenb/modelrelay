## 1. Create Override Module

- [x] 1.1 Create `lib/score-overrides.js` with `parseScoreOverrides()` function
- [x] 1.2 Parse `MODELRELAY_SCORE_OVERRIDES` env var as JSON
- [x] 1.3 Validate score values (0.0 to 1.0 range)
- [x] 1.4 Export `getScoreOverride(modelId)` function
- [x] 1.5 Handle invalid JSON gracefully with empty map fallback

## 2. Update Score Lookup

- [x] 2.1 Update `sources.js` `getScore()` to check override map first
- [x] 2.2 Test override takes precedence over `scores.js`
- [x] 2.3 Test unknown model without override returns null

## 3. Update Dynamic Model Handling

- [x] 3.1 Update `lib/server.js` line 246 (OpenAI-Compatible) to use `getScore()`
- [x] 3.2 Update `lib/server.js` line 326 (KiloCode) to use `getScore()`
- [x] 3.3 Update `lib/server.js` line 403 (OpenRouter) to use `getScore()`
- [x] 3.4 Update `lib/server.js` line 478 (OpenCode Zen) to use `getScore()`
- [x] 3.5 Update `lib/server.js` line 756 (Generic dynamic) to use `getScore()`

## 4. Setup Custom Overrides Directory

- [x] 4.1 Create `custom-overrides/` directory structure in repo
- [x] 4.2 Copy modified `sources.js` to `custom-overrides/sources.js`
- [x] 4.3 Copy modified `lib/server.js` to `custom-overrides/lib/server.js`
- [x] 4.4 Copy new `lib/score-overrides.js` to `custom-overrides/lib/score-overrides.js`
- [x] 4.5 Ensure `custom-overrides/` does NOT include `scores.js`

## 5. Update GitHub Actions Workflow

- [x] 5.1 Read existing `.github/workflows/publish-docker.yml`
- [x] 5.2 Add step to copy custom-overrides files after extraction
- [x] 5.3 Verify workflow copies from `custom-overrides/` to `build-context/` then builds

## 6. Documentation

- [x] 6.1 Add commented example in `docker-compose.yml` showing `MODELRELAY_SCORE_OVERRIDES`
- [x] 6.2 Add score overrides section to `README.md` with usage example
- [x] 6.3 Add section explaining custom-overrides build strategy to README

## 7. Testing

- [x] 7.1 Add tests for `lib/score-overrides.js` parsing
- [x] 7.2 Add test for override precedence over `scores.js`
- [x] 7.3 Run `pnpm test` to verify all tests pass
