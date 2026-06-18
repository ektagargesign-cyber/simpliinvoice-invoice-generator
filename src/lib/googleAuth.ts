// ---------------------------------------------------------------------------
// Google Drive auth, via Google Identity Services (GIS) — no backend needed.
//
// Uses the `drive.file` scope only: the app can read/write ONLY the one
// sync file it creates itself, never the rest of the user's Drive. This
// scope is classified by Google as "non-sensitive," which means a much
// simpler public-verification path later (no demo video, no security
// review) compared to broader Drive scopes.
//
// Limitation worth knowing: this flow issues a short-lived access token
// (~1 hour) with no refresh token, since there's no backend to securely
// hold one. Browsers are also increasingly restrictive about silent
// re-auth across sessions (third-party cookie changes), so after closing
// the tab for a while, the user may need to click "Connect" again rather
// than it happening invisibly. That's expected, not a bug.
// ---------------------------------------------------------------------------

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const SCOPE = "https://www.googleapis.com/auth/drive.file";

const TOKEN_KEY = "simpliinvoice_gdrive_token";
const TOKEN_EXP_KEY = "simpliinvoice_gdrive_token_exp";

declare global {
  interface Window {
    google?: any;
  }
}

let gisLoadPromise: Promise<void> | null = null;
let tokenClient: any = null;

function loadGis(): Promise<void> {
  if (gisLoadPromise) return gisLoadPromise;
  gisLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
  return gisLoadPromise;
}

function getStoredToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const exp = sessionStorage.getItem(TOKEN_EXP_KEY);
  if (!token || !exp) return null;
  if (Date.now() >= Number(exp)) return null;
  return token;
}

function storeToken(token: string, expiresInSeconds: number): void {
  // Treat the token as expiring 60s early, so we never try to use one
  // that's about to be rejected mid-request.
  const exp = Date.now() + (expiresInSeconds - 60) * 1000;
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(TOKEN_EXP_KEY, String(exp));
}

/** Whether we currently hold a usable (non-expired) access token. */
export function isConnected(): boolean {
  return !!getStoredToken();
}

/** Clears the local token and revokes it with Google. */
export function disconnect(): void {
  const token = sessionStorage.getItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXP_KEY);
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => {});
  }
}

async function requestToken(interactive: boolean): Promise<string> {
  await loadGis();
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: () => {}, // replaced per-call below
      });
    }
    tokenClient.callback = (response: any) => {
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      storeToken(response.access_token, response.expires_in);
      resolve(response.access_token);
    };
    // "consent" forces the picker/popup; "" attempts a silent grant using
    // an existing Google session, which only works if one is active and
    // the user has already approved this app before.
    tokenClient.requestAccessToken({ prompt: interactive ? "consent" : "" });
  });
}

/** Interactive sign-in. Call this directly from a button's onClick. */
export async function connect(): Promise<string> {
  return requestToken(true);
}

/**
 * Returns a valid access token, attempting a silent refresh first.
 * Throws if the user isn't connected and no popup was requested — callers
 * doing a "quiet" background sync should catch this and simply skip.
 */
export async function getAccessToken(): Promise<string> {
  const cached = getStoredToken();
  if (cached) return cached;
  return requestToken(false);
}
