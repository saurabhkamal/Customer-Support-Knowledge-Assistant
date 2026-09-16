// Server-only. Never imported from a "use client" component.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "northlane_session";
export const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours, in seconds

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;

  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// A stateless, HMAC-signed cookie rather than a server-side session store.
// Deliberate: this app deploys to scale-to-zero / multi-instance platforms
// (Cloud Run, Container Apps), where an in-memory session store would not be
// shared across instances or survive a cold start.
export function createSessionToken(username: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");

  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${username}.${expires}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifySessionToken(token: string | undefined | null): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return null;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [username, expiresRaw, signature] = decoded.split(".");
    if (!username || !expiresRaw || !signature) return null;

    const payload = `${username}.${expiresRaw}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const actual = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (actual.length !== expectedBuf.length || !timingSafeEqual(actual, expectedBuf)) {
      return null;
    }

    if (Date.now() > Number(expiresRaw)) return null;
    return username;
  } catch {
    return null;
  }
}
