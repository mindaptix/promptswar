# Automated tests and remaining verification

Run `npm ci`, then `npm test`. Run `npm run test:coverage` for terminal and HTML coverage (`coverage/index.html`). No production credentials are needed; tests never call a real AI provider or database.

## What these tests prove

- Route handlers execute with real Request/Response objects and isolated database/session/provider doubles.
- Login normalization, password rejection, signup hashing, duplicate checks, logout, and safe error messages.
- Earnings authentication, user-scoped query parameters, ignored forged owner, paise conversion, valid/invalid amounts, and bounded reads.
- AI authentication, configuration, question length/type, Hindi input, actual nested response parsing, empty output, upstream HTTP failures, invalid JSON, and network rejection.
- The real bcrypt and JWT implementations salt/verify passwords, reject tampering and expiration, and set secure cookie attributes.

Mock-based API tests do **not** prove actual database persistence, browser cookie behavior, accessibility, model answer quality, or deployed connectivity.

## Known-defect regression tests

The remaining `it.fails` cases are explicit known defects. A green expected-failure case means the bug was reproduced, **not that the requirement passed**. Once fixed, change it to `it` and rerun. The remaining cases cover malformed auth JSON, a null AI body, missing AI timeout, and duplicate signup races. Strict earnings validation, controlled database errors, production pool reuse, and schema retry are now passing regressions.

## Additional scenarios required before final submission

| Area | Scenario | Required verification |
| --- | --- | --- |
| Persistence | Create earnings, restart app, reload | Real isolated PostgreSQL instance |
| Isolation | Two users cannot read each other's earnings | Real database/API integration |
| Concurrency | Simultaneous signup with identical normalized email | Real database unique constraint |
| Connection lifecycle | Production pool reused, capped, idle connections released | Pool metrics/load test |
| Recovery | DB restart, connection refusal, schema initialization retry | Isolated integration environment |
| Sessions | Missing secret, forged/expired JWT, logout, cookie on HTTPS | Production config + browser |
| Abuse | Repeated login, cross-origin writes, oversized request | Security integration tests; protections not yet implemented |
| Money | Empty/null/boolean/array/object, infinity, overflow, precision | Extend regressions as validation is fixed |
| UI | Pending button, double submit, offline/network loss, refresh | Browser automation |
| Language | All labels, errors, AI output English/Hindi without mixed copy | Browser + live provider |
| Accessibility | Keyboard only, visible focus, live announcements, contrast | Automated accessibility scan + manual screen reader |
| AI quality | Grounding, source accuracy, missing facts, malicious document instructions | Reviewed live eval dataset |
| Documents | Supported upload, unsupported type, oversize, corrupt/empty text, PII | Implement workflow first |
| Complaints | Missing facts, editable draft, save/export, ownership | Implement workflow first |
| Welfare/safety | Verified sources, uncertain eligibility, emergency routing | Implement workflow first |
| Performance | Latency distributions, bounded memory, provider deadline | Measured load test, record environment and sample size |
| Deployment | Assets, HTTPS session, signup/login/save/reload, AI call | Public URL browser smoke test |

Do not claim unimplemented features or these outstanding checks have passed. Code coverage measures exercised lines, not completeness or judge score.

The PostgreSQL adapter suite additionally covers parameter binding, development pool reuse, concurrent schema initialization, and missing configuration. Its two expected failures reproduce production pool allocation and failed-initialization recovery defects. There are 11 expected-failure tests in total; they must not be counted as fixed functionality.

## Latest local verification (2026-10-17)

Vitest 5.0.5: **93 ordinary tests passed, 5 expected failures reproduced**, 98 total across four suites. Coverage for the configured API routes, earnings layers, and server utilities: 98.34% lines, 98.62% statements, 100% functions, and 91.34% branches. Expected-failure execution contributes to coverage; this is not a claim of correctness or full application coverage. The production build and lint checks passed.
