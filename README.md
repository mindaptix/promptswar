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

## Architecture

- `src/app/api`: thin HTTP route handlers for authentication, earnings, and AI.
- `src/modules/earnings/domain`: money validation and business rules.
- `src/modules/earnings/application`: earnings use cases.
- `src/modules/earnings/infrastructure`: parameterized PostgreSQL persistence.
- `src/modules/home` and `src/modules/auth`: bilingual presentation components.
- `src/shared/server`: signed sessions and bounded PostgreSQL pooling.

Earnings are stored as integer paise. Requests reject malformed JSON, non-number values, negatives, amounts over ₹10,00,000, precision beyond two decimals, and entries with no income or expense. Queries are always scoped to the authenticated user.

The PostgreSQL client keeps one process-wide pool with bounded pool size, connection timeout, idle timeout, query timeout, and statement timeout. Schema initialization is shared across concurrent requests and becomes retryable after a transient failure.

## PostgreSQL TLS

Local database hosts default to `POSTGRES_SSL_MODE=disable`. Remote hosts default to `verify-full`, which validates the server certificate. `POSTGRES_CA_CERT` accepts a PEM certificate with escaped newlines. Use `POSTGRES_SSL_MODE=require` only when a provider cannot supply a verifiable certificate chain; this encrypts traffic but does not verify the server identity.

Connection-string TLS parameters are normalized into the application configuration so they cannot silently replace the reviewed TLS object. See `.env.example` for supported limits.

## Tests

The suite uses real Request/Response objects with isolated persistence, session, and provider doubles. It also exercises real bcrypt and JWT behavior plus earnings domain rules and PostgreSQL configuration. Tests never call the paid AI API. See `tests/README.md` for coverage scope, known defects, and live checks still required.

The deployed smoke test must cover login, an authenticated earnings read, English AI output, Hindi AI output, and rejection of an unauthenticated AI request.
