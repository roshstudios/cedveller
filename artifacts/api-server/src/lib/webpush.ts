// Dependency-free Web Push (RFC 8030 + RFC 8291 aes128gcm + VAPID RFC 8292).
import { createECDH, createPrivateKey, createCipheriv, hkdfSync, randomBytes, sign } from "node:crypto";

const b64u = (b: Buffer) => b.toString("base64url");
const fromB64u = (s: string) => Buffer.from(s, "base64url");

export type VapidKeys = { publicKey: string; privateKey: string };
export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export function generateVapidKeys(): VapidKeys {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return { publicKey: b64u(ecdh.getPublicKey()), privateKey: b64u(ecdh.getPrivateKey()) };
}

export function vapidJwt(audience: string, subject: string, keys: VapidKeys, nowSec = Math.floor(Date.now() / 1000)) {
  const pub = fromB64u(keys.publicKey);
  const key = createPrivateKey({
    key: { kty: "EC", crv: "P-256", x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)), d: keys.privateKey },
    format: "jwk",
  });
  const enc = (o: object) => b64u(Buffer.from(JSON.stringify(o)));
  const input = `${enc({ typ: "JWT", alg: "ES256" })}.${enc({ aud: audience, exp: nowSec + 12 * 3600, sub: subject })}`;
  const sig = sign("sha256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" });
  return `${input}.${b64u(sig)}`;
}

/** Encrypts a payload for one subscription (single aes128gcm record). `fixed` is for tests only. */
export function encryptPayload(target: Pick<PushTarget, "p256dh" | "auth">, payload: Buffer, fixed?: { salt: Buffer; asPrivate: Buffer }) {
  const uaPublic = fromB64u(target.p256dh);
  const authSecret = fromB64u(target.auth);
  if (uaPublic.length !== 65 || uaPublic[0] !== 4 || authSecret.length !== 16) throw new Error("Invalid push subscription keys");
  if (payload.length > 3800) throw new Error("Payload too large");
  const as = createECDH("prime256v1");
  if (fixed) as.setPrivateKey(fixed.asPrivate); else as.generateKeys();
  const asPublic = as.getPublicKey();
  const shared = as.computeSecret(uaPublic);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", shared, authSecret, keyInfo, 32));
  const salt = fixed?.salt ?? randomBytes(16);
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
}

export type SendResult = { ok: boolean; status: number; gone: boolean };

export async function sendPush(target: PushTarget, message: object, keys: VapidKeys, opts: { subject: string; ttl?: number; urgency?: "normal" | "high" }): Promise<SendResult> {
  const url = new URL(target.endpoint);
  const jwt = vapidJwt(url.origin, opts.subject, keys);
  const res = await fetch(target.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${keys.publicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(opts.ttl ?? 900),
      Urgency: opts.urgency ?? "normal",
    },
    body: encryptPayload(target, Buffer.from(JSON.stringify(message))),
    signal: AbortSignal.timeout(8000),
  });
  return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
}

const ALLOWED_HOSTS = [".googleapis.com", ".push.services.mozilla.com", ".mozaws.net", ".push.apple.com", ".notify.windows.com"];
export function isAllowedEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && !u.port && ALLOWED_HOSTS.some((h) => u.hostname.endsWith(h));
  } catch { return false; }
}
