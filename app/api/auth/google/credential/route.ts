import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, userIdForEmail, verifyGoogleIdToken } from "@/lib/google-auth";

export const runtime = "edge";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  if (request.headers.get("origin") !== requestUrl.origin) {
    return NextResponse.json({ error: "Invalid sign-in origin." }, { status: 403 });
  }
  if (!env.GOOGLE_CLIENT_ID || !env.AUTH_SECRET) {
    return NextResponse.json({ error: "Google sign-in is not configured." }, { status: 503 });
  }

  let credential = "";
  try {
    const body = await request.json() as { credential?: unknown };
    credential = typeof body.credential === "string" ? body.credential : "";
  } catch {
    return NextResponse.json({ error: "Invalid sign-in response." }, { status: 400 });
  }
  if (!credential || credential.length > 10_000) {
    return NextResponse.json({ error: "Invalid sign-in response." }, { status: 400 });
  }

  const claims = await verifyGoogleIdToken(credential);
  const now = Math.floor(Date.now() / 1000);
  if (
    !claims ||
    claims.aud !== env.GOOGLE_CLIENT_ID ||
    !["accounts.google.com", "https://accounts.google.com"].includes(String(claims.iss)) ||
    Number(claims.exp) <= now ||
    Number(claims.iat) > now + 60 ||
    claims.email_verified !== true ||
    !claims.sub ||
    !claims.email
  ) {
    return NextResponse.json({ error: "Google could not verify this account." }, { status: 401 });
  }

  const email = String(claims.email).trim().toLowerCase();
  const user = {
    id: await userIdForEmail(email),
    email,
    name: String(claims.name || email),
    picture: claims.picture ? String(claims.picture) : null,
  };
  const timestamp = new Date().toISOString();
  if (env.DB) {
    await env.DB.prepare(`INSERT INTO users (id, email, name, picture_url, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name, picture_url = excluded.picture_url, last_login_at = excluded.last_login_at`).bind(user.id, user.email, user.name, user.picture, timestamp, timestamp).run();
  }

  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(user), {
    httpOnly: true,
    secure: requestUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
