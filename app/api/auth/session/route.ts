import { NextResponse } from "next/server";
import { getGoogleUser } from "@/lib/google-auth";
import { runtimeEnv } from "@/lib/runtime-env";

export async function GET() {
  return NextResponse.json({
    user: await getGoogleUser(),
    googleConfigured: Boolean(runtimeEnv.GOOGLE_CLIENT_ID && runtimeEnv.AUTH_SECRET),
    googleClientId: runtimeEnv.GOOGLE_CLIENT_ID || null,
    testLoginEnabled: runtimeEnv.TEST_LOGIN_ENABLED === "true",
  });
}
