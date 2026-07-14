import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, userIdForEmail } from "@/lib/google-auth";
import { runtimeEnv } from "@/lib/runtime-env";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  if (request.headers.get("origin") !== requestUrl.origin) {
    return NextResponse.json({ error: "Invalid login origin." }, { status: 403 });
  }
  if (runtimeEnv.TEST_LOGIN_ENABLED !== "true" || !runtimeEnv.AUTH_SECRET) {
    return NextResponse.json({ error: "Test login is disabled." }, { status: 404 });
  }

  const email = "qa@try-it-on.test";
  const user = { id: await userIdForEmail(email), email, name: "Test Shopper", picture: null };
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
