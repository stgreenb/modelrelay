## ADDED Requirements

### Requirement: Score override configuration source

The system SHALL support SWE score overrides from **either** a configuration file OR an environment variable, with the configuration file taking precedence.

#### Scenario: Config file takes precedence
- **GIVEN** config file `/app/config/score-overrides.json` exists with content `{"model-a": 0.80}`
- **AND** environment variable `MODELRELAY_SCORE_OVERRIDES` is set to `{"model-a": 0.90}`
- **THEN** `model-a` SHALL use score `0.80` (config file value)

#### Scenario: Environment variable fallback when no config file
- **GIVEN** config file `/app/config/score-overrides.json` does not exist
- **AND** environment variable `MODELRELAY_SCORE_OVERRIDES` is set to `{"model-b": 0.75}`
- **THEN** `model-b` SHALL use score `0.75`

#### Scenario: No overrides when neither source exists
- **GIVEN** neither config file nor environment variable are set
- **THEN** system SHALL use normal `scores.js` lookup flow

### Requirement: Configuration file format

The system SHALL parse the `/app/config/score-overrides.json` file as a JSON object mapping model IDs to score values (0.0 to 1.0).

#### Scenario: Valid config file
- **WHEN** config file contains valid JSON `{"deepseek-v4": 0.73}`
- **THEN** system creates override map with that entry

#### Scenario: Config file does not exist
- **WHEN** config file is not present
- **THEN** system SHALL silently skip file reading and check environment variable

#### Scenario: Invalid JSON in config file
- **WHEN** config file contains invalid JSON
- **THEN** system SHALL log warning and use empty override map

#### Scenario: Invalid score values in config file
- **WHEN** config file contains score value of 1.5 (out of range)
- **THEN** system SHALL ignore that entry, keep other valid entries

### Requirement: Environment variable override

The system SHALL parse the `MODELRELAY_SCORE_OVERRIDES` environment variable as a JSON object mapping model IDs to score values (0.0 to 1.0), used only if config file is not present.

#### Scenario: Valid JSON in environment variable
- **WHEN** `MODELRELAY_SCORE_OVERRIDES` is set to `'{"deepseek-v4": 0.73}'`
- **THEN** system creates override map with that entry

#### Scenario: Invalid JSON in env var is silently ignored
- **WHEN** `MODELRELAY_SCORE_OVERRIDES` is set to `'not valid json'`
- **THEN** system uses empty override map and logs warning

#### Scenario: Invalid score values in env var are ignored
- **WHEN** `MODELRELAY_SCORE_OVERRIDES` is set to `'{"model": 1.5}'` (value > 1)
- **THEN** system ignores that entry, override map is empty

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

### Requirement: Override works for dynamic models

The override SHALL apply to dynamically discovered models (KiloCode, OpenRouter, OpenAI-Compatible, OpenCode Zen) before the 0.45 default is applied.

#### Scenario: Dynamic model with config file override
- **WHEN** OpenAI-Compatible endpoint returns model `"my-ollama/deepseek-v4"` and config file contains `{"my-ollama/deepseek-v4": 0.68}`
- **THEN** model is assigned score `0.68` instead of default `0.45`

#### Scenario: Dynamic model with env var override
- **WHEN** KiloCode endpoint discovers a new model and env var contains its override
- **THEN** model is assigned the override score instead of default `0.45`

### Requirement: GitHub Actions integration

The system SHALL integrate with the existing GitHub Actions workflow that builds and distributes the Docker image to GHCR.

#### Scenario: Custom overrides applied in build
- **WHEN** GitHub Actions workflow runs
- **THEN** it SHALL download upstream modelrelay tarball
- **THEN** copy files from `custom-overrides/` directory to overwrite upstream equivalents
- **THEN** build Docker image with customized code
- **THEN** push image to GHCR with version tag

#### Scenario: scores.js remains unmodified
- **WHEN** custom-overrides files are copied
- **THEN** system SHALL NOT copy or modify `scores.js`
- **AND** upstream score updates from new releases SHALL flow through automatically

### Requirement: Documentation updated

The system SHALL include documentation for both configuration methods with clear examples.

#### Scenario: Docker-compose config file example
- **WHEN** user reads `docker-compose.yml`
- **THEN** they can see commented example using config file volume mount

#### Scenario: Docker-compose environment variable example
- **WHEN** user reads `docker-compose.yml`
- **THEN** they can see commented example using `MODELRELAY_SCORE_OVERRIDES` environment variable

#### Scenario: README explains both methods
- **WHEN** user reads `README.md`
- **THEN** they can find section explaining config file method (recommended for production)
- **AND** they can find section explaining environment variable method (for testing)
