/**
 * Canonical web client: optional Firebase Auth + signal API + OpenSSL Salted__ decrypt (CryptoJS).
 * Matches crypto in decrypt-only.html and github.com/overnightspy/signal-decryption-tool
 */
/* global CryptoJS */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const FUNCTION_URL = "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/getSignal";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const $ = (id) => document.getElementById(id);

function show(el, on) {
  if (!el) return;
  el.classList.toggle("hidden", !on);
}

async function authedFetchToken(url, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken();
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };
  return fetch(url, { ...options, headers });
}

function setPremiumUi(isPremium) {
  show($("premium-only"), !!isPremium);
}

onAuthStateChanged(auth, async (user) => {
  const loggedIn = !!user;
  show($("signal-section"), loggedIn);
  $("auth-status").textContent = "";
  $("session-email").textContent = loggedIn ? user.email : "";
  if (!loggedIn) return;

  try {
    const token = await user.getIdToken(true);
    const tier = readSubscriptionTierFromIdToken(token);
    setPremiumUi(tier === "premium");
  } catch {
    setPremiumUi(false);
  }
});

function readSubscriptionTierFromIdToken(token) {
  const part = token.split(".")[1];
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const claims = JSON.parse(atob(b64 + pad));
  return claims.subscriptionTier;
}

$("btn-login").addEventListener("click", async () => {
  $("auth-status").textContent = "";
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("login-password").value);
  } catch (e) {
    $("auth-status").textContent = e.message || String(e);
  }
});

$("btn-logout").addEventListener("click", () => signOut(auth));

$("btn-today").addEventListener("click", async () => {
  $("response").textContent = "Loading…";
  try {
    const res = await authedFetchToken(FUNCTION_URL, { method: "GET" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      $("response").textContent = JSON.stringify(body, null, 2);
      return;
    }
    const text = JSON.stringify(body, null, 2);
    $("response").textContent = text;
    tryFillEncryptedFromApiBody(body);
  } catch (e) {
    $("response").textContent = e.message || String(e);
  }
});

$("btn-historical").addEventListener("click", async () => {
  $("response").textContent = "Loading…";
  const startDate = $("hist-start").value.trim();
  const endDate = $("hist-end").value.trim();
  try {
    const res = await authedFetchToken(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      $("response").textContent = JSON.stringify(body, null, 2);
      return;
    }
    const text = JSON.stringify(body, null, 2);
    $("response").textContent = text;
    tryFillEncryptedFromApiBody(body);
  } catch (e) {
    $("response").textContent = e.message || String(e);
  }
});

function openSSLKeyIv(password, salt) {
  const pw = CryptoJS.enc.Utf8.parse(password);
  const d1 = CryptoJS.MD5(pw.clone().concat(salt));
  const d2 = CryptoJS.MD5(d1.clone().concat(pw).concat(salt));
  return { key: d1, iv: d2 };
}

function decryptOpenSslSaltedBase64(base64Input, password) {
  if (typeof CryptoJS === "undefined") {
    throw new Error("CryptoJS failed to load");
  }
  const raw = CryptoJS.enc.Base64.parse(base64Input.trim());
  if (raw.sigBytes < 16) {
    throw new Error("Data too short");
  }
  const words = raw.words;
  const magic = String.fromCharCode(
    (words[0] >>> 24) & 0xff,
    (words[0] >>> 16) & 0xff,
    (words[0] >>> 8) & 0xff,
    words[0] & 0xff,
    (words[1] >>> 24) & 0xff,
    (words[1] >>> 16) & 0xff,
    (words[1] >>> 8) & 0xff,
    words[1] & 0xff
  );
  if (magic !== "Salted__") {
    throw new Error("Not OpenSSL salted format (expected Salted__ header)");
  }
  const saltBytes = [];
  for (let i = 8; i < 16; i++) {
    saltBytes.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
  }
  const salt = CryptoJS.lib.WordArray.create(
    [(saltBytes[0] << 24) | (saltBytes[1] << 16) | (saltBytes[2] << 8) | saltBytes[3], (saltBytes[4] << 24) | (saltBytes[5] << 16) | (saltBytes[6] << 8) | saltBytes[7]],
    8
  );
  const ciphertext = CryptoJS.lib.WordArray.create(words.slice(4), raw.sigBytes - 16);
  const derived = openSSLKeyIv(password, salt);
  const decrypted = CryptoJS.AES.decrypt({ ciphertext }, derived.key, {
    iv: derived.iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const result = decrypted.toString(CryptoJS.enc.Utf8);
  return result || "";
}

function tryFillEncryptedFromApiBody(body) {
  if (!body || typeof body !== "object") return;
  if (typeof body.encryptedPayload === "string" && body.encryptedPayload) {
    $("dec-base64").value = body.encryptedPayload;
    return;
  }
  if (body.signals && typeof body.signals === "object") {
    const keys = Object.keys(body.signals).sort();
    if (keys.length === 1) {
      const first = body.signals[keys[0]];
      if (first && typeof first.encryptedPayload === "string") {
        $("dec-base64").value = first.encryptedPayload;
      }
    }
  }
}

$("btn-decrypt").addEventListener("click", () => {
  $("dec-out").textContent = "";
  const base64Input = $("dec-base64").value.trim();
  const password = $("dec-password").value;
  if (!base64Input || !password) {
    $("dec-out").textContent = "Enter encrypted base64 and password.";
    return;
  }
  try {
    const result = decryptOpenSslSaltedBase64(base64Input, password);
    $("dec-out").textContent = result || "Error: wrong password or bad data.";
  } catch (e) {
    $("dec-out").textContent = "Error: " + (e.message || String(e));
  }
});
