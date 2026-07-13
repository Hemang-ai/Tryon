import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authenticated-user";

export const runtime = "edge";
export async function GET(request: Request) {
  return NextResponse.json({ user: await getAuthenticatedUser(request) });
}
