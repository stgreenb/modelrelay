# mrx

Thin wrapper that builds and publishes Docker images of [modelrelay](https://github.com/ellipticmarketing/modelrelay) releases to GHCR.

## Usage

1. Go to **Actions** → **Build and Publish ModelRelay Docker Image**
2. Click **Run workflow**
3. Enter the upstream version (e.g. `1.13.2`)
4. Run

## Docker Image

Pull with:

```bash
docker pull ghcr.io/stevex/mrx:<version>
```

Run with:

```bash
docker run -d -p 7352:7352 ghcr.io/stevex/mrx:<version>
```
