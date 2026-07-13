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

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodeJson(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJson<T>(value: string): T | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (character) => character.charCodeAt(0)))) as T;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

export async function createSessionToken(user: GoogleUser): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const payload = encodeJson({ ...user, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 });
  return `${payload}.${await sign(payload, secret)}`;
}

export async function readSessionToken(token: string | undefined): Promise<GoogleUser | null> {
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !constantTimeEqual(signature, await sign(payload, secret))) return null;
  const session = decodeJson<SessionPayload>(payload);
  if (!session || session.exp <= Math.floor(Date.now() / 1000)) return null;
  return { id: session.id, email: session.email, name: session.name, picture: session.picture };
}

export async function getGoogleUser(): Promise<GoogleUser | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export function decodeIdToken(token: string): Record<string, unknown> | null {
  return decodeJson<Record<string, unknown>>(token.split(".")[1] ?? "");
}

export async function verifyGoogleIdToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    const header = decodeJson<{ alg?: string; kid?: string }>(encodedHeader);
    if (!header?.kid || header.alg !== "RS256" || !encodedPayload || !encodedSignature) return null;
    const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    if (!response.ok) return null;
    const keys = (await response.json()) as { keys?: JsonWebKey[] };
    const jwk = keys.keys?.find((key) => key.kid === header.kid && key.kty === "RSA");
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    return valid ? decodeJson<Record<string, unknown>>(encodedPayload) : null;
  } catch {
    return null;
  }
}

export function randomUrlSafe(bytes = 32): string {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64Url(value);
}

export async function sha256UrlSafe(value: string): Promise<string> {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}
