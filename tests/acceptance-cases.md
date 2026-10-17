# PromptWars acceptance test cases

These are the scenarios to run against a configured test database and test OpenAI key.

## Authentication

- Valid signup creates one user, hashes the password, sets an HTTP-only session cookie, and never returns the password.
- Duplicate email returns `409` and does not create another user.
- Invalid email and passwords shorter than eight characters return `400`.
- Valid login sets a session; wrong password returns `401` without revealing which field was wrong.
- Logout removes the session; protected endpoints then return `401`.
- Expired, malformed, or tampered cookies return `401`.

## Earnings

- Authenticated user can save positive income and expense amounts; returned totals are stored in paise.
- Earnings load after refresh and are ordered newest first.
- User A cannot read or write User B's entries.
- Zero income plus zero expense, negative numbers, non-numbers, and values above the allowed limit return `400`.
- Unauthenticated GET and POST return `401`.
- Database outage returns a safe `500` response without leaking connection details.

## AI assistant

- Authenticated Hindi question returns a Hindi response; English question returns English.
- Empty, non-string, and over-2000-character questions return `400`.
- Missing API key returns `503`; provider timeout or non-2xx response returns safe `502`.
- Provider response is dynamic for changed input and is never a canned UI string.
- Prompt instructs the model not to invent scheme eligibility or request passwords, OTPs, or API keys.
- Unauthenticated AI requests return `401`; the OpenAI key is never sent to the browser.

## UI and regression

- English mode contains English copy throughout; Hindi mode contains Hindi copy throughout.
- Login/signup form shows validation and server errors accessibly.
- Earnings form updates income, expense, and net totals after a successful save.
- AI shortcut chips populate the assistant field; send shows loading and then the response/error.
- Mobile layout has no horizontal overflow and retains accessible labels and touch targets.
- Leeado and Viralflight health checks remain HTTP 200 after deployment.
