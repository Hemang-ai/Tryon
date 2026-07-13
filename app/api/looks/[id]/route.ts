import { env } from "cloudflare:workers";
import { getAuthenticatedUser } from "@/lib/authenticated-user";

export const runtime = "edge";

type StoredLook = { personKey: string; productKey: string; resultKey: string };

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(request);
  if (!user || !env.DB || !env.BUCKET) return new Response("Not found", { status: 404 });
  const { id } = await context.params;
  const look = await env.DB.prepare(`SELECT person_key AS personKey, product_key AS productKey, result_key AS resultKey FROM try_on_looks WHERE id = ? AND user_id = ?`).bind(id, user.id).first<StoredLook>();
  if (!look) return new Response("Not found", { status: 404 });

  await Promise.all([
    env.BUCKET.delete(look.personKey),
    env.BUCKET.delete(look.productKey),
    env.BUCKET.delete(look.resultKey),
  ]);
  await env.DB.prepare(`DELETE FROM try_on_looks WHERE id = ? AND user_id = ?`).bind(id, user.id).run();
  return new Response(null, { status: 204 });
}
