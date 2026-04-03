/**
 * DSC (Digital Signature Certificate) USB Token Bridge
 *
 * Communicates with a local DSC signing service running on the user's machine.
 * Common Indian DSC middleware (emSigner, Sify RA, eMudhra CertiSign) expose a
 * local HTTP endpoint (default port 27372) that the browser can call to:
 *   1. List certificates on the plugged-in USB token
 *   2. Sign a hash / PDF blob with the selected certificate
 *
 * This module wraps that communication so the rest of the app stays decoupled.
 */

import type { DscSignatureInfo } from "./types";

const DEFAULT_PORT = 27372;

function baseUrl(port: number) {
  return `http://127.0.0.1:${port}`;
}

// ── Types returned by the local signing service ────────────────────

export interface DscCertificate {
  alias: string;        // token slot label / friendly name
  subject: string;      // full subject DN
  cn: string;           // common name extracted
  serial: string;       // hex serial
  issuer: string;       // issuer CN
  validFrom: string;    // ISO date
  validTo: string;      // ISO date
}

interface SignResponse {
  signature: string;    // base64-encoded PKCS#7 / CMS signature
  hash: string;         // SHA-256 hex of the signed digest
  certificate: {
    cn: string;
    serial: string;
    issuer: string;
    validFrom: string;
    validTo: string;
  };
}

// ── Bridge functions ───────────────────────────────────────────────

/** Check whether the local DSC signing service is reachable. */
export async function isDscServiceRunning(port = DEFAULT_PORT): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl(port)}/status`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** List all certificates available on the USB token. */
export async function listCertificates(port = DEFAULT_PORT): Promise<DscCertificate[]> {
  const res = await fetch(`${baseUrl(port)}/certificates`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`DSC service error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.certificates ?? [];
}

/**
 * Sign a PDF blob with the specified certificate.
 * Sends the raw PDF bytes to the local service; it returns the signed digest.
 */
export async function signPdf(
  pdfBlob: Blob,
  certAlias: string,
  port = DEFAULT_PORT,
): Promise<{ signedInfo: DscSignatureInfo }> {
  const arrayBuf = await pdfBlob.arrayBuffer();
  const base64Pdf = btoa(
    new Uint8Array(arrayBuf).reduce((s, b) => s + String.fromCharCode(b), ""),
  );

  const res = await fetch(`${baseUrl(port)}/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdf: base64Pdf, certAlias }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DSC signing failed: ${res.status} — ${text || res.statusText}`);
  }

  const data: SignResponse = await res.json();

  const signedInfo: DscSignatureInfo = {
    certHolder: data.certificate.cn,
    certSerial: data.certificate.serial,
    issuingCA: data.certificate.issuer,
    validFrom: data.certificate.validFrom,
    validTo: data.certificate.validTo,
    signedAt: new Date().toISOString(),
    signatureHash: data.hash,
  };

  return { signedInfo };
}
