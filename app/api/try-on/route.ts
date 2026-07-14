import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getGoogleUser } from "@/lib/google-auth";
import { isCategoryId } from "@/lib/catalog";
import { isAllowedImage } from "@/lib/uploads";
import { resolveAiProvider } from "@/lib/ai-providers";
import { runtimeEnv } from "@/lib/runtime-env";

export const maxDuration = 300;

type GeminiImage = { type?: string; data?: string; mime_type?: string; uri?: string };
type GeminiStep = { type?: string; content?: GeminiImage[]; error?: { message?: string } };
type GeminiInteraction = {
  status?: string;
  steps?: GeminiStep[];
  error?: { message?: string };
};
type OpenAiImagesResponse = { data?: Array<{ b64_json?: string }>; error?: { message?: string; code?: string } };

const CAPACITY_ERROR = {
  code: "TRY_ON_CAPACITY_UNAVAILABLE",
  error: "Realistic try-on is temporarily at capacity. Please try again shortly.",
};

const DEFAULT_DAILY_GENERATION_LIMIT = 20;
const USAGE_COOKIE = "tryiton_daily_usage";

function dailyGenerationLimit() {
  const configured = Number.parseInt(runtimeEnv.DAILY_GENERATION_LIMIT || "", 10);
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 500) : DEFAULT_DAILY_GENERATION_LIMIT;
}

async function platformUsageToday() {
  const day = new Date().toISOString().slice(0, 10);
  const store = await cookies();
  const [storedDay, storedCount] = (store.get(USAGE_COOKIE)?.value ?? "").split(":");
  return { day, count: storedDay === day ? Number.parseInt(storedCount || "0", 10) || 0 : 0 };
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function promptFor(category: string, variantName: string, variantHex: string | null) {
  const placement: Record<string, string> = {
    clothes: "Dress the person in the exact supplied garment with physically believable fit, drape, folds, seams, scale, and body occlusion.",
    eyewear: "Place the exact supplied eyewear precisely on the bridge of the person's nose and behind both ears with realistic lens reflections, perspective, and shadows.",
    headwear: "Place the exact supplied hat naturally on the person's head with correct hair occlusion, scale, perspective, and contact shadows.",
    jewelry: "Place the exact supplied jewelry on the anatomically correct visible area with realistic metal or gemstone highlights, scale, and skin contact.",
    watches: "Place the exact supplied watch securely around the most visible wrist with correct strap wrap, perspective, scale, and contact shadows.",
    bags: "Place the exact supplied bag naturally on the person with realistic straps, scale, hand and body occlusion, perspective, and shadows.",
    shoes: "Put the exact supplied footwear on both visible feet with correct perspective, grounding, scale, foot orientation, and shadows.",
  };
  const variantInstruction = variantHex
    ? `Recolor only the product material to the selected ${variantName} color (${variantHex}), preserving its texture, highlights, shadows, logos, hardware, construction, and every non-color detail.`
    : "Keep the product's original color exactly as supplied.";
  return `Create one photorealistic virtual try-on image. Image 1 is the source person and must remain the composition and identity reference. Image 2 is the product reference and must remain the exact product design. ${placement[category] ?? "Place the exact supplied wearable naturally on the correct part of the body."} ${variantInstruction}

NON-NEGOTIABLE PRESERVATION RULES:
- Preserve the person's exact face, identity, age, expression, skin tone, body proportions, pose, hands, hair, and original background from Image 1.
- Preserve the product's exact shape, construction, material, color, pattern, logo, hardware, and fine details from Image 2.
- Change only what is necessary to make the person wear or carry the product.
- Use anatomically correct placement, physically believable contact, occlusion, perspective, lighting, reflections, and shadows.
- Do not beautify, reshape, retouch, crop out body parts, add accessories, replace the setting, or invent a different product.
- Output only one polished ecommerce-quality photograph with no text, border, collage, labels, or watermark other than the model's standard provenance mark.`;
}

function findGeneratedImage(interaction: GeminiInteraction) {
  for (const step of [...(interaction.steps ?? [])].reverse()) {
    for (const content of [...(step.content ?? [])].reverse()) {
      if (content.type === "image" && content.data) return content;
    }
  }
  return null;
}

async function generateWithGemini(apiKey: string, model: string, person: File, product: File, prompt: string) {
  const [personData, productData] = await Promise.all([fileToBase64(person), fileToBase64(product)]);
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: [
        { type: "text", text: prompt },
        { type: "image", mime_type: person.type, data: personData },
        { type: "image", mime_type: product.type, data: productData },
      ],
      response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "3:4", image_size: "1K" },
      generation_config: { thinking_level: "high" },
      store: false,
    }),
  });
  const interaction = (await response.json()) as GeminiInteraction;
  if (!response.ok || interaction.status === "failed") {
    const message = interaction.error?.message ?? interaction.steps?.find((step) => step.error)?.error?.message;
    return { ok: false as const, status: response.status, message };
  }
  const image = findGeneratedImage(interaction);
  if (!image?.data) return { ok: false as const, status: 502, message: "Gemini returned no try-on image." };
  return { ok: true as const, resultUrl: `data:${image.mime_type ?? "image/jpeg"};base64,${image.data}` };
}

async function generateWithOpenAi(apiKey: string, model: string, person: File, product: File, prompt: string) {
  const form = new FormData();
  form.append("model", model);
  form.append("image[]", person, "person.jpg");
  form.append("image[]", product, "product.jpg");
  form.append("prompt", prompt);
  form.append("size", "1024x1536");
  form.append("quality", "medium");
  form.append("output_format", "jpeg");
  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const result = (await response.json()) as OpenAiImagesResponse;
  if (!response.ok) return { ok: false as const, status: response.status, message: result.error?.message };
  const image = result.data?.[0]?.b64_json;
  if (!image) return { ok: false as const, status: 502, message: "OpenAI returned no try-on image." };
  return { ok: true as const, resultUrl: `data:image/jpeg;base64,${image}` };
}

export async function POST(request: Request) {
  const user = await getGoogleUser();
  if (!user) return NextResponse.json({ error: "Sign in to create a try-on." }, { status: 401 });

  const data = await request.formData();
  const person = data.get("person");
  const product = data.get("product");
  const category = String(data.get("category") ?? "clothes");
  const variantName = String(data.get("variantName") ?? "Original").replace(/[^\w -]/g, "").slice(0, 32) || "Original";
  const requestedHex = String(data.get("variantHex") ?? "");
  const variantHex = /^#[0-9a-fA-F]{6}$/.test(requestedHex) ? requestedHex : null;
  if (data.get("consent") !== "photo-processing-v1") {
    return NextResponse.json({ error: "Confirm photo-processing permission before creating a preview." }, { status: 400 });
  }
  if (!isCategoryId(category)) {
    return NextResponse.json({ error: "Choose a supported wearable category." }, { status: 400 });
  }
  if (!(person instanceof File) || !(product instanceof File)) {
    return NextResponse.json({ error: "Both person and product images are required." }, { status: 400 });
  }
  if ([person, product].some((file) => !isAllowedImage(file))) {
    return NextResponse.json({ error: "Use a JPG, PNG, or WebP image under 20 MB." }, { status: 400 });
  }
  const selectedProvider = await resolveAiProvider(user.id).catch(() => null);
  if (!selectedProvider) {
    return NextResponse.json(
      { code: "AI_PROVIDER_NOT_CONFIGURED", error: "Choose an AI provider and add an API key in AI settings." },
      { status: 503 },
    );
  }
  const usage = await platformUsageToday();
  if (selectedProvider.source === "platform" && usage.count >= dailyGenerationLimit()) {
    return NextResponse.json(
      { code: "DAILY_GENERATION_LIMIT", error: `You have reached today's ${dailyGenerationLimit()}-preview limit. Try again tomorrow.` },
      { status: 429 },
    );
  }

  try {
    const prompt = promptFor(category, variantName, variantHex);
    const generation = selectedProvider.provider === "gemini"
      ? await generateWithGemini(selectedProvider.apiKey, selectedProvider.model, person, product, prompt)
      : await generateWithOpenAi(selectedProvider.apiKey, selectedProvider.model, person, product, prompt);
    if (!generation.ok) {
      if (generation.status === 429) {
        return NextResponse.json(CAPACITY_ERROR, {
          status: 503,
          headers: { "Retry-After": "60" },
        });
      }
      if (generation.status === 401 || generation.status === 403) {
        return NextResponse.json(
          { code: "AI_PROVIDER_KEY_REJECTED", error: "The selected AI provider rejected its API key. Update it in AI settings." },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { error: generation.message ?? `${selectedProvider.provider === "gemini" ? "Gemini" : "OpenAI"} could not create this try-on.` },
        { status: 502 },
      );
    }
    const response = NextResponse.json({
      mode: "provider",
      provider: selectedProvider.provider,
      credentialSource: selectedProvider.source,
      resultUrl: generation.resultUrl,
    });
    if (selectedProvider.source === "platform") {
      response.cookies.set(USAGE_COOKIE, `${usage.day}:${usage.count + 1}`, {
        httpOnly: true,
        secure: new URL(request.url).protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 26,
      });
    }
    return response;
  } catch {
    return NextResponse.json({ error: `${selectedProvider.provider === "gemini" ? "Gemini" : "OpenAI"} image generation could not be reached.` }, { status: 502 });
  }
}
