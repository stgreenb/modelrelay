## ADDED Requirements

### Requirement: Sources includes all FCM providers
The system SHALL include all 19+ providers from free-coding-models: nvidia, groq, cerebras, sambanova, openrouter, huggingface, replicate, deepinfra, fireworks, codestral, hyperbolic, scaleway, googleai, zai, siliconflow, together, cloudflare, perplexity, qwen, iflow.

#### Scenario: Check provider count
- **WHEN** user imports sources from sources.js
- **THEN** Object.keys(sources) returns at least 19 provider keys

### Requirement: Each provider has valid structure
Each provider in sources.js SHALL have: name (string), url (string or null), models (array), and optionally cliOnly/zenOnly flags.

#### Scenario: Validate provider structure
- **WHEN** the system loads sources.js
- **THEN** every provider entry has a valid name string
- **AND** url is either a valid URL string or null
- **AND** models is a non-empty array of model tuples

### Requirement: Model tuples include providerKey
Each model in MODELS array SHALL include the providerKey as the 6th element to enable routing.

#### Scenario: Check MODELS format
- **WHEN** MODELS is imported
- **THEN** each model entry is an array with 6 elements: [modelId, label, tier/score, ctx, providerKey]

### Requirement: Custom MRX providers work alongside FCM
The MRX custom providers (g4f, g4f_deepinfra) SHALL function identically to FCM providers in the routing system.

#### Scenario: Route to g4f provider
- **WHEN** user requests model "kimi-k2-thinking" with provider "g4f"
- **THEN** request is forwarded to http://192.168.1.196:7980/v1/chat/completions

### Requirement: Stability Score for QoS routing
The QoS scoring algorithm SHALL replicate FCM's Stability Score (0-100) which combines latency reliability metrics.

#### Formula: Stability Score
```
stabilityScore = 
  (100 - p95Latency * scale) * 0.30 +    // 30% - p95 latency penalty
  (100 - jitterPercent * scale) * 0.30 +  // 30% - variance/jitter penalty
  (100 - spikeRate * scale) * 0.20 +      // 20% - spike rate penalty
  uptimePercent * 0.20                      // 20% - uptime bonus
```

#### Metrics tracked per model:
- **p95Latency**: 95th percentile response time in seconds
- **jitterPercent**: Standard deviation as percentage of mean latency
- **spikeRate**: Percentage of requests exceeding 3x median latency
- **uptimePercent**: Successful requests / total requests

#### Scenario: Fast consistent model wins
- **GIVEN** Model A: p95=0.5s, jitter=5%, spike=2%, uptime=100%
- **AND** Model B: p95=5.0s, jitter=50%, spike=30%, uptime=95%
- **WHEN** Stability Score is calculated
- **THEN** Model A scores ~85 (low latency, consistent)
- **AND** Model B scores ~40 (slow, high variance)
- **AND** Model A wins decisively

#### Scenario: Model with occasional spikes loses to consistent model
- **GIVEN** Model A: p95=1.0s, jitter=10%, spike=5%, uptime=100% (consistent)
- **AND** Model B: p95=0.8s, jitter=60%, spike=40%, uptime=98% (fast but erratic)
- **WHEN** Stability Score is calculated
- **THEN** Model A scores ~75
- **AND** Model B scores ~50 (high jitter/spikes penalize heavily)
- **AND** Model A wins (consistent beats fast-but-unreliable)