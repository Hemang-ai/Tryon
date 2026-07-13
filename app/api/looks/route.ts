import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getGoogleUser } from "@/lib/google-auth";
import { isCategoryId } from "@/lib/catalog";
import { MAX_SAVED_LOOKS } from "@/lib/looks";
import { isAllowedImage } from "@/lib/uploads";

export const runtime = "edge";

export async function GET(request: Request) {
  void request;
  const user = await getGoogleUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!env.DB) return NextResponse.json({ looks: [] });

  const result = await env.DB.prepare(`SELECT id, category, variant_name AS variantName, variant_hex AS variantHex, created_at AS createdAt FROM try_on_looks WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`).bind(user.id, MAX_SAVED_LOOKS).all();
  const looks = (result.results ?? []).map((look) => ({ ...look, imageUrl: `/api/looks/${look.id}/image` }));
  return NextResponse.json({ looks });
}

export async function POST(request: Request) {
  const user = await getGoogleUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!env.DB || !env.BUCKET) return NextResponse.json({ error: "Account storage is not configured." }, { status: 503 });

  const existing = await env.DB.prepare(`SELECT COUNT(*) AS count FROM try_on_looks WHERE user_id = ?`).bind(user.id).first<{ count: number }>();
  if (Number(existing?.count ?? 0) >= MAX_SAVED_LOOKS) {
    return NextResponse.json(
      { code: "SAVED_LOOK_LIMIT", error: `You can save up to ${MAX_SAVED_LOOKS} looks. Delete one before saving another.` },
      { status: 409 },
    );
  }

  const data = await request.formData();
  const person = data.get("person");
  const product = data.get("product");
  const result = data.get("result");
  const category = String(data.get("category") ?? "clothes");
  const variantName = String(data.get("variantName") ?? "Original").slice(0, 32);
  const requestedHex = String(data.get("variantHex") ?? "");
  const variantHex = /^#[0-9a-fA-F]{6}$/.test(requestedHex) ? requestedHex : null;
  if (!isCategoryId(category)) {
    return NextResponse.json({ error: "Choose a supported wearable category." }, { status: 400 });
  }
  if (!(person instanceof File) || !(product instanceof File) || !(result instanceof File)) {
    return NextResponse.json({ error: "Person, product, and result images are required." }, { status: 400 });
  }
  if ([person, product, result].some((file) => !isAllowedImage(file))) {
    return NextResponse.json({ error: "Use JPG, PNG, or WebP images under 20 MB." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const prefix = `users/${user.id}/looks/${id}`;
  const personKey = `${prefix}/person`;
  const productKey = `${prefix}/product`;
  const resultKey = `${prefix}/result`;
  const timestamp = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO users (id, email, name, picture_url, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name, last_login_at = excluded.last_login_at`).bind(user.id, user.email, user.name, user.picture, timestamp, timestamp).run();
  const keys = [personKey, productKey, resultKey];
  try {
    await Promise.all([
      env.BUCKET.put(personKey, await person.arrayBuffer(), { httpMetadata: { contentType: person.type } }),
      env.BUCKET.put(productKey, await product.arrayBuffer(), { httpMetadata: { contentType: product.type } }),
      env.BUCKET.put(resultKey, await result.arrayBuffer(), { httpMetadata: { contentType: result.type } }),
    ]);
    await env.DB.prepare(`INSERT INTO try_on_looks (id, user_id, category, variant_name, variant_hex, person_key, product_key, result_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, user.id, category, variantName, variantHex, personKey, productKey, resultKey, timestamp).run();
  } catch (error) {
    await Promise.allSettled(keys.map((key) => env.BUCKET.delete(key)));
    if (String(error).includes("SAVED_LOOK_LIMIT")) {
      return NextResponse.json(
        { code: "SAVED_LOOK_LIMIT", error: `You can save up to ${MAX_SAVED_LOOKS} looks. Delete one before saving another.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "This look could not be saved. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ look: { id, category, variantName, variantHex, createdAt: timestamp, imageUrl: `/api/looks/${id}/image` } }, { status: 201 });
}
