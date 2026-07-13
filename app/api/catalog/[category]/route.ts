import { catalog, type CategoryId } from "@/lib/catalog";

export const runtime = "edge";

const sources: Partial<Record<CategoryId, string>> = {
  clothes: "https://commons.wikimedia.org/wiki/Special:Redirect/file/T-shirt.webp?width=1024",
  headwear: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Baseball%20cap.jpg?width=1200",
  jewelry: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Earrings%20(India),%20late%2019th%20century%20(CH%2018386847).jpg?width=1200",
  watches: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wristwatch.jpg?width=1200",
  bags: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Belber%20Doctor%20Bag.jpg?width=1200",
  shoes: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Campus%20BlueWhite.jpg?width=1200",
};

async function fetchProductSource(source: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(source, { headers: { "User-Agent": "Try-it-on product demo/1.0" } });
    if (response.ok && response.body) return response;
  }
  return null;
}

export async function GET(_request: Request, context: { params: Promise<{ category: string }> }) {
  const { category } = await context.params;
  if (!(category in catalog)) return new Response("Not found", { status: 404 });
  const source = sources[category as CategoryId];
  if (!source) return new Response("Not found", { status: 404 });
  const response = await fetchProductSource(source);
  if (!response) return new Response("Product image unavailable", { status: 502 });
  const headers = new Headers();
  headers.set("Content-Type", response.headers.get("content-type") || "image/jpeg");
  headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, { headers });
}
