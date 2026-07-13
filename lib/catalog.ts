export type CategoryId = "clothes" | "eyewear" | "headwear" | "jewelry" | "watches" | "bags" | "shoes";
export type ProductVariant = { name: string; hex: string | null };
export type CatalogProduct = {
  id: string;
  category: CategoryId;
  label: string;
  singular: string;
  name: string;
  description: string;
  guidance: string;
  imageUrl: string;
  creditUrl: string;
  credit: string;
  license: string;
  fullBody?: boolean;
  variants: ProductVariant[];
};

const standardVariants: ProductVariant[] = [
  { name: "Original", hex: null },
  { name: "Midnight", hex: "#20242d" },
  { name: "Burgundy", hex: "#7d2738" },
  { name: "Olive", hex: "#667047" },
];

export const catalog: Record<CategoryId, CatalogProduct> = {
  clothes: {
    id: "essential-tee", category: "clothes", label: "Clothes", singular: "garment", name: "Essential tee",
    description: "Clean crew-neck silhouette", guidance: "Waist-up works for tops; use full body for dresses or trousers.",
    imageUrl: "/api/catalog/clothes", creditUrl: "https://commons.wikimedia.org/wiki/File:T-shirt.webp", credit: "Clker-Free-Vector-Images", license: "CC0",
    variants: standardVariants,
  },
  eyewear: {
    id: "nrw-04", category: "eyewear", label: "Eyewear", singular: "pair of glasses", name: "NRW 04",
    description: "Sculpted oval sunglasses", guidance: "Face the camera with your eyes, nose, and ears visible.",
    imageUrl: "/assets/tortoiseshell-glasses.png", creditUrl: "#", credit: "Try-it-on", license: "Original demo asset",
    variants: [{ name: "Tortoiseshell", hex: null }, { name: "Onyx", hex: "#1f2024" }, { name: "Cherry", hex: "#7b2430" }, { name: "Forest", hex: "#294d3f" }],
  },
  headwear: {
    id: "everyday-cap", category: "headwear", label: "Headwear", singular: "hat or cap", name: "Everyday cap",
    description: "Classic curved-brim baseball cap", guidance: "Keep your whole head visible and use even light.",
    imageUrl: "/api/catalog/headwear", creditUrl: "https://commons.wikimedia.org/wiki/File:Baseball_cap.jpg", credit: "TexasRebel", license: "Public domain",
    variants: standardVariants,
  },
  jewelry: {
    id: "heritage-drops", category: "jewelry", label: "Jewelry", singular: "jewelry item", name: "Heritage drops",
    description: "Ornate statement earrings", guidance: "Keep both ears and the sides of your face visible.",
    imageUrl: "/api/catalog/jewelry", creditUrl: "https://commons.wikimedia.org/wiki/File:Earrings_(India),_late_19th_century_(CH_18386847).jpg", credit: "Cooper Hewitt", license: "Public domain",
    variants: [{ name: "Original", hex: null }, { name: "Gold", hex: "#b88a35" }, { name: "Rose gold", hex: "#b76e79" }, { name: "Silver", hex: "#a8adb4" }],
  },
  watches: {
    id: "minimal-watch", category: "watches", label: "Watches", singular: "watch", name: "Minimal watch",
    description: "Round dial with a leather strap", guidance: "Show an uncovered wrist clearly.",
    imageUrl: "/api/catalog/watches", creditUrl: "https://commons.wikimedia.org/wiki/File:Wristwatch.jpg", credit: "Wikimedia contributor", license: "Public domain",
    variants: standardVariants,
  },
  bags: {
    id: "doctor-bag", category: "bags", label: "Bags", singular: "bag", name: "Heritage carryall",
    description: "Structured leather doctor bag", guidance: "Use a full-body photo for realistic scale and placement.",
    imageUrl: "/api/catalog/bags", creditUrl: "https://commons.wikimedia.org/wiki/File:Belber_Doctor_Bag.jpg", credit: "Sandrine Z", license: "CC BY-SA 4.0", fullBody: true,
    variants: standardVariants,
  },
  shoes: {
    id: "campus-runner", category: "shoes", label: "Shoes", singular: "pair of shoes", name: "Campus runner",
    description: "Low-profile everyday sneakers", guidance: "Use a full-body photo with both feet visible.",
    imageUrl: "/api/catalog/shoes", creditUrl: "https://commons.wikimedia.org/wiki/File:Campus_BlueWhite.jpg", credit: "Prafullkumargoswami", license: "CC BY-SA 4.0", fullBody: true,
    variants: standardVariants,
  },
};

export const categoryIds = Object.keys(catalog) as CategoryId[];
