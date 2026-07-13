import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";

export const runtime = "edge";

type FashnStatus = {
  status?: "starting" | "in_queue" | "processing" | "completed" | "failed";
  output?: string[];
  error?: { message?: string } | string;
};

function fileToDataUrl(file: File) {
  return file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunk = 0x8000;
    for (let index = 0; index < bytes.length; index += chunk) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
    }
    return `data:${file.type};base64,${btoa(binary)}`;
  });
}

function promptFor(category: string) {
  const placement: Record<string, string> = {
    clothes: "Dress the person in the supplied garment with physically believable drape, folds, scale, and occlusion.",
    eyewear: "Place the supplied eyewear precisely on the bridge of the nose and behind the ears with realistic reflections and shadows.",
    headwear: "Place the supplied hat naturally on the head with correct hair occlusion, scale, and shadows.",
    jewelry: "Place the supplied jewelry on the anatomically correct visible area with realistic metal highlights and skin contact.",
    watches: "Place the supplied watch securely around the most visible wrist with correct perspective, scale, and shadows.",
    bags: "Place the supplied bag naturally on or beside the person with realistic straps, scale, hand/body occlusion, and shadows.",
    shoes: "Put the supplied footwear on both visible feet with correct perspective, grounding, scale, and shadows.",
  };
  return `${placement[category] ?? "Place the supplied wearable naturally on the correct part of the body."} Preserve the person's face, identity, body proportions, pose, hands, hair, skin tone, and the original background. Preserve the exact product design, material, color, logo, and details. Produce a photorealistic ecommerce-quality result.`;
}

export async function POST(request: Request) {
  const apiKey = env.FASHN_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Realistic try-on is awaiting its FASHN API key. The sample experience is still available." },
      { status: 503 },
    );
  }

  const data = await request.formData();
  const person = data.get("person");
  const product = data.get("product");
  const category = String(data.get("category") ?? "clothes");
  if (!(person instanceof File) || !(product instanceof File)) {
    return NextResponse.json({ error: "Both person and product images are required." }, { status: 400 });
  }
  if ([person, product].some((file) => !file.type.startsWith("image/") || file.size > 20 * 1024 * 1024)) {
    return NextResponse.json({ error: "Images must be valid and under 20 MB each." }, { status: 400 });
  }

  try {
    const [modelImage, productImage] = await Promise.all([fileToDataUrl(person), fileToDataUrl(product)]);
    const runResponse = await fetch("https://api.fashn.ai/v1/run", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model_name: "tryon-max",
        inputs: {
          model_image: modelImage,
          product_image: productImage,
          prompt: promptFor(category),
          resolution: "1k",
          generation_mode: "balanced",
          num_images: 1,
          output_format: "jpeg",
          return_base64: true,
        },
      }),
    });
    const run = (await runResponse.json()) as { id?: string; error?: { message?: string } | string };
    if (!runResponse.ok || !run.id) {
      const message = typeof run.error === "string" ? run.error : run.error?.message;
      return NextResponse.json({ error: message ?? "The try-on engine could not start this preview." }, { status: 502 });
    }

    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const statusResponse = await fetch(`https://api.fashn.ai/v1/status/${run.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const status = (await statusResponse.json()) as FashnStatus;
      if (status.status === "completed" && status.output?.[0]) {
        return NextResponse.json({ mode: "provider", resultUrl: status.output[0] });
      }
      if (status.status === "failed") {
        const message = typeof status.error === "string" ? status.error : status.error?.message;
        return NextResponse.json({ error: message ?? "The try-on engine could not complete this preview." }, { status: 502 });
      }
    }
    return NextResponse.json({ error: "The preview is taking longer than expected. Please try again." }, { status: 504 });
  } catch {
    return NextResponse.json({ error: "The realistic try-on service could not be reached." }, { status: 502 });
  }
}
