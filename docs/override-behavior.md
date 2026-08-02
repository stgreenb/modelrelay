# Score Override Behavior

Since modelrelay **1.19.0**, model scores are resolved at runtime from live
OpenRouter catalog data (Artificial Analysis coding index, Design Arena
regression, metadata estimates) with a static `scores.js` fallback.

## Resolution order

For any model, quality is resolved in this priority order:

1. **Live OpenRouter catalog** — Artificial Analysis coding index → Design Arena
   regression → metadata heuristic
2. **Local score** (`scores.js`, plus our `score-overrides.json` hook) →
   labeled `local-fallback`
3. **Default 0.45** → labeled `default-fallback`

## When overrides are ignored

An override in `score-overrides.json` or `MODELRELAY_SCORE_OVERRIDES` is only
used when **the live catalog has no match for that model** (step 1 wins). If a
model appears in the OpenRouter catalog, the catalog score wins and your
override is silently ignored.

For example, `stepfun/step-3.7-flash:free` is in the OpenRouter catalog, so its
Artificial Analysis score is used even if you set an override for it.

## Checking what source a model's score came from

`GET /api/models` returns each model with a `qualitySource` field:

- `artificial-analysis` — from the live catalog coding index
- `design-arena` — from the live catalog Design Arena regression
- `metadata` — from the live catalog metadata heuristic
- `local-fallback` — from `scores.js` or your override
- `default-fallback` — no catalog match and no local score (defaults to 0.45)

If an override doesn't seem to apply, check `qualitySource`: a
`local-fallback` means your override was used; anything else means a higher
priority source won.

## What to expect for new models

Models that are new or absent from the OpenRouter catalog fall through to your
overrides. To rank one, add its exact model ID (as reported by
`GET /api/models`) to `score-overrides.json`:

```json
{
  "custom/ollama-model": 0.65
}
```

## Startup verification

On container startup the server logs the hook state:

```
[score-overrides] Hook active, 1 override(s) from config file
```

If you don't see this line, the hook wasn't injected — check the build
(`scripts/patch-sources.js` must run against the upstream `sources.js`) and
the `custom-overrides/lib/score-overrides.js` mount.

## Stale override protection

The build workflow runs `scripts/validate-score-overrides.js`, which fails the
build if any entry in `score-overrides.json` is already covered by the static
`scores.js` or the alias map. This prevents silent stale overrides. The check
is static only — it does not call the live catalog — so CI stays deterministic.
