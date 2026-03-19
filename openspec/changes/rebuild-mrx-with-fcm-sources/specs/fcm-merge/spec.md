## ADDED Requirements

### Requirement: FCM merge preserves MRX providers
The system SHALL ensure that MRX custom providers (g4f, iflow, g4f_deepinfra) are always present in sources.js after any FCM sync operation.

#### Scenario: After FCM sync
- **WHEN** user runs sync-fcm
- **THEN** the resulting sources.js MUST include g4f provider with URL http://192.168.1.196:7980/v1/chat/completions
- **AND** MUST include iflow provider with URL https://apis.iflow.cn/v1/chat/completions
- **AND** MUST include g4f_deepinfra provider with URL http://192.168.1.196:7980/api/deepinfra/chat/completions

### Requirement: FCM merge adds MRX models to providers
Each MRX custom provider SHALL include its defined model list from the MRX fork.

#### Scenario: Check iflow models
- **WHEN** sources.js is generated after merge
- **THEN** the iflow provider MUST include models: iflow-rome-30ba3b, qwen3-coder-plus, qwen3-max, qwen3-vl-plus, kimi-k2-0905, qwen3-max-preview, glm-4.6, kimi-k2, deepseek-v3.2, deepseek-r1, deepseek-v3, qwen3-32b, qwen3-235b-a22b-thinking-2507, qwen3-235b-a22b-instruct, qwen3-235b

### Requirement: FCM merge handles existing providers
The merge process SHALL NOT duplicate providers that exist in both FCM and MRX - it SHALL use FCM's version.

#### Scenario: Provider overlap
- **WHEN** FCM sources.js has iflow provider AND MRX also defines iflow
- **THEN** the merged result uses FCM's iflow configuration
- **AND** MRX-specific models are appended to FCM's model list