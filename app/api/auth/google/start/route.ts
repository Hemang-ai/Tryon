import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { OAUTH_COOKIE, randomUrlSafe, sha256UrlSafe } from "@/lib/google-auth";

export const runtime = "edge";

export async function GET(request: Request) {
  const clientId = env.GOOGLE_CLIENT_ID;
  const secret = env.AUTH_SECRET;
  if (!clientId || !secret) return NextResponse.redirect(new URL("/?auth=setup", request.url));

  const state = randomUrlSafe(24);
  const nonce = randomUrlSafe(24);
  const verifier = randomUrlSafe(48);
  const redirectUri = new URL("/api/auth/google/callback", request.url).toString();
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", clientId);
  authorization.searchParams.set("redirect_uri", redirectUri);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", "openid email profile");
  authorization.searchParams.set("state", state);
  authorization.searchParams.set("nonce", nonce);
  authorization.searchParams.set("code_challenge", await sha256UrlSafe(verifier));
  authorization.searchParams.set("code_challenge_method", "S256");
  authorization.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authorization);
  response.cookies.set(OAUTH_COOKIE, encodeURIComponent(JSON.stringify({ state, nonce, verifier, redirectUri })), {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
