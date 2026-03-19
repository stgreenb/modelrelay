## ADDED Requirements

### Requirement: Upstream remotes configured
The git repository SHALL have both origin and upstream remotes configured for tracking both MRX and modelrelay upstream.

#### Scenario: Check remotes
- **WHEN** user runs `git remote -v`
- **THEN** output shows origin pointing to MRX fork (github.com/stevex/mrx)
- **AND** output shows upstream pointing to modelrelay (github.com/ellipticmarketing/modelrelay)

### Requirement: Upstream fetch available
The system SHALL allow fetching latest from upstream modelrelay with `git fetch upstream`.

#### Scenario: Fetch upstream
- **WHEN** user runs `git fetch upstream`
- **THEN** all branches and tags from modelrelay are fetched
- **AND** no errors are displayed

### Requirement: Package.json tracks upstream version
The package.json SHALL include a field indicating the upstream modelrelay version this MRX version is based on.

#### Scenario: Check version tracking
- **WHEN** user reads package.json
- **THEN** there is an "upstreamVersion" field with the modelrelay version (e.g., "1.10.1")