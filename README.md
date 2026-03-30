# signal-decryption-tool

Canonical **static** web client for Overnight Gap: **local decrypt** (no server) plus an optional **member portal** (Firebase Auth + `getSignal`).

Repo: **https://github.com/overnightspy/signal-decryption-tool** (single branch: `main`).

## Files

| File | Purpose |
|------|---------|
| **`index.html`** | Main app: manual decrypt + member sign-in + “today” / premium range fetch. |
| **`decrypt-only.html`** | Minimal page: paste OpenSSL `Salted__` base64 + password only (original-style). |
| **`app.js`** | Firebase Auth, `fetch` to **`FUNCTION_URL`**, shared CryptoJS decrypt. |
| **`styles.css`** | Layout. |
| **`crypto-js.min.js`** | Vendored CryptoJS (no CDN required for crypto). |

## Decrypt (no account)

- Format: **OpenSSL salted** base64 (`Salted__` header), same as **`openssl enc -aes-256-cbc -salt`** style payloads.
- All decryption runs **in the browser**; passwords are not sent to Firebase for decrypt.

## Members (Firebase)

Configured in **`app.js`**: **`firebaseConfig`** (web app) and **`FUNCTION_URL`** (deployed `getSignal` HTTPS URL; Gen 2 may use a **\*.run.app** host).

**Console checklist**

- Authentication → **Email/Password** enabled.
- **Authorized domains**: your Hosting domain(s), **localhost** for dev, and any **GitHub Pages** host if you use Pages.

## Hosting options

### Firebase Hosting (recommended with backend)

Firebase project files live next to this folder in the monorepo: **`Automation_Project/OvernightGap/`**.

```bash
cd /path/to/Automation_Project/OvernightGap
firebase deploy --only hosting
```

(`firebase.json` sets **`public`** to **`signal-decryption-tool`**.)

### GitHub Pages

Push this repo to **`main`** and enable Pages from the repo root **`/`** → default site is **`index.html`**.

Admin operations (create users, push encrypted signals, logs) use the **local admin CLI** documented in the monorepo: **`OvernightGap/Firebase/admin-cli/README.md`**.

## Local monorepo path (development)

If you use the full **Automation_Project** tree, this repo is usually checked out at:

`Automation_Project/OvernightGap/signal-decryption-tool`

Keep GitHub **`main`** in sync with that directory when you ship client changes.
