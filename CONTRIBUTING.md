# Contributing to Coffer

Thank you for considering a contribution! Here is everything you need to get started.

## Running locally

```bash
git clone https://github.com/kevincruz/coffer.git
cd coffer
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

## Running tests

```bash
npm test          # run once
npm run test:watch  # watch mode
```

We use **Vitest** + **React Testing Library** + **fake-indexeddb** for integration tests. All new features must ship with tests.

## Code style

- **TypeScript strict** — no `any` without justification.
- **Tailwind CSS only** — no CSS modules, no styled-components.
- **No external crypto libs** — use the native Web Crypto API.
- **No `console.log`** in committed code.
- **No inline `TODO`** comments — use [TODO.md](TODO.md).
- Run `npm run lint` before opening a PR. ESLint must pass clean.

## Commit style — Conventional Commits

```
feat(scope): short description
fix(scope): short description
refactor(scope): short description
docs: short description
chore: short description
test(scope): short description
```

One purpose per commit. Keep the description under 72 characters.

## Opening an issue

- Use the [bug report](.github/ISSUE_TEMPLATE/bug_report.md) template for bugs.
- Use the [feature request](.github/ISSUE_TEMPLATE/feature_request.md) template for ideas.
- Check existing issues before opening a duplicate.

## Opening a pull request

1. Fork the repo and create a branch from `main`.
2. Write or update tests for your change.
3. Ensure `npm run lint`, `npm test`, and `npm run build` all pass.
4. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md).
5. Keep PRs focused — one feature or fix per PR.

## Security

**Never commit real financial data.** Tests use synthetic fixtures only.

If you find a security vulnerability, please open a private advisory rather than a public issue.
