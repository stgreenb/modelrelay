## MODIFIED Requirements

### Requirement: Override lookup before scores.js

The score override lookup SHALL be checked before the `scores.js` static registry for all model score requests.

#### Scenario: Override takes precedence
- **WHEN** config file contains `{"deepseek-ai/deepseek-v4": 0.73}` and `scores.js` contains entry with score 0.72
- **THEN** `getScore("deepseek-ai/deepseek-v4")` returns `0.73`

#### Scenario: Unknown model without override uses scores.js
- **WHEN** model is not in override map and not in `scores.js`
- **THEN** `getScore(modelId)` returns `null` (allows caller to apply default)

#### Scenario: scores.js updates are preserved
- **WHEN** upstream modelrelay adds new scores to `scores.js`
- **THEN** those scores are automatically available in the system
- **AND** user-defined overrides still apply to models in override map

#### Scenario: Live catalog match takes precedence over override
- **WHEN** the model has a live OpenRouter catalog entry (artificial-analysis, design-arena, or metadata source) AND also exists in the override map
- **THEN** the live catalog score SHALL be used
- **AND** the override value SHALL be ignored for that model

#### Scenario: Override applies as last-resort fallback
- **WHEN** the model has no live OpenRouter catalog match AND no `scores.js` entry AND is present in the override map
- **THEN** `resolveModelQuality` SHALL use the override value as its `localScore`
- **AND** the model SHALL NOT fall back to the 0.45 default

## ADDED Requirements

### Requirement: Override config scoped to missing scores

The shipped override configuration SHALL only contain entries for models that lack both a live OpenRouter catalog match and an upstream `scores.js`/alias entry. Entries for models already ranked by upstream shall be pruned.

#### Scenario: Override for a catalog-covered model is pruned
- **WHEN** a model is present in upstream 1.19 `scores.js` or alias map (e.g. `deepseek-v4-flash`, `hy3-preview-free`, `tencent/hy3-preview:free`, `inclusionai/ling-2.6-1t:free`, `deepseek-v4-pro`, `GLM-4.7-Flash`)
- **THEN** that model SHALL NOT appear in the shipped `score-overrides.json`
- **AND** its score SHALL come from the live catalog or upstream `scores.js`

#### Scenario: Override for a genuinely missing model is added
- **WHEN** a model resolves to `default-fallback` (score 0.45) via `GET /api/models` after the patched image is deployed
- **AND** the team chooses to rank it
- **THEN** the model SHALL be added to `score-overrides.json` with a researched score

#### Scenario: Empty override file is valid
- **WHEN** all previously overridden models are now covered by upstream or the live catalog
- **THEN** `score-overrides.json` SHALL contain an empty object `{}`
- **AND** the system SHALL operate normally with no overrides

### Requirement: Rebased sources preserve override hook

The upstream `sources.js` SHALL be patched at build time with the `getScoreOverride` integration inside `getScore()` via `scripts/patch-sources.js`, without maintaining a full local copy of `sources.js`.

#### Scenario: New model metadata flows in automatically
- **WHEN** the build extracts upstream `sources.js` (e.g. 1.19.0 or any future release)
- **THEN** all upstream additions SHALL be present in the built image (new aliases, labels, context overrides, Kiro provider, future additions)
- **AND** the only modification SHALL be the `getScoreOverride` import and the override-first check in `getScore()`

#### Scenario: Override hook survives the patch
- **WHEN** a model ID is present in the override map
- **THEN** `getScore(modelId)` SHALL return the override value before consulting `scores.js`

#### Scenario: Upstream getScore() signature change fails loudly
- **WHEN** a future upstream release changes the shape of `getScore()` such that the patch cannot be applied cleanly
- **THEN** `scripts/patch-sources.js` SHALL exit non-zero with a clear error message
- **AND** the build SHALL fail rather than silently ship without the override hook
