# Contributing to Future Money

Welcome! This document provides a checklist for contributors to ensure quality and consistency.

## Pull Request Checklist

Before submitting a PR, verify the following:

### 1. Tests Pass
```bash
npm test
npm run type-check
npm run build
```

### 2. Code Quality
- [ ] No new lint warnings introduced
- [ ] New components/utils have unit tests
- [ ] Tests are meaningful (not just coverage for coverage's sake)

### 3. Security Considerations (for AI/API changes)
- [ ] New URLs/hosts are validated through `ai-proxy-guard`
- [ ] No hardcoded secrets or credentials
- [ ] Environment variables documented in `.env.example` if added

### 4. Documentation
- [ ] README updated if user-facing features changed
- [ ] Complex logic has code comments explaining the "why"

### 5. Commit Messages
- Use [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat:` new feature
  - `fix:` bug fix
  - `test:` adding/updating tests
  - `docs:` documentation only
  - `ci:` CI/CD changes
  - `chore:` maintenance
  - Example: `feat(ai): add retry logic for empty_stream`

## Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml). Include:
- Minimal reproduction steps
- Browser/OS information
- Console/Network logs
- For AI issues: provider/model/traceId/http status

## Development Setup

```bash
npm install
npm test        # Run tests
npm run build  # Production build
npm run smoke  # Browser smoke tests
```

## Questions?

Open an issue for discussion before starting major changes.