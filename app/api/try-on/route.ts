import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getGoogleUser } from "@/lib/google-auth";

export const runtime = "edge";

type GeminiImage = { type?: string; data?: string; mime_type?: string; uri?: string };
type GeminiStep = { type?: string; content?: GeminiImage[]; error?: { message?: string } };
type GeminiInteraction = {
  status?: string;
  steps?: GeminiStep[];
  error?: { message?: string };
};

const CAPACITY_ERROR = {
  code: "TRY_ON_CAPACITY_UNAVAILABLE",
  error: "Realistic try-on is temporarily at capacity. Please try again shortly.",
};

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

export async function POST(request: Request) {
  if (!(await getGoogleUser())) return NextResponse.json({ error: "Sign in with Google to create a try-on." }, { status: 401 });
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Gemini image generation is not configured yet." },
      { status: 503 },
    );
  }

  const data = await request.formData();
  const person = data.get("person");
  const product = data.get("product");
  const category = String(data.get("category") ?? "clothes");
  const variantName = String(data.get("variantName") ?? "Original").replace(/[^\w -]/g, "").slice(0, 32) || "Original";
  const requestedHex = String(data.get("variantHex") ?? "");
  const variantHex = /^#[0-9a-fA-F]{6}$/.test(requestedHex) ? requestedHex : null;
  if (!(person instanceof File) || !(product instanceof File)) {
    return NextResponse.json({ error: "Both person and product images are required." }, { status: 400 });
  }
  if ([person, product].some((file) => !file.type.startsWith("image/") || file.size > 20 * 1024 * 1024)) {
    return NextResponse.json({ error: "Images must be valid and under 20 MB each." }, { status: 400 });
  }

  try {
    const [personData, productData] = await Promise.all([fileToBase64(person), fileToBase64(product)]);
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
        input: [
          { type: "text", text: promptFor(category, variantName, variantHex) },
          { type: "image", mime_type: person.type, data: personData },
          { type: "image", mime_type: product.type, data: productData },
        ],
        response_format: {
          type: "image",
          mime_type: "image/jpeg",
          aspect_ratio: "3:4",
          image_size: "1K",
        },
        generation_config: { thinking_level: "high" },
        store: false,
      }),
    });
    const interaction = (await response.json()) as GeminiInteraction;
    if (!response.ok || interaction.status === "failed") {
      if (response.status === 429) {
        return NextResponse.json(CAPACITY_ERROR, {
          status: 503,
          headers: { "Retry-After": "60" },
        });
      }
      const stepError = interaction.steps?.find((step) => step.error)?.error?.message;
      return NextResponse.json(
        { error: interaction.error?.message ?? stepError ?? "Google Gemini could not create this try-on." },
        { status: 502 },
      );
    }
    const image = findGeneratedImage(interaction);
    if (!image?.data) {
      return NextResponse.json({ error: "Google Gemini returned no try-on image." }, { status: 502 });
    }
    return NextResponse.json({
      mode: "provider",
      provider: "gemini",
      resultUrl: `data:${image.mime_type ?? "image/jpeg"};base64,${image.data}`,
    });
  } catch {
    return NextResponse.json({ error: "Google Gemini image generation could not be reached." }, { status: 502 });
  }
}
