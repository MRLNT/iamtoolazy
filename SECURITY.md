# Security Policy

## Reporting

Please report vulnerabilities privately via GitHub Security Advisories
("Report a vulnerability" on the repo's Security tab). No public issues
for exploitable bugs. Expect an acknowledgment within 72 hours.

## Scope & design posture

- **Everything runs locally.** No telemetry, no accounts, no network calls
  except the opt-in BYOK refine pass the user explicitly configures with
  their own API key. Keys are held by the consumer (extension storage /
  user env), never by this library, never logged.
- **Prompt safety invariants** (tested): protected spans byte-preserved;
  negations structurally impossible to remove; prompts never translated;
  compression never empties a prompt.
- **Claude Code hooks fail open**: any error exits 0 and leaves the prompt
  untouched; hooks never block, never execute prompt content, and write
  only to `~/.iamtoolazy/`.
- Supported versions: latest minor release.
