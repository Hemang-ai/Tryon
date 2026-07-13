import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "tryiton_session";
export const OAUTH_COOKIE = "tryiton_oauth";

export type GoogleUser = {
  id: string;
  email: string;
  name: string;
  picture: string | null;
};

type SessionPayload = GoogleUser & { exp: number };

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodeJson(value: unknown) {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJson<T>(value: string): T | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (character) => character.charCodeAt(0)))) as T;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

export async function userIdForEmail(email: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.trim().toLowerCase()));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createSessionToken(user: GoogleUser) {
  if (!env.AUTH_SECRET) throw new Error("AUTH_SECRET is not configured");
  const payload = encodeJson({ ...user, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 });
  return `${payload}.${await sign(payload, env.AUTH_SECRET)}`;
}

export async function readSessionToken(token: string | undefined): Promise<GoogleUser | null> {
  if (!token || !env.AUTH_SECRET) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !constantTimeEqual(signature, await sign(payload, env.AUTH_SECRET))) return null;
  const session = decodeJson<SessionPayload>(payload);
  if (!session || session.exp <= Math.floor(Date.now() / 1000)) return null;
  return { id: session.id, email: session.email, name: session.name, picture: session.picture };
}

export async function getGoogleUser() {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function verifyGoogleIdToken(token: string) {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    const header = decodeJson<{ alg?: string; kid?: string }>(encodedHeader);
    if (!header?.kid || header.alg !== "RS256" || !encodedPayload || !encodedSignature) return null;
    const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", { cf: { cacheTtl: 3600, cacheEverything: true } });
    if (!response.ok) return null;
    const keys = await response.json() as { keys?: JsonWebKey[] };
    const jwk = keys.keys?.find((key) => key.kid === header.kid && key.kty === "RSA");
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodeBase64Url(encodedSignature), new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));
    return valid ? decodeJson<Record<string, unknown>>(encodedPayload) : null;
  } catch {
    return null;
  }
}

export function randomUrlSafe(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64Url(value);
}

export async function sha256UrlSafe(value: string) {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}
