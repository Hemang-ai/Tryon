import { NextResponse } from "next/server";
import { getGoogleUser } from "@/lib/google-auth";

export const runtime = "edge";
export async function GET() {
  return NextResponse.json({ user: await getGoogleUser(), googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.AUTH_SECRET) });
}
