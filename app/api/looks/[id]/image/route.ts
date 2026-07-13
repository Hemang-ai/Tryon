import { env } from "cloudflare:workers";
import { getGoogleUser } from "@/lib/google-auth";

export const runtime = "edge";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getGoogleUser();
  if (!user || !env.DB || !env.BUCKET) return new Response("Not found", { status: 404 });
  const { id } = await context.params;
  const look = await env.DB.prepare(`SELECT result_key AS resultKey FROM try_on_looks WHERE id = ? AND user_id = ?`).bind(id, user.id).first<{ resultKey: string }>();
  if (!look) return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(look.resultKey);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, max-age=3600");
  return new Response(object.body, { headers });
}
