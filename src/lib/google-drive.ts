// Google Drive backup/restore via Google Identity Services (GIS) + Drive REST API v3
// No server needed — runs entirely in the browser.
//
// Setup:
// 1. Go to https://console.cloud.google.com
// 2. Create a project, enable "Google Drive API"
// 3. Create an OAuth 2.0 Client ID (Web application)
// 4. Add http://localhost:3000 (and your production URL) to Authorized JavaScript origins
// 5. Paste the Client ID below

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const SCOPES = "https://www.googleapis.com/auth/drive.file";
const BACKUP_FILENAME = "challenger-industries-backup.json";
const BACKUP_MIME = "application/json";

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;

// ---------- GIS Script Loader ----------

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureGis(): Promise<void> {
  await loadScript("https://accounts.google.com/gsi/client");
}

// ---------- Auth ----------

function requestAccessToken(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    await ensureGis();

    if (!CLIENT_ID) {
      reject(new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. See Settings → Google Drive for setup instructions."));
      return;
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error_description ?? resp.error));
          return;
        }
        accessToken = resp.access_token;
        resolve(resp.access_token);
      },
    });
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

async function getToken(): Promise<string> {
  if (accessToken) return accessToken;
  return requestAccessToken();
}

export function revokeAccess() {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {});
    accessToken = null;
  }
}

export function isConfigured(): boolean {
  return !!CLIENT_ID;
}

// ---------- Drive helpers ----------

async function driveRequest(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    // Token expired — get a fresh one and retry once
    accessToken = null;
    const newToken = await requestAccessToken();
    return fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${newToken}`,
        ...init?.headers,
      },
    });
  }
  return res;
}

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

/** Find the most recent backup file in the user's Drive */
async function findBackup(): Promise<DriveFile | null> {
  const q = encodeURIComponent(
    `name='${BACKUP_FILENAME}' and mimeType='${BACKUP_MIME}' and trashed=false`,
  );
  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=1&fields=files(id,name,modifiedTime)`,
  );
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
  const data = await res.json();
  return data.files?.[0] ?? null;
}

// ---------- Public API ----------

/** Gather all challenger-* localStorage data */
function gatherBackupData(): Record<string, string | null> {
  const data: Record<string, string | null> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("challenger-")) {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
}

/** Upload a backup to Google Drive (creates or updates the file) */
export async function backupToDrive(): Promise<{ modifiedTime: string }> {
  const payload = JSON.stringify(gatherBackupData(), null, 2);
  const existing = await findBackup();

  const metadata = {
    name: BACKUP_FILENAME,
    mimeType: BACKUP_MIME,
  };

  // Multipart upload (metadata + content)
  const boundary = "challenger_backup_boundary";
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\nContent-Type: ${BACKUP_MIME}\r\n\r\n` +
    payload +
    `\r\n--${boundary}--`;

  let url: string;
  let method: string;
  if (existing) {
    // Update existing file
    url = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart&fields=id,modifiedTime`;
    method = "PATCH";
  } else {
    // Create new file
    url = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime`;
    method = "POST";
  }

  const res = await driveRequest(url, {
    method,
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive upload failed (${res.status}): ${text}`);
  }

  const result = await res.json();
  return { modifiedTime: result.modifiedTime };
}

/** Download and restore the latest backup from Google Drive */
export async function restoreFromDrive(): Promise<{ modifiedTime: string; keyCount: number }> {
  const file = await findBackup();
  if (!file) throw new Error("No backup found on Google Drive");

  const res = await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
  );
  if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);

  const data = await res.json();
  let keyCount = 0;
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith("challenger-") && typeof value === "string") {
      localStorage.setItem(key, value);
      keyCount++;
    }
  }

  return { modifiedTime: file.modifiedTime, keyCount };
}

/** Check when the last backup was made (without downloading it) */
export async function getLastBackupTime(): Promise<string | null> {
  const file = await findBackup();
  return file?.modifiedTime ?? null;
}
