# Coffer

**A secure, local-first personal finance tracker for your desktop.**

Your finances live in a single encrypted file (`.coffer`) that you keep wherever you like. Nothing ever leaves your device — no account, no server, no cloud.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/kevinmcruzp/coffer/actions/workflows/ci.yml/badge.svg)](https://github.com/kevinmcruzp/coffer/actions/workflows/ci.yml)

---

## Features

- **Zero-server** — a desktop app that works fully offline
- **Your data is a file** — one `.coffer` vault file you can copy, back up, or keep in a synced folder
- **AES-256-GCM encryption** — your master password never leaves the device
- **Expenses & Income** — track monthly spending by category and payment method
- **Copy from previous month** — pick which recurring bills and incomes to bring forward
- **Month closing** — carry a month's balance into the next one, with an audit trail
- **Installment support** — track credit card parcelas with automatic countdown
- **Monthly summary** — balance, budget alerts, savings, and adjustments
- **Annual view** — full-year table with year-over-year comparison
- **Charts** — pie chart (fixed vs. others, debit vs. credit) and balance bar chart
- **Budget alerts** — set a monthly spending limit, get a badge when exceeded
- **Backup & restore** — save a single encrypted backup file wherever you choose, and restore from it
- **Previous versions** — the last three sessions are kept next to the vault as `.bak` files
- **CSV import** — bring your months over from a spreadsheet
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
| Desktop shell | Tauri 2 (Rust) |
| Storage | A single vault file, written atomically |
| Crypto | Web Crypto API — AES-256-GCM + PBKDF2 (200k iterations) |
| Testing | Vitest + React Testing Library |
| Validation | Zod |

---

## Install

Download the installer for your system from the [Releases](https://github.com/kevinmcruzp/coffer/releases) page and run it.

The installers are not code-signed yet, so Windows shows a "Windows protected your PC" (SmartScreen) notice the first time: choose **More info → Run anyway**.

On first launch Coffer asks where to keep your vault file. Pick any folder — Documents, a synced folder, a USB drive — then create your master password.

---

## Development

Requirements: Node.js, [Rust](https://rustup.rs) and, on Windows, the Microsoft C++ Build Tools.

```bash
# Install dependencies
npm install

# Run the desktop app with hot reload
npm run desktop:dev

# Build the installer (src-tauri/target/release/bundle)
npm run desktop:build

# Checks
npm run typecheck
npm run lint
npm test
cargo test --manifest-path src-tauri/Cargo.toml
```

Coffer is a desktop app only: `npm run dev` just serves the UI for the desktop shell, and a plain browser tab cannot open a vault.

### Releasing

1. Set the new version in `src-tauri/tauri.conf.json` and commit it.
2. Tag that commit and push the tag: `git tag v0.2.0 && git push origin v0.2.0`.
3. The `Release` workflow builds the Windows installer and attaches it to a **draft** release.
4. Download and try the installer, then publish the draft on GitHub.

---

## Security model

- The master password is used to derive an AES-256-GCM key via PBKDF2 (200 000 iterations, SHA-256, random salt).
- The derived key exists **only in memory** — it is never persisted anywhere.
- Month data is encrypted before it is written to the vault file. The file also holds the salt and an encrypted verification token, so the file plus your password is all that is needed to open it anywhere. Month names and app settings (such as the auto-lock time) are not secret and are stored unencrypted.
- The desktop shell can only read and write vault files (`*.coffer` and their `.tmp` / `.bak` siblings); the app makes no network requests.
- **There is no password recovery.** If you forget your password, your data is unrecoverable.
- The backup export format is: `JSON → gzip → AES-256-GCM`. It is self-contained and readable only with your password.

---

## Roadmap

See [TODO.md](TODO.md) for the full backlog.

**Planned:**
- macOS and Linux installers
- Signed installers and auto-update
- OFX/QIF import
- PDF export

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)

## Code of Conduct

[Contributor Covenant](CODE_OF_CONDUCT.md)
