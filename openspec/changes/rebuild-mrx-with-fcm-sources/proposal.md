## Why

MRX is a fork of modelrelay that adds g4f/iflow proxy providers. However, the upstream modelrelay has advanced significantly (v1.10.1), while free-coding-models (FCM) maintains a more comprehensive and actively updated sources.js with 19+ providers. Currently, MRX must manually sync FCM updates. Rebuilding on latest modelrelay with FCM's sources and a streamlined update mechanism ensures we get upstream improvements while maintaining custom providers and easy FCM syncing.

## What Changes

- Fork from modelrelay v1.10.1 (latest stable)
- Replace sources.js with FCM's version (19+ providers with tier/SWE scores)
- Add MRX custom providers: g4f, iflow, g4f_deepinfra
- Create FCM sync script for easy one-command updates
- Keep MRX branding (name, package.json fields)
- Preserve Docker support from modelrelay

## Capabilities

### New Capabilities
- `fcm-sync`: Automated script to update sources.js from free-coding-models upstream
- `fcm-merge`: Merges FCM sources with MRX custom providers (g4f, iflow)
- `upstream-tracking`: Track modelrelay upstream for Docker/autostart features
- `http-proxy-support`: Respect HTTP_PROXY/HTTPS_PROXY environment variables for outbound requests

### Modified Capabilities
- `model-routing`: Expand from ~11 providers to 19+ while maintaining MRX custom providers

## Impact

- Main CLI: `bin/modelrelay.js` - updated to v1.10.1
- Model config: `sources.js` - replaced with FCM version + MRX extensions
- Scores: `scores.js` - updated from FCM
- Package: `package.json` - MRX branding, new scripts for FCM sync
- Docs: `README.md` - updated with FCM sources info and sync instructions