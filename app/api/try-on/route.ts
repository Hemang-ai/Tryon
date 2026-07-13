import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: Request) {
  const providerUrl = process.env.VTO_PROVIDER_URL;
  const apiKey = process.env.VTO_API_KEY;

  if (!providerUrl || !apiKey) {
    return NextResponse.json(
      { mode: "local-preview", message: "Photorealistic provider is not configured." },
      { status: 200 },
    );
  }

  const incoming = await request.formData();
  const person = incoming.get("person");
  const product = incoming.get("product");
  const category = String(incoming.get("category") ?? "clothes");

  if (!(person instanceof File) || !(product instanceof File)) {
    return NextResponse.json({ error: "Both person and product images are required." }, { status: 400 });
  }

  const outbound = new FormData();
  outbound.append("personImage", person);
  outbound.append("productImage", product);
  outbound.append("category", category);

  const response = await fetch(providerUrl, {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: outbound,
  });

  if (!response.ok) {
    return NextResponse.json({ error: "The try-on provider could not create a preview." }, { status: 502 });
  }

  const result = (await response.json()) as { resultUrl?: string; output?: string; image?: string };
  const resultUrl = result.resultUrl ?? result.output ?? result.image;

  if (!resultUrl) {
    return NextResponse.json({ error: "The provider returned no preview image." }, { status: 502 });
  }

  return NextResponse.json({ mode: "provider", resultUrl });
}
