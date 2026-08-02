# modelrelay-docker

Thin wrapper that builds and publishes Docker images of [modelrelay](https://github.com/ellipticmarketing/modelrelay) releases to GHCR.

## Usage

1. Go to **Actions** → **Build and Publish ModelRelay Docker Image**
2. Click **Run workflow**
3. Enter the upstream version (e.g. `1.13.2`)
4. Run

## Docker Image

Pull with:

```bash
docker pull ghcr.io/stgreenb/modelrelay:<version>
```

Run with:

```bash
docker run -d -p 7352:7352 ghcr.io/stgreenb/modelrelay:<version>
```

## Score Overrides

Modelrelay assigns SWE-bench scores to models. You can override scores for custom models or to replace defaults.

### Method 1: Config File (Recommended for production)

Create a `score-overrides.json` file:

```json
{
  "deepseek-ai/deepseek-v4": 0.73,
  "custom/ollama-model": 0.65
}
```

Mount it in your container:

```bash
docker run -d -p 7352:7352 \
  -v ./score-overrides.json:/app/config/score-overrides.json:ro \
  ghcr.io/stgreenb/modelrelay:<version>
```

### Method 2: Environment Variable (Quick testing)

```bash
docker run -d -p 7352:7352 \
  -e MODELRELAY_SCORE_OVERRIDES='{"deepseek-ai/deepseek-v4": 0.73}' \
  ghcr.io/stgreenb/modelrelay:<version>
```

Config file takes precedence over environment variable if both are set.

## Custom Overrides Build Strategy

This project uses a GitHub Actions-driven patching strategy:

1. Upstream modelrelay is downloaded and extracted into `build-context/`
2. `scripts/patch-sources.js` injects a score-override hook into the upstream `sources.js` (import + override-first check in `getScore()`). It verifies the expected function shape and **fails the build** if upstream changed it
3. `custom-overrides/lib/score-overrides.js` (the override-handling module) is copied in — this is the only file we ship
4. `scripts/validate-score-overrides.js` fails the build if any override entry is already covered by the static `scores.js`/alias map
5. `scores.js` and the rest of `sources.js` are NEVER maintained locally — upstream score/model data flows through automatically on every release

The patched `getScore()` checks `score-overrides.json` / `MODELRELAY_SCORE_OVERRIDES` first. Since 1.19, live OpenRouter catalog data takes precedence over the override at runtime; see `docs/override-behavior.md` for the full resolution order.

Files maintained locally:
- `custom-overrides/lib/score-overrides.js` — override handling module
- `score-overrides.json` — static override values (only models missing upstream)
- `scripts/` — patch + validation scripts
