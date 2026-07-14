import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/google-auth";
import { AI_SETTINGS_COOKIE } from "@/lib/ai-providers";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(AI_SETTINGS_COOKIE);
  return response;
}
