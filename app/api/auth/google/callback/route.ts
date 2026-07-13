import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { createSessionToken, OAUTH_COOKIE, SESSION_COOKIE, userIdForEmail, verifyGoogleIdToken } from "@/lib/google-auth";

export const runtime = "edge";
type OAuthState = { state: string; nonce: string; verifier: string; redirectUri: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const rawCookie = (request.headers.get("cookie") ?? "").split(";").map((item) => item.trim()).find((item) => item.startsWith(`${OAUTH_COOKIE}=`))?.slice(OAUTH_COOKIE.length + 1);
  let oauth: OAuthState | null = null;
  try { oauth = rawCookie ? JSON.parse(decodeURIComponent(rawCookie)) as OAuthState : null; } catch { oauth = null; }
  if (!code || !returnedState || !oauth || returnedState !== oauth.state) return NextResponse.redirect(new URL("/?auth=failed", request.url));
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.AUTH_SECRET) return NextResponse.redirect(new URL("/?auth=setup", request.url));

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: oauth.redirectUri, grant_type: "authorization_code", code_verifier: oauth.verifier }),
  });
  if (!tokenResponse.ok) return NextResponse.redirect(new URL("/?auth=failed", request.url));
  const tokens = await tokenResponse.json() as { id_token?: string };
  const claims = tokens.id_token ? await verifyGoogleIdToken(tokens.id_token) : null;
  const now = Math.floor(Date.now() / 1000);
  if (!claims || claims.nonce !== oauth.nonce || claims.aud !== env.GOOGLE_CLIENT_ID || !["accounts.google.com", "https://accounts.google.com"].includes(String(claims.iss)) || Number(claims.exp) <= now || claims.email_verified !== true) {
    return NextResponse.redirect(new URL("/?auth=failed", request.url));
  }
  const email = String(claims.email).trim().toLowerCase();
  const user = { id: await userIdForEmail(email), email, name: String(claims.name || email), picture: claims.picture ? String(claims.picture) : null };
  const timestamp = new Date().toISOString();
  if (env.DB) await env.DB.prepare(`INSERT INTO users (id, email, name, picture_url, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name, picture_url = excluded.picture_url, last_login_at = excluded.last_login_at`).bind(user.id, user.email, user.name, user.picture, timestamp, timestamp).run();

  const response = NextResponse.redirect(new URL("/?auth=success", request.url));
  response.cookies.delete(OAUTH_COOKIE);
  response.cookies.set(SESSION_COOKIE, await createSessionToken(user), { httpOnly: true, secure: url.protocol === "https:", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return response;
}
