import { NextResponse } from "next/server";
import {
  AI_SETTINGS_COOKIE,
  encryptApiKey,
  isAiProvider,
  isAiProviderChoice,
  platformApiKey,
  providerStatus,
  readProviderSettings,
  serializedProviderSettings,
} from "@/lib/ai-providers";
import { getGoogleUser } from "@/lib/google-auth";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

function withSettingsCookie(response: NextResponse, request: Request, value: string) {
  response.cookies.set(AI_SETTINGS_COOKIE, value, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
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
  const body = await request.json().catch(() => null) as { provider?: unknown; apiKey?: unknown } | null;
  if (!isAiProviderChoice(body?.provider)) return NextResponse.json({ error: "Choose Auto, Gemini, or OpenAI." }, { status: 400 });
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (apiKey.length > 512) return NextResponse.json({ error: "The API key is too long." }, { status: 400 });

  const settings = await readProviderSettings(user.id);
  if (body.provider !== "auto" && apiKey) {
    if (apiKey.length < 12) return NextResponse.json({ error: "Enter a complete API key." }, { status: 400 });
    settings.credentials[body.provider] = await encryptApiKey(apiKey);
  }
  if (body.provider !== "auto" && !apiKey && !settings.credentials[body.provider] && !platformApiKey(body.provider)) {
    return NextResponse.json({ error: `Add a ${body.provider === "gemini" ? "Gemini" : "OpenAI"} API key before selecting this provider.` }, { status: 400 });
  }
  settings.activeProvider = body.provider;
  const response = NextResponse.json(await providerStatus(user.id, settings));
  return withSettingsCookie(response, request, serializedProviderSettings(settings));
}

export async function DELETE(request: Request) {
  const user = await getGoogleUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage AI providers." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid settings origin." }, { status: 403 });
  const body = await request.json().catch(() => null) as { provider?: unknown } | null;
  if (!isAiProvider(body?.provider)) return NextResponse.json({ error: "Choose a provider key to delete." }, { status: 400 });
  const settings = await readProviderSettings(user.id);
  delete settings.credentials[body.provider];
  if (settings.activeProvider === body.provider && !platformApiKey(body.provider)) settings.activeProvider = "auto";
  const response = NextResponse.json(await providerStatus(user.id, settings));
  return withSettingsCookie(response, request, serializedProviderSettings(settings));
}
