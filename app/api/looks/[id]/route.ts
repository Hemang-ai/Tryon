import { getGoogleUser } from "@/lib/google-auth";

export async function DELETE() {
  const user = await getGoogleUser();
  if (!user) return new Response("Not found", { status: 404 });
  return new Response("Saved looks are managed in this browser.", { status: 409 });
}
