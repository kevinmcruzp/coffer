# Coffer

**A secure, local-first personal finance tracker — installable as a PWA.**

All your data is encrypted in the browser with AES-256-GCM. Nothing ever leaves your device — no account, no server, no cloud.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/kevincruz/coffer/actions/workflows/ci.yml/badge.svg)](https://github.com/kevincruz/coffer/actions/workflows/ci.yml)

---

## Features

- **Zero-server** — runs entirely in the browser, works offline
- **AES-256-GCM encryption** — your master password never leaves the device
- **PWA** — install on desktop or mobile, works without internet
- **Expenses & Income** — track monthly spending by category and payment method
- **Fixed expenses** — mark recurring bills, they clone automatically each month
- **Recurring income** — salary and other recurring sources clone month to month
- **Installment support** — track credit card parcelas with automatic countdown
- **Monthly summary** — balance, budget alerts, savings, and adjustments
- **Annual view** — full-year table with year-over-year comparison
- **Charts** — pie chart (fixed vs. others, debit vs. credit) and balance bar chart
- **Budget alerts** — set a monthly spending limit, get a badge when exceeded
- **Backup & restore** — export/import a single encrypted `.coffer` file
- **CSV import/export** — migrate from spreadsheets or share data
- **Auto-lock** — vault locks after configurable inactivity (5/15/30/60 min)
- **Quick-add** — add an expense in 3 taps from the header

---

## Why Coffer?

Most finance apps require an account, sync your data to a third-party server, or are behind a subscription. Coffer stores everything locally, encrypted with a key only you know. You own your data completely — there is no way to recover it if you forget your password, by design.

---

## Stack

| Layer | Technology |
|---|---|
| UI | React 19 + TypeScript (strict) |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| Storage | IndexedDB |
| Crypto | Web Crypto API — AES-256-GCM + PBKDF2 (200k iterations) |
| Offline | `vite-plugin-pwa` + Workbox |
| Testing | Vitest + React Testing Library |
| Validation | Zod |

---

## Getting started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Run tests
npm test

# Lint
npm run lint
```

---

## Security model

- The master password is used to derive an AES-256-GCM key via PBKDF2 (200 000 iterations, SHA-256, random salt).
- The derived key exists **only in memory** — it is never persisted anywhere.
- Every write to IndexedDB is encrypted. The salt and a verification token (also encrypted) are stored separately.
- **There is no password recovery.** If you forget your password, your data is unrecoverable. Export a `.coffer` backup and store it safely.
- The `.coffer` backup format is: `JSON → gzip → AES-256-GCM`. It is self-contained and readable only with your password.

---

## Roadmap

See [TODO.md](TODO.md) for the full backlog.

**Phase 2 (planned):**
- Desktop app via Tauri (macOS, Windows, Linux)
- Optional cloud sync (Google Drive / WebDAV) — the server only sees the encrypted file
- OFX/QIF import
- PDF export
- Light mode

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)

## Code of Conduct

[Contributor Covenant](CODE_OF_CONDUCT.md)
