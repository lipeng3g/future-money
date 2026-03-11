# Worklog

## 2026-03-11

### Goal
Improve AI config UX when users accidentally paste localhost / private network endpoints: provide clearer, actionable validation errors.

### What I did
- Enhanced AI base URL validation to surface **explicit “unsafe host”** errors (localhost / private IP ranges) before path checks.
- Extended unit tests to cover additional unsafe hosts (link-local and IPv6 ULA).

### Verification
- `npm test` (251 tests)

### Notes
- Minor environment/tooling gap: `rg` (ripgrep) is not installed in this environment; used `grep` as fallback.
