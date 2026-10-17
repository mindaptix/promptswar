# Gig Worker Companion

Empty Next.js App Router scaffold. Features are intentionally unimplemented;
the home page renders a blank screen. No AI integration or persistence is connected.

## Development

```sh
npm install
npm run dev
```

Validation: `npm run lint`, `npm run build`.

## Structure

- `src/app/`: Next.js routes, layouts, and global styles; compose modules here.
- `src/modules/`: feature modules: worker-profile, earnings, assistant, safety,
  welfare, documents, and grievances.
- `src/shared/`: reusable UI, utilities, types, configuration, i18n, and server integrations.
- `public/`: static assets.

Each feature has four empty layers:

- `domain/`: entities, business rules, and repository/service interfaces. No React,
  Next.js, database, or AI SDK dependencies.
- `application/`: use cases depending on domain interfaces.
- `infrastructure/`: implementations of those interfaces, such as storage and AI adapters.
- `presentation/`: feature components and UI hooks calling application workflows.

Dependencies point inward: application depends on domain; infrastructure implements
interfaces defined inside; presentation uses application. Wire concrete adapters in
server-side route handlers or composition code, not in domain logic. Keep feature
business logic out of shared folders and avoid importing another feature's internals.

`@/*` resolves to `src/*`. `.gitkeep` files preserve empty directories in Git.
Keep API credentials and provider calls server-side; mark future server modules
with `server-only` and never expose secrets through `NEXT_PUBLIC_` variables.
