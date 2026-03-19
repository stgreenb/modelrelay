## Context

MRX currently runs on an older version of modelrelay (~1.4.1) with custom g4f/iflow providers added manually to sources.js. The upstream modelrelay has advanced to v1.10.1 with features like:
- OpenAI-compatible custom provider support
- Better Docker/autostart support  
- Model group routing
- Config export/import

Meanwhile, free-coding-models (FCM) maintains a comprehensive sources.js with 19+ providers, tier labels, and SWE-bench scores.

## Goals / Non-Goals

**Goals:**
- Rebase MRX on modelrelay v1.10.1
- Adopt FCM's sources.js with all 19+ providers
- Add back MRX's custom providers (g4f, iflow, g4f_deepinfra)
- Create automated FCM sync mechanism
- Preserve MRX branding (package name, bin names)

**Non-Goals:**
- Modify core routing logic beyond compatibility fixes
- Add new providers beyond FCM + MRX custom
- Rebuild Docker infrastructure (use modelrelay's as-is)

## Decisions

1. **Sync strategy: Pull from FCM GitHub raw URL**
   - FCM sources.js available at `https://raw.githubusercontent.com/vava-nessa/free-coding-models/main/sources.js`
   - Script downloads, preserves MRX providers, outputs merged file
   - Alternative: Git submodule - adds complexity, not needed for single file

2. **Keep modelrelay as upstream, not merge**
   - modelrelay has Docker/autostart features we want
   - FCM is a CLI-only project (discontinued proxy)
   - Use modelrelay as base, incorporate FCM sources

3. **scores.js: Extract from FCM sources**
   - FCM embeds tier/score in model tuples [id, label, tier, score, ctx]
   - Extract to separate scores.js for compatibility with modelrelay routing
   - Scripts generate both files

4. **Package.json: Keep MRX identity**
   - Name: `mrx`
   - Bin: `modelrelay`, `mrx` (both point to same CLI)
   - Add `sync-fcm` script

## Risks / Trade-offs

- **[Risk] FCM sources format may change** → Mitigation: Pin to specific FCM commit/tag; parse validation
- **[Risk] Modelrelay breaking changes in update** → Mitigation: Test thoroughly, may need small compatibility patches
- **[Risk] Duplicate model IDs across providers** → Mitigation: Use FCM's providerKey in MODELS array; routing handles duplicates
- **[Trade-off] One sync script vs git-based** → Simple script is easier to maintain than submodule for single-file sync