import { NextResponse } from "next/server";
import { getGoogleUser } from "@/lib/google-auth";

export async function GET() {
  const user = await getGoogleUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  return NextResponse.json({ looks: [], storage: "browser" });
}

export async function POST() {
  const user = await getGoogleUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  return NextResponse.json(
    { error: "Saved looks are stored privately in this browser." },
    { status: 409 },
  );
}
