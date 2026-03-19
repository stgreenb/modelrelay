## ADDED Requirements

### Requirement: HTTP_PROXY environment variable respected
The system SHALL route all outbound HTTP requests through the proxy specified by the HTTP_PROXY environment variable when set.

#### Scenario: HTTP_PROXY set
- **WHEN** HTTP_PROXY env var is set to e.g. "http://proxy.example.com:8080"
- **THEN** all outbound API requests to providers SHALL use the specified proxy
- **AND** the proxy is used for both HTTP and HTTPS endpoints

### Requirement: HTTPS_PROXY environment variable respected
The system SHALL route all outbound HTTPS requests through the proxy specified by the HTTPS_PROXY environment variable when set.

#### Scenario: HTTPS_PROXY set
- **WHEN** HTTPS_PROXY env var is set to e.g. "http://proxy.example.com:8080"
- **THEN** all outbound HTTPS API requests SHALL use the specified proxy

### Requirement: NO_PROXY bypass
The system SHALL NOT use the proxy for hosts matching the NO_PROXY environment variable patterns.

#### Scenario: NO_PROXY set
- **WHEN** NO_PROXY env var is set (e.g., "localhost,*.local")
- **AND** a request is made to a host matching the pattern
- **THEN** the request is made directly without proxy

### Requirement: Proxy support documented
The system SHALL document proxy support in the README with examples.

#### Scenario: User checks docs
- **WHEN** user reads README.md
- **THEN** there is a section explaining HTTP_PROXY/HTTPS_PROXY/NO_PROXY support
- **AND** includes example configuration for corporate proxies