# Coffer

Secure, local-first, offline-capable personal finance manager — installable as a PWA.

All data is encrypted in the browser using AES-256-GCM. Nothing ever leaves your device.

## Stack

- Vite 8 + React 19 + TypeScript
- Tailwind CSS v4
- PWA via `vite-plugin-pwa`
- IndexedDB + Web Crypto API (AES-256-GCM + PBKDF2)

## Development

```bash
npm install
npm run dev
```
