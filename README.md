# signal-decryption-tool

Canonical **static** web client for Overnight Gap signals.

## What’s in the repo

| File | Purpose |
|------|---------|
| **`index.html`** | **Main app** — local OpenSSL `Salted__` decrypt (no account) + optional **Firebase Auth** + Cloud Function fetch (tiered). |
| **`decrypt-only.html`** | Original-style single-page decrypt only (paste base64 + password). |
| **`app.js`** | Auth + API + `CryptoJS` decrypt (set `firebaseConfig` + `FUNCTION_URL`). |
| **`styles.css`** | Shared layout. |
| **`crypto-js.min.js`** | Vendored library (offline-friendly). |

## Decrypt

- Paste **encrypted base64** (OpenSSL salted format) and **password**. All decryption runs in the browser; **nothing is sent** when you decrypt.
- **`decrypt-only.html`** is the minimal bookmark-friendly page.

## Members (Firebase)

1. In `app.js`, set **`firebaseConfig`** and **`FUNCTION_URL`** (your deployed `getSignal` HTTPS function).
2. Deploy with **Firebase Hosting** (see `OvernightGap/Firebase/firebase.json` → `public` points at this folder) or **GitHub Pages** from this repo.
3. **Base** tier: today’s signal. **Premium**: date-range fetch. Server enforces rules (auth, rate, IP logs).

## Repo layout

This project lives under `Automation_Project/OvernightGap/signal-decryption-tool` and is the **single source** for the public/client HTML. Push to `https://github.com/overnightspy/signal-decryption-tool`.
