import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, userIdForEmail } from "@/lib/google-auth";

export const runtime = "edge";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  if (request.headers.get("origin") !== requestUrl.origin) {
    return NextResponse.json({ error: "Invalid login origin." }, { status: 403 });
  }
  if (env.TEST_LOGIN_ENABLED !== "true" || !env.AUTH_SECRET) {
    return NextResponse.json({ error: "Test login is disabled." }, { status: 404 });
  }

  const email = "qa@try-it-on.test";
  const user = { id: await userIdForEmail(email), email, name: "Test Shopper", picture: null };
  const timestamp = new Date().toISOString();
  if (env.DB) {
    await env.DB.prepare(`INSERT INTO users (id, email, name, picture_url, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, last_login_at = excluded.last_login_at`).bind(user.id, user.email, user.name, user.picture, timestamp, timestamp).run();
  }

  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(user), {
    httpOnly: true,
    secure: requestUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
