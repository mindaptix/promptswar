# Automated tests and remaining verification

Run `npm ci`, then `npm test`. Run `npm run test:coverage` for terminal and HTML coverage (`coverage/index.html`). No credentials, network, Docker, or local PostgreSQL server are needed; tests never call a real AI provider.

| File | Scope |
| --- | --- |
| `earnings-domain.test.ts` | Earnings validation and rupee-to-paise conversion |
| `api.test.ts` | Route handlers with database, session, and provider doubles |
| `integration.test.ts` | Real routes, service, repository, and schema against in-process PostgreSQL (PGlite) |
| `documents-domain.test.ts` | Document format detection, UTF-8 decoding, passage splitting, and source grounding |
| `documents.test.ts` | Document upload, PDF extraction (unpdf), grounding, history, and isolation on PGlite; OpenAI HTTP is stubbed |
| `safety-welfare.test.ts` | Official-source links, bilingual copy, no eligibility or legal guarantees, scheme criteria comparison, helpline references |
| `postgres.test.ts` | Pool reuse, timeouts, TLS modes, schema retry, idle-client errors |
| `auth.test.ts` | Real bcrypt and JWT session implementation |

## What these tests prove

- Authorization: anonymous earnings and AI requests are rejected before any database or provider call.
- Cross-user isolation (real SQL): each user lists only their own entries, and a forged `userId` in the body is ignored.
- Duplicate signup: sequential duplicates after email normalization, and five concurrent signups producing exactly one account via the unique constraint. Removing the unique-violation handling makes the concurrent test fail.
- Invalid input: malformed JSON and non-object bodies for every route, wrong field types, negative, zero, oversized, and over-precise amounts; nothing is stored.
- Database failure: closed database returns 503 for earnings and 500 for auth without leaking internal messages.
- AI provider: missing key, HTTP errors, invalid JSON, network rejection, empty or whitespace output, and a hung provider aborted by the timeout (`OPENAI_TIMEOUT_MS`, default 20 s, 1–60 s) returning 504.
- The real bcrypt and JWT implementations salt/verify passwords, reject tampering and expiration, and set secure cookie attributes.
- Documents: 2 MB bound enforced on declared and undeclared (streamed) bodies; extension, MIME, and magic-byte agreement; invalid UTF-8, empty, scanned (no text), damaged, and over-30-page PDFs rejected before any AI call; document text sent as delimited untrusted data with a strict JSON schema and bounded tokens; AI points kept only when their quote appears in a cited passage; nothing saved on AI or grounding failure; other users get 404. Removing the quote check or the stream cap makes these tests fail.

These tests do **not** prove browser cookie behavior, behavior of a networked PostgreSQL server (TLS, pool limits, restarts), accessibility, model answer quality, or deployed connectivity.

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

The PostgreSQL adapter suite covers parameter binding, pool reuse in production, bounded timeouts, TLS modes, concurrent schema initialization, retry after a failed initialization, and idle-client errors. There are no expected-failure tests.

Documents, complaints, welfare, and safety now have automated coverage. A public-URL browser smoke test is still a manual check.
