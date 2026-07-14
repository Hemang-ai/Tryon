import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { encryptApiKey, isAiProvider, isAiProviderChoice, platformApiKey, providerStatus } from "@/lib/ai-providers";
import { getGoogleUser } from "@/lib/google-auth";

export const runtime = "edge";

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function GET() {
  const user = await getGoogleUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage AI providers." }, { status: 401 });
  return NextResponse.json(await providerStatus(user.id));
}

export async function PUT(request: Request) {
  const user = await getGoogleUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage AI providers." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid settings origin." }, { status: 403 });
  if (!env.DB) return NextResponse.json({ error: "Account settings storage is unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null) as { provider?: unknown; apiKey?: unknown } | null;
  if (!isAiProviderChoice(body?.provider)) return NextResponse.json({ error: "Choose Auto, Gemini, or OpenAI." }, { status: 400 });
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (apiKey.length > 512) return NextResponse.json({ error: "The API key is too long." }, { status: 400 });
  const now = new Date().toISOString();
  if (body.provider !== "auto" && apiKey) {
    if (apiKey.length < 12) return NextResponse.json({ error: "Enter a complete API key." }, { status: 400 });
    const encrypted = await encryptApiKey(apiKey);
    await env.DB.prepare(`INSERT INTO ai_provider_credentials (user_id, provider, encrypted_key, key_iv, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, provider) DO UPDATE SET encrypted_key = excluded.encrypted_key, key_iv = excluded.key_iv, updated_at = excluded.updated_at`)
      .bind(user.id, body.provider, encrypted.encryptedKey, encrypted.keyIv, now, now).run();
  }
  if (body.provider !== "auto" && !apiKey) {
    const existing = await env.DB.prepare("SELECT 1 AS configured FROM ai_provider_credentials WHERE user_id = ? AND provider = ?")
      .bind(user.id, body.provider).first<{ configured: number }>();
    if (!existing && !platformApiKey(body.provider)) {
      return NextResponse.json({ error: `Add a ${body.provider === "gemini" ? "Gemini" : "OpenAI"} API key before selecting this provider.` }, { status: 400 });
    }
  }
  await env.DB.prepare(`INSERT INTO ai_provider_settings (user_id, active_provider, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET active_provider = excluded.active_provider, updated_at = excluded.updated_at`)
    .bind(user.id, body.provider, now).run();
  return NextResponse.json(await providerStatus(user.id));
}

export async function DELETE(request: Request) {
  const user = await getGoogleUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage AI providers." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid settings origin." }, { status: 403 });
  if (!env.DB) return NextResponse.json({ error: "Account settings storage is unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null) as { provider?: unknown } | null;
  if (!isAiProvider(body?.provider)) return NextResponse.json({ error: "Choose a provider key to delete." }, { status: 400 });
  await env.DB.prepare("DELETE FROM ai_provider_credentials WHERE user_id = ? AND provider = ?").bind(user.id, body.provider).run();
  const status = await providerStatus(user.id);
  if (status.activeProvider === body.provider && !platformApiKey(body.provider)) {
    await env.DB.prepare("UPDATE ai_provider_settings SET active_provider = 'auto', updated_at = ? WHERE user_id = ?")
      .bind(new Date().toISOString(), user.id).run();
  }
  return NextResponse.json(await providerStatus(user.id));
}
