## ADDED Requirements

### Requirement: FCM sync script exists
The system SHALL provide a sync-fcm script that downloads the latest sources.js from free-coding-models GitHub and saves it to the local sources.js file.

#### Scenario: Run sync script
- **WHEN** user runs `npm run sync-fcm` or `pnpm sync-fcm`
- **THEN** the script downloads sources.js from FCM GitHub raw URL
- **AND** saves it to ./sources.js in the project root
- **AND** displays success message with version/commit info

### Requirement: FCM sync validates output
The sync script SHALL validate that the downloaded sources.js is valid JavaScript that can be parsed as an ES module.

#### Scenario: Invalid download
- **WHEN** FCM GitHub returns non-JavaScript content
- **THEN** script exits with error code 1
- **AND** displays error message about invalid content
- **AND** does not overwrite existing sources.js

### Requirement: FCM sync is idempotent
Running sync multiple times SHALL produce the same result (same content) regardless of how many times called.

#### Scenario: Run sync twice
- **WHEN** user runs sync-fcm twice in succession
- **THEN** both runs succeed
- **AND** both produce identical sources.js content