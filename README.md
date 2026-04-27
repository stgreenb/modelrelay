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

1. Modified files are stored in `custom-overrides/` directory
2. During build, upstream modelrelay is downloaded and extracted
3. Files from `custom-overrides/` copy over upstream equivalents
4. `scores.js` is NEVER modified — upstream score updates flow through automatically

Only these files are overridden:
- `sources.js` — modified to check overrides first
- `lib/score-overrides.js` — new module for override handling
