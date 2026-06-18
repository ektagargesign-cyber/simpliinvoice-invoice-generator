// ---------------------------------------------------------------------------
// Drive sync — stores ALL local data (seller profile, buyers, item catalog,
// invoice counters) as a single JSON file in the user's Drive, named
// `simpliinvoice-sync.json`. With the `drive.file` scope, this file is
// only visible to this app (and the user, if they go looking in their own
// Drive) — never any other file.
//
// Conflict handling is intentionally simple ("whole document, last write
// wins by timestamp") EXCEPT for invoice counters, which always merge by
// taking the HIGHER of local vs. remote per company. This guarantees a
// sync can never make a counter go backwards and risk issuing a duplicate
// invoice number — the exact bug already solved once for the local-only
// version.
// ---------------------------------------------------------------------------

import { exportAllData, importAllData, SyncableData } from "./storage";
import { getAccessToken } from "./googleAuth";

const FILE_NAME = "simpliinvoice-sync.json";
const FILE_ID_KEY = "simpliinvoice_drive_file_id";
const LAST_SYNCED_KEY = "simpliinvoice_last_synced_at";

interface SyncPayload {
  version: 1;
  updatedAt: string;
  data: SyncableData;
}

async function driveFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Drive API error ${res.status}: ${text}`);
  }
  return res;
}

async function findFileId(): Promise<string | null> {
  const cached = localStorage.getItem(FILE_ID_KEY);
  if (cached) return cached;

  const query = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name)`
  );
  const json = await res.json();
  const file = json.files?.[0];
  if (file) {
    localStorage.setItem(FILE_ID_KEY, file.id);
    return file.id;
  }
  return null;
}

async function downloadFile(fileId: string): Promise<SyncPayload | null> {
  try {
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
    return await res.json();
  } catch (err) {
    console.warn("Drive sync: couldn't read or parse the remote file, will treat as empty.", err);
    return null;
  }
}

async function uploadFile(fileId: string | null, payload: SyncPayload): Promise<string> {
  const boundary = "simpliinvoice-sync-boundary";
  const metadata = fileId ? {} : { name: FILE_NAME, mimeType: "application/json" };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n` +
    `--${boundary}--`;

  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

  const res = await driveFetch(url, {
    method: fileId ? "PATCH" : "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  const json = await res.json();
  localStorage.setItem(FILE_ID_KEY, json.id);
  return json.id;
}

function mergeCounters(local: Record<string, number>, remote: Record<string, number>): Record<string, number> {
  const merged: Record<string, number> = { ...local };
  for (const [slug, val] of Object.entries(remote)) {
    merged[slug] = Math.max(merged[slug] || 0, val);
  }
  return merged;
}

export interface SyncResult {
  direction: "pulled" | "pushed";
  syncedAt: string;
}

/**
 * Does a full sync: reads what's in Drive, compares against local data,
 * and reconciles. Safe to call as often as you like — it's the only
 * function the UI needs to call.
 */
export async function syncNow(): Promise<SyncResult> {
  const fileId = await findFileId();
  const remote = fileId ? await downloadFile(fileId) : null;
  const local = exportAllData();
  const now = new Date().toISOString();

  if (!remote) {
    // Nothing usable in Drive yet — seed it with local data.
    await uploadFile(fileId, { version: 1, updatedAt: now, data: local });
    localStorage.setItem(LAST_SYNCED_KEY, now);
    return { direction: "pushed", syncedAt: now };
  }

  const lastSynced = localStorage.getItem(LAST_SYNCED_KEY);
  const remoteIsNewer = !lastSynced || new Date(remote.updatedAt) > new Date(lastSynced);
  const mergedCounters = mergeCounters(local.counters, remote.data.counters || {});

  const finalData: SyncableData = remoteIsNewer
    ? { ...remote.data, counters: mergedCounters }
    : { ...local, counters: mergedCounters };

  if (remoteIsNewer) {
    importAllData(finalData);
  }

  await uploadFile(fileId, { version: 1, updatedAt: now, data: finalData });
  localStorage.setItem(LAST_SYNCED_KEY, now);
  return { direction: remoteIsNewer ? "pulled" : "pushed", syncedAt: now };
}

export function getLastSyncedAt(): string | null {
  return localStorage.getItem(LAST_SYNCED_KEY);
}
