# Gig Worker Companion

A bilingual web application for delivery partners, drivers, and informal workers. It provides secure accounts, persistent earnings and expense tracking, and a real OpenAI-powered assistant for practical guidance.

## Run locally

```sh
npm install
cp .env.example .env.local
npm run dev
```

Set `DATABASE_URL`, a strong `AUTH_SECRET`, and `OPENAI_API_KEY` in `.env.local`. Secrets stay on the server and must never use the `NEXT_PUBLIC_` prefix.

Useful checks:

```sh
npm run lint
npm run test:coverage
npm run build
```

Earnings are stored as integer paise. Requests reject malformed JSON, non-number values, negatives, amounts over ₹10,00,000, precision beyond two decimals, and entries with no income or expense. Queries are always scoped to the authenticated user.

The PostgreSQL client keeps one process-wide pool with bounded pool size, connection timeout, idle timeout, query timeout, and statement timeout. Schema initialization is shared across concurrent requests and becomes retryable after a transient failure.

## PostgreSQL TLS

Local database hosts default to `POSTGRES_SSL_MODE=disable`. Remote hosts default to `verify-full`, which validates the server certificate. `POSTGRES_CA_CERT` accepts a PEM certificate with escaped newlines. Use `POSTGRES_SSL_MODE=require` only when a provider cannot supply a verifiable certificate chain; this encrypts traffic but does not verify the server identity.

Connection-string TLS parameters are normalized into the application configuration so they cannot silently replace the reviewed TLS object. See `.env.example` for supported limits.

## What the app does

- Accounts: email and password, bcrypt hashes, HTTP-only session cookie. Production refuses to start session signing unless `AUTH_SECRET` is at least 32 characters.
- Earnings: rupees are validated and stored as integer paise, always for the signed-in user.
- Documents: PDF and `.txt` uploads up to 2 MB. Text is extracted, split into numbered passages, and an explanation is kept only when each point quotes a passage it cites. The original text stays on screen.
- Complaints: facts are collected, missing details stay as placeholders, and the draft is editable, downloadable, and saved for that user. A template works with no AI. An AI draft is checked for numbers that were not in the facts.
- Schemes and safety: official pages and helplines, with the review date. The app never says someone is eligible and never states a legal guarantee.
- Assistant: the selected language, saved earnings totals, and uploaded file names are added to the request. Document text is treated as untrusted data. Each provider call has a deadline (`OPENAI_TIMEOUT_MS`, default 20 seconds).

## Architecture

Dependencies point inward. Domain modules do not import React, Next.js, or the database. Routes are thin: they check the session, the origin, and the rate limit, then call an application function.

| Path | Role |
| --- | --- |
| `src/modules/earnings` | Money rules and per-user persistence |
| `src/modules/documents` | Upload rules, extraction, source check, storage |
| `src/modules/complaints` | Fact rules, template and AI draft, storage |
| `src/modules/welfare` | Scheme list and criteria comparison |
| `src/modules/safety` | Situation steps and helplines |
| `src/shared/server` | Postgres pool, sessions, OpenAI client, request guards |

Schema is created by `ensureSchema` in `src/shared/server/postgres.ts`: `users`, `earnings`, `documents`, and `complaints`. A failed initialization is retried on the next request. One pool is reused in every environment, with a listener so a dropped idle connection does not crash the process.

## Security and limits

Mutations reject a browser `Origin` that does not match the request host. Login and signup are limited to 20 requests a minute per address, AI routes to 30, and other writes to 60. Errors are logged as a scope plus the error message, without the request body or a stack trace. Upload and JSON bodies are capped. Database queries and AI calls have deadlines.

## Efficiency

The pool is capped (`POSTGRES_POOL_MAX`, default 10) and idle connections are closed (`POSTGRES_IDLE_TIMEOUT_MS`, default 10 seconds). Query and statement timeouts default to 10 seconds. AI calls abort at 20 seconds. Lists are limited to 100 earnings rows and 50 documents or complaints. Scheme and safety content is static data, not a model call. `tests/performance.test.ts` checks that each of these finishes in under one second and stays under 256 MB of heap. Measured on this machine (Node, one local run of that file on 17 Oct 2026):

| Work | Iterations | Time | Heap after |
| --- | ---: | ---: | ---: |
| Earnings validation | 20,000 | 14.2 ms | 13.1 MB |
| Scheme criteria comparison | 20,000 | 30.4 ms | 12.6 MB |
| Complaint template | 5,000 | 15.0 ms | 11.4 MB |
| Document passage split | 2,000 | 55.2 ms | 12.0 MB |

That is a local CPU budget, not a production load test. Pool size, idle timeout, query timeout, and the AI deadline are the production bounds.

## Tests

`npm test` uses Vitest. Persistence tests run real SQL on PGlite (PostgreSQL compiled to WebAssembly), so Docker is not required. AI tests stub the provider and never spend API credit. See `tests/README.md`.

```sh
npm test
npm run test:coverage
npm run lint
npm run build
```
