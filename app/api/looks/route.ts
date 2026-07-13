import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getGoogleUser } from "@/lib/google-auth";

export const runtime = "edge";

export async function GET(request: Request) {
  void request;
  const user = await getGoogleUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!env.DB) return NextResponse.json({ looks: [] });

  const result = await env.DB.prepare(`SELECT id, category, variant_name AS variantName, variant_hex AS variantHex, created_at AS createdAt FROM try_on_looks WHERE user_id = ? ORDER BY created_at DESC LIMIT 12`).bind(user.id).all();
  const looks = (result.results ?? []).map((look) => ({ ...look, imageUrl: `/api/looks/${look.id}/image` }));
  return NextResponse.json({ looks });
}

export async function POST(request: Request) {
  const user = await getGoogleUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!env.DB || !env.BUCKET) return NextResponse.json({ error: "Account storage is not configured." }, { status: 503 });

  const data = await request.formData();
  const person = data.get("person");
  const product = data.get("product");
  const result = data.get("result");
  const category = String(data.get("category") ?? "clothes");
  const variantName = String(data.get("variantName") ?? "Original").slice(0, 32);
  const requestedHex = String(data.get("variantHex") ?? "");
  const variantHex = /^#[0-9a-fA-F]{6}$/.test(requestedHex) ? requestedHex : null;
  if (!(person instanceof File) || !(product instanceof File) || !(result instanceof File)) {
    return NextResponse.json({ error: "Person, product, and result images are required." }, { status: 400 });
  }
  if ([person, product, result].some((file) => file.size > 20 * 1024 * 1024 || !file.type.startsWith("image/"))) {
    return NextResponse.json({ error: "Images must be valid and under 20 MB each." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const prefix = `users/${user.id}/looks/${id}`;
  const personKey = `${prefix}/person`;
  const productKey = `${prefix}/product`;
  const resultKey = `${prefix}/result`;
  const timestamp = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO users (id, email, name, picture_url, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name, last_login_at = excluded.last_login_at`).bind(user.id, user.email, user.name, user.picture, timestamp, timestamp).run();
  await Promise.all([
    env.BUCKET.put(personKey, await person.arrayBuffer(), { httpMetadata: { contentType: person.type } }),
    env.BUCKET.put(productKey, await product.arrayBuffer(), { httpMetadata: { contentType: product.type } }),
    env.BUCKET.put(resultKey, await result.arrayBuffer(), { httpMetadata: { contentType: result.type } }),
  ]);
  const createdAt = timestamp;
  await env.DB.prepare(`INSERT INTO try_on_looks (id, user_id, category, variant_name, variant_hex, person_key, product_key, result_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, user.id, category, variantName, variantHex, personKey, productKey, resultKey, createdAt).run();

  return NextResponse.json({ look: { id, category, variantName, variantHex, createdAt, imageUrl: `/api/looks/${id}/image` } }, { status: 201 });
}
