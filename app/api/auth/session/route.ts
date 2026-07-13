import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getGoogleUser } from "@/lib/google-auth";

export const runtime = "edge";
export async function GET() {
  return NextResponse.json({
    user: await getGoogleUser(),
    googleConfigured: Boolean(env.GOOGLE_CLIENT_ID && env.AUTH_SECRET),
    googleClientId: env.GOOGLE_CLIENT_ID || null,
    testLoginEnabled: env.TEST_LOGIN_ENABLED === "true",
  });
}
