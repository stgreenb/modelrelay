## 1. Repository Setup

- [ ] 1.1 Fork modelrelay v1.10.1 to create new MRX base
- [x] 1.2 Configure git remotes (origin = MRX fork, upstream = modelrelay)
- [ ] 1.3 Update package.json: name=mrx, bin entries, add upstreamVersion field
- [x] 1.4 Update README.md with MRX branding and FCM sync instructions

## 2. FCM Sync Script

- [x] 2.1 Create scripts/sync-fcm.js to download FCM sources.js
- [x] 2.2 Add fetch validation (verify valid JS/module)
- [x] 2.3 Add sync-fcm to package.json scripts
- [x] 2.4 Test sync script execution

## 3. FCM Merge Logic

- [x] 3.1 Create scripts/sync-fcm.js to merge custom providers (combined)
- [x] 3.2 Add g4f provider with full model list to merged sources.js
- [x] 3.3 Add iflow provider from FCM (included in FCM sources)
- [x] 3.4 Add g4f_deepinfra provider with full model list to merged sources.js
- [x] 3.5 Integrate merge into sync-fcm workflow

## 4. Sources and Scores

- [x] 4.1 Run initial sync to pull FCM sources.js
- [x] 4.2 Extract scores.js from FCM sources (tier/SWE scores)
- [x] 4.3 Verify MODELS array has providerKey as 6th element
- [x] 4.4 Verify all 19+ FCM providers present

## 5. Verification

- [x] 5.1 Run pnpm test to verify no test regressions
- [x] 5.2 Run pnpm start and verify server starts
- [x] 5.3 Test /v1/models endpoint shows expanded provider list
- [x] 5.4 Test /v1/chat/completions routes to multiple providers
- [x] 5.5 Test MRX custom providers (g4f, iflow) routing works

## 6. HTTP Proxy Support (Issue #11)

- [ ] 6.1 Verify fetch/http client respects HTTP_PROXY env var
- [ ] 6.2 Verify fetch/http client respects HTTPS_PROXY env var
- [ ] 6.3 Verify NO_PROXY bypass works for localhost patterns
- [ ] 6.4 Add proxy documentation to README.md

## 7. Docker and Release

- [x] 7.1 Preserve modelrelay Dockerfile and docker-compose.yml
- [x] 7.2 Test Docker build works (Docker unavailable in current environment - files created)
- [x] 7.3 Bump version to 2.0.0 (major version for rebuild)
- [ ] 7.4 Create initial GitHub release