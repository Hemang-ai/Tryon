"use client";

import {
  ArrowCounterClockwise, Check, CloudArrowUp, CoatHanger, Eyeglasses, Handbag,
  Heart, LockKey, MagicWand, ShieldCheck, SignOut, Sneaker, Sparkle, TShirt, Trash,
  UploadSimple, User, Watch, X,
} from "@phosphor-icons/react";
import Image from "next/image";
import Script from "next/script";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { catalog, categoryIds, type CategoryId, type ProductVariant } from "@/lib/catalog";

type PhotoMode = "half" | "full";
type AccountUser = { id: string; email: string; name: string; picture?: string | null };
type Look = { id: string; category: string; variantName: string; variantHex?: string | null; createdAt: string; imageUrl: string };
type GoogleCredentialResponse = { credential: string };

declare global {
  interface Window {
    google?: { accounts: { id: {
      initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void; auto_select?: boolean }) => void;
      renderButton: (element: HTMLElement, options: { theme: string; size: string; shape: string; text: string; width: number }) => void;
    } } };
  }
}

const categoryIcons = {
  clothes: TShirt, eyewear: Eyeglasses, headwear: CoatHanger, jewelry: Sparkle,
  watches: Watch, bags: Handbag, shoes: Sneaker,
};

async function imageFromFile(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function normalizePerson(file: File, mode: PhotoMode, zoom: number, vertical: number) {
  const image = await imageFromFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1365;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare this photo.");
  context.fillStyle = "#d8d1cd";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const contain = Math.min(canvas.width / image.width, canvas.height / image.height);
  const cover = Math.max(canvas.width / image.width, canvas.height / image.height);
  const scale = (mode === "full" ? contain : cover) * zoom / 100;
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2 + vertical / 100 * canvas.height, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .92));
  if (!blob) throw new Error("Your browser could not prepare this photo.");
  return new File([blob], "try-it-on-person.jpg", { type: "image/jpeg" });
}

async function normalizeProduct(file: File) {
  const image = await imageFromFile(file);
  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the product photo.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .9));
  if (!blob) throw new Error("Your browser could not prepare the product photo.");
  return new File([blob], "try-it-on-product.jpg", { type: "image/jpeg" });
}

function hexRgb(hex: string) {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)];
}

async function recolorProduct(file: File, hex: string) {
  const image = await imageFromFile(file);
  const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Your browser could not apply this color.");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const count = canvas.width * canvas.height;
  const background = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  const isBackground = (index: number) => {
    const offset = index * 4;
    return pixels.data[offset + 3] < 20 || (pixels.data[offset] > 244 && pixels.data[offset + 1] > 244 && pixels.data[offset + 2] > 244);
  };
  const enqueue = (index: number) => {
    if (!background[index] && isBackground(index)) { background[index] = 1; queue[tail++] = index; }
  };
  for (let x = 0; x < canvas.width; x += 1) { enqueue(x); enqueue((canvas.height - 1) * canvas.width + x); }
  for (let y = 0; y < canvas.height; y += 1) { enqueue(y * canvas.width); enqueue(y * canvas.width + canvas.width - 1); }
  while (head < tail) {
    const index = queue[head++];
    const x = index % canvas.width;
    const y = Math.floor(index / canvas.width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < canvas.width) enqueue(index + 1);
    if (y > 0) enqueue(index - canvas.width);
    if (y + 1 < canvas.height) enqueue(index + canvas.width);
  }
  const [targetR, targetG, targetB] = hexRgb(hex);
  for (let index = 0; index < count; index += 1) {
    if (background[index]) continue;
    const offset = index * 4;
    const red = pixels.data[offset];
    const green = pixels.data[offset + 1];
    const blue = pixels.data[offset + 2];
    const luminance = (.2126 * red + .7152 * green + .0722 * blue) / 255;
    const shade = .22 + .78 * luminance;
    const highlight = Math.max(0, (luminance - .82) / .18) * .3;
    pixels.data[offset] = Math.min(255, targetR * shade + 255 * highlight);
    pixels.data[offset + 1] = Math.min(255, targetG * shade + 255 * highlight);
    pixels.data[offset + 2] = Math.min(255, targetB * shade + 255 * highlight);
  }
  context.putImageData(pixels, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Your browser could not apply this color.");
  return new File([blob], `try-it-on-${hex.slice(1)}.png`, { type: "image/png" });
}

async function urlToFile(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The image could not be prepared.");
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

export default function Home() {
  const [sessionLoading, setSessionLoading] = useState(true);
  const [googleConfigured, setGoogleConfigured] = useState(true);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [categoryId, setCategoryId] = useState<CategoryId>("clothes");
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [personUrl, setPersonUrl] = useState<string | null>(null);
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [productUrl, setProductUrl] = useState<string | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [variantPreviewUrl, setVariantPreviewUrl] = useState<string | null>(null);
  const [productLoading, setProductLoading] = useState(true);
  const [photoMode, setPhotoMode] = useState<PhotoMode>("half");
  const [photoZoom, setPhotoZoom] = useState(100);
  const [photoPosition, setPhotoPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [compare, setCompare] = useState(52);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [looks, setLooks] = useState<Look[]>([]);
  const personInput = useRef<HTMLInputElement>(null);
  const productInput = useRef<HTMLInputElement>(null);
  const googleButton = useRef<HTMLDivElement>(null);
  const personObjectUrl = useRef<string | null>(null);
  const productObjectUrl = useRef<string | null>(null);

  const product = catalog[categoryId];
  const variant: ProductVariant = product.variants[selectedVariant] ?? product.variants[0];
  const displayProductUrl = variantPreviewUrl ?? productUrl ?? product.imageUrl;
  const sourceStyle = personFile ? {
    objectFit: photoMode === "full" ? "contain" as const : "cover" as const,
    objectPosition: `center ${50 + photoPosition}%`, transform: `scale(${photoZoom / 100})`,
  } : undefined;

  useEffect(() => {
    const auth = new URLSearchParams(window.location.search).get("auth");
    if (auth) window.history.replaceState({}, "", window.location.pathname);
    fetch("/api/auth/session").then((response) => response.json()).then((data: { user?: AccountUser; googleConfigured?: boolean; googleClientId?: string | null }) => {
      setUser(data.user ?? null);
      setGoogleConfigured(Boolean(data.googleConfigured));
      setGoogleClientId(data.googleClientId ?? null);
      if (data.user) void loadLooks();
      if (auth === "failed") setNotice("Google sign-in could not be completed. Please try again.");
      if (auth === "setup") setNotice("Google sign-in is being configured.");
    }).catch(() => setNotice("Your session could not be checked.")).finally(() => setSessionLoading(false));
  }, []);

  useEffect(() => {
    const button = googleButton.current;
    const identity = window.google?.accounts.id;
    if (sessionLoading || user || !googleConfigured || !googleClientId || !googleScriptReady || !button || !identity) return;
    button.replaceChildren();
    identity.initialize({
      client_id: googleClientId,
      auto_select: false,
      callback: async ({ credential }) => {
        setGoogleSigningIn(true);
        setNotice(null);
        try {
          const response = await fetch("/api/auth/google/credential", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential }),
          });
          const data = await response.json() as { user?: AccountUser; error?: string };
          if (!response.ok || !data.user) throw new Error(data.error || "Google sign-in could not be completed.");
          setUser(data.user);
          await loadLooks();
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Google sign-in could not be completed.");
        } finally {
          setGoogleSigningIn(false);
        }
      },
    });
    const width = Math.floor(Math.max(200, Math.min(430, button.getBoundingClientRect().width || 430)));
    identity.renderButton(button, { theme: "outline", size: "large", shape: "rectangular", text: "continue_with", width });
  }, [googleClientId, googleConfigured, googleScriptReady, sessionLoading, user]);

  useEffect(() => {
    let cancelled = false;
    fetch(product.imageUrl).then((response) => {
      if (!response.ok) throw new Error("Product unavailable");
      return response.blob();
    }).then((blob) => {
      if (cancelled) return;
      setProductFile(new File([blob], `${product.id}.${blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg"}`, { type: blob.type || "image/jpeg" }));
      setProductUrl(product.imageUrl);
    }).catch(() => {
      if (!cancelled) { setProductFile(null); setProductUrl(product.imageUrl); setNotice("This demo product could not be loaded. Upload your own product image instead."); }
    }).finally(() => { if (!cancelled) setProductLoading(false); });
    return () => { cancelled = true; };
  }, [categoryId, product.id, product.imageUrl]);

  useEffect(() => {
    let active = true;
    let nextUrl: string | null = null;
    if (!productFile || !variant.hex) return;
    recolorProduct(productFile, variant.hex).then((file) => {
      if (!active) return;
      nextUrl = URL.createObjectURL(file);
      setVariantPreviewUrl(nextUrl);
    }).catch(() => setVariantPreviewUrl(null));
    return () => { active = false; if (nextUrl) URL.revokeObjectURL(nextUrl); };
  }, [productFile, variant.hex]);

  useEffect(() => () => {
    if (personObjectUrl.current) URL.revokeObjectURL(personObjectUrl.current);
    if (productObjectUrl.current) URL.revokeObjectURL(productObjectUrl.current);
  }, []);

  async function loadLooks() {
    const response = await fetch("/api/looks");
    if (response.ok) setLooks(((await response.json()) as { looks: Look[] }).looks);
  }

  async function loadPerson(file: File) {
    if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) { setNotice("Choose an image under 20 MB."); return; }
    if (personObjectUrl.current) URL.revokeObjectURL(personObjectUrl.current);
    personObjectUrl.current = URL.createObjectURL(file);
    setPersonUrl(personObjectUrl.current);
    setPersonFile(file);
    setPhotoZoom(100);
    setPhotoPosition(0);
    try {
      const image = await imageFromFile(file);
      setPhotoMode(image.height / image.width >= 1.45 ? "full" : "half");
    } catch { setPhotoMode("half"); }
    setGenerated(false); setResultUrl(null); setSaved(false); setNotice(null);
  }

  async function loadProduct(file: File) {
    if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) { setNotice("Choose an image under 20 MB."); return; }
    if (productObjectUrl.current) URL.revokeObjectURL(productObjectUrl.current);
    productObjectUrl.current = URL.createObjectURL(file);
    setProductUrl(productObjectUrl.current);
    setProductFile(file);
    setSelectedVariant(0);
    setVariantPreviewUrl(null);
    setGenerated(false); setResultUrl(null); setSaved(false); setNotice("Your product is ready. Choose a color or create the try-on.");
  }

  function chooseVariant(index: number) {
    setSelectedVariant(index);
    setVariantPreviewUrl(null);
    setGenerated(false); setResultUrl(null); setSaved(false);
  }

  function chooseCategory(id: CategoryId) {
    if (id === categoryId) return;
    setProductLoading(true);
    setProductFile(null);
    setProductUrl(null);
    setVariantPreviewUrl(null);
    setSelectedVariant(0);
    setGenerated(false);
    setResultUrl(null);
    setSaved(false);
    setCategoryId(id);
  }

  async function generateTryOn() {
    if (!personFile) { personInput.current?.click(); setNotice("Upload your photo first."); return; }
    if (!productFile) { productInput.current?.click(); setNotice("Upload a product image first."); return; }
    if (product.fullBody && photoMode !== "full") { setNotice(`${product.label} need a full-body photo with the placement area visible.`); return; }
    setProcessing(true); setNotice("Creating your realistic try-on…");
    try {
      const [preparedPerson, preparedProduct] = await Promise.all([
        normalizePerson(personFile, photoMode, photoZoom, photoPosition),
        variant.hex ? recolorProduct(productFile, variant.hex) : normalizeProduct(productFile),
      ]);
      const data = new FormData();
      data.append("person", preparedPerson);
      data.append("product", preparedProduct);
      data.append("category", categoryId);
      data.append("variantName", variant.name);
      if (variant.hex) data.append("variantHex", variant.hex);
      const response = await fetch("/api/try-on", { method: "POST", body: data });
      const payload = await response.json() as { resultUrl?: string; error?: string };
      if (response.status === 401) { setUser(null); throw new Error("Sign in with Google to continue."); }
      if (!response.ok || !payload.resultUrl) throw new Error(payload.error ?? "No preview was returned.");
      setResultUrl(payload.resultUrl); setGenerated(true); setCompare(52); setSaved(false);
      setNotice(`${product.name} in ${variant.name} is ready.`);
    } catch (error) {
      setGenerated(false);
      setNotice(error instanceof Error ? error.message : "The try-on could not be created.");
    } finally { setProcessing(false); }
  }

  async function saveLook() {
    if (!generated || !resultUrl || !personFile || !productFile) { setNotice("Create a new try-on before saving it."); return; }
    try {
      const [preparedPerson, preparedProduct, result] = await Promise.all([
        normalizePerson(personFile, photoMode, photoZoom, photoPosition),
        variant.hex ? recolorProduct(productFile, variant.hex) : normalizeProduct(productFile),
        urlToFile(resultUrl, "try-it-on-result.jpg"),
      ]);
      const data = new FormData();
      data.append("person", preparedPerson); data.append("product", preparedProduct); data.append("result", result);
      data.append("category", categoryId); data.append("variantName", variant.name);
      if (variant.hex) data.append("variantHex", variant.hex);
      const response = await fetch("/api/looks", { method: "POST", body: data });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "This look could not be saved.");
      setSaved(true); setNotice("Saved to your dashboard."); await loadLooks();
    } catch (error) { setNotice(error instanceof Error ? error.message : "This look could not be saved."); }
  }

  async function deleteLook(id: string) {
    const response = await fetch(`/api/looks/${id}`, { method: "DELETE" });
    if (!response.ok) { setNotice("This saved look could not be deleted."); return; }
    setLooks((current) => current.filter((look) => look.id !== id));
    setNotice("Saved look and its photos were deleted.");
  }

  if (sessionLoading) return <main className="session-screen"><div className="session-card loading-card"><span className="brand-mark">T</span><p>Opening your fitting room…</p></div></main>;

  if (!user) return (
    <main className="login-screen">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setGoogleScriptReady(true)} />
      <section className="login-panel">
        <div className="login-brand"><span className="brand-mark">T</span><strong>Try-it-on</strong></div>
        <div className="login-copy"><span className="eyebrow">Your personal fitting room</span><h1>See it on you.<br />Then decide.</h1><p>Upload one photo, choose a wearable, and preview the exact product and color on your body before you buy.</p></div>
        <div className={`google-login-slot${googleSigningIn ? " signing-in" : ""}`} ref={googleButton} aria-label="Continue with Google">{googleSigningIn ? "Signing you in…" : googleConfigured ? "Loading secure Google sign-in…" : "Google sign-in unavailable"}</div>
        {!googleConfigured && <p className="login-setup">Google sign-in is awaiting its production client credentials.</p>}
        <div className="login-trust"><span><LockKey size={17} /> Photos stay private</span><span><ShieldCheck size={17} /> Delete saved looks anytime</span></div>
        <p className="login-legal">AI previews help with style decisions, not physical size or fit guarantees.</p>
      </section>
      <section className="login-visual" aria-label="Virtual try-on example">
        <Image src="/assets/mirra-tryon.png" alt="A shopper previewing tortoiseshell sunglasses" fill priority unoptimized />
        <div className="visual-caption"><span>Real product</span><span>Real color</span><span>Your photo</span></div>
      </section>
      {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={17} /></button></div>}
    </main>
  );

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div className="dashboard-brand"><span className="brand-mark">T</span><strong>Try-it-on</strong><span>Dashboard</span></div>
        <div className="account-summary">{user.picture ? <Image src={user.picture} alt="" width={34} height={34} unoptimized /> : <User size={18} />}<div><strong>{user.name}</strong><span>{user.email}</span></div><a href="/api/auth/logout" aria-label="Sign out"><SignOut size={18} /></a></div>
      </header>

      <div className="dashboard-layout">
        <aside className="category-sidebar">
          <span className="sidebar-label">Try on</span>
          <nav aria-label="Product categories">{categoryIds.map((id) => {
            const item = catalog[id];
            const Icon = categoryIcons[id];
            return <button key={id} className={categoryId === id ? "category-button active" : "category-button"} onClick={() => chooseCategory(id)} aria-pressed={categoryId === id}><Icon size={21} /><span>{item.label}</span><small>{item.name}</small></button>;
          })}</nav>
          <div className="sidebar-saved"><Heart size={18} /><span><strong>{looks.length}</strong> saved looks</span></div>
        </aside>

        <div className="dashboard-content">
          <section className="workspace-heading"><div><span className="eyebrow">Dashboard</span><h1>Build your next look</h1><p>Choose a product, select its color, then upload a clear photo.</p></div><button className="upload-photo-button" onClick={() => personInput.current?.click()}><UploadSimple size={18} /> {personFile ? "Replace photo" : "Upload photo"}</button></section>

          <section className="tryon-workspace">
            <div className="photo-column">
              <div className="photo-stage">
                {personUrl ? <Image src={personUrl} alt="Your uploaded photo" fill priority className="person-photo" style={sourceStyle} unoptimized /> : <div className={isDragging ? "photo-drop dragging" : "photo-drop"} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); const file = event.dataTransfer.files[0]; if (file) void loadPerson(file); }}><button onClick={() => personInput.current?.click()}><CloudArrowUp size={37} /><strong>Upload your photo</strong><span>Full or half body · JPG, PNG, WebP · 20 MB max</span></button><div><span><Check size={14} /> Even lighting</span><span><Check size={14} /> Placement area visible</span></div></div>}
                {generated && resultUrl && <div className="result-layer" style={{ clipPath: `inset(0 0 0 ${compare}%)` }}><Image src={resultUrl} alt={`${product.name} virtual try-on`} fill className="person-photo" unoptimized /></div>}
                {generated && <><input className="compare-range" type="range" min="0" max="100" value={compare} onChange={(event) => setCompare(Number(event.target.value))} aria-label="Compare before and after" /><div className="compare-labels"><span>Before</span><span>After</span></div></>}
                {personFile && !generated && <div className="photo-controls"><div className="mode-toggle"><button className={photoMode === "half" ? "active" : ""} onClick={() => setPhotoMode("half")}>Half body</button><button className={photoMode === "full" ? "active" : ""} onClick={() => setPhotoMode("full")}>Full body</button></div><label>Zoom<input type="range" min="100" max="145" value={photoZoom} onChange={(event) => setPhotoZoom(Number(event.target.value))} /></label><label>Position<input type="range" min="-25" max="25" value={photoPosition} onChange={(event) => setPhotoPosition(Number(event.target.value))} /></label></div>}
              </div>
              <p className="preview-note"><ShieldCheck size={16} /> AI style preview—confirm physical size and fit before purchase.</p>
            </div>

            <aside className="product-panel">
              <div className="product-panel-head"><span>{product.label}</span><button onClick={() => productInput.current?.click()}>Upload your own</button></div>
              <button className="product-image-card" onClick={() => productInput.current?.click()} aria-label="Replace product image">{productLoading ? <span className="product-loader">Loading product…</span> : <Image src={displayProductUrl} alt={product.name} fill className="product-image" unoptimized />}<small>Replace</small></button>
              <div className="product-details"><span className="eyebrow">Selected product</span><h2>{product.name}</h2><p>{product.description}</p></div>
              <div className="variant-section"><div><strong>Color</strong><span>{variant.name}</span></div><div className="variant-swatches">{product.variants.map((item, index) => <button key={item.name} className={selectedVariant === index ? "variant active" : "variant"} style={{ "--swatch": item.hex ?? "linear-gradient(135deg,#9a5935 0 30%,#261c22 32% 60%,#d78a42 62%)" } as React.CSSProperties} onClick={() => chooseVariant(index)} aria-pressed={selectedVariant === index} aria-label={`Choose ${item.name}`}><i /></button>)}</div></div>
              <div className="photo-requirement"><strong>Photo requirement</strong><span>{product.guidance}</span></div>
              <button className="generate-button" onClick={() => void generateTryOn()} disabled={processing || productLoading}>{processing ? <><span className="spinner" /> Creating your look…</> : generated ? <><ArrowCounterClockwise size={19} /> Create again</> : <><MagicWand size={19} weight="fill" /> Try this on</>}</button>
              <button className={saved ? "save-look saved" : "save-look"} onClick={() => void saveLook()} disabled={!generated}><Heart size={18} weight={saved ? "fill" : "regular"} /> {saved ? "Saved to dashboard" : "Save look"}</button>
              {product.creditUrl !== "#" && <a className="asset-credit" href={product.creditUrl} target="_blank" rel="noreferrer">Demo image: {product.credit} · {product.license}</a>}
            </aside>
          </section>

          <section className="saved-section">
            <div className="saved-heading"><div><span className="eyebrow">Your account</span><h2>Saved looks</h2></div><span>{looks.length} of 12 recent looks</span></div>
            {looks.length ? <div className="saved-grid">{looks.map((look) => <article className="saved-card" key={look.id}><button className="saved-open" onClick={() => { setResultUrl(look.imageUrl); setGenerated(true); setCompare(0); }}><Image src={look.imageUrl} alt={`Saved ${look.category} try-on`} width={260} height={340} unoptimized /><span>{look.category}</span><strong>{look.variantName || "Original"}</strong></button><button className="saved-delete" onClick={() => void deleteLook(look.id)} aria-label={`Delete saved ${look.category} look`}><Trash size={16} /></button></article>)}</div> : <div className="saved-empty"><Heart size={25} /><strong>No saved looks yet</strong><span>Create a try-on and save it here for comparison.</span></div>}
          </section>
        </div>
      </div>

      <input ref={personInput} className="hidden-input" type="file" accept="image/*" onChange={(event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) void loadPerson(file); event.target.value = ""; }} />
      <input ref={productInput} className="hidden-input" type="file" accept="image/*" onChange={(event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) void loadProduct(file); event.target.value = ""; }} />
      {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={17} /></button></div>}
    </main>
  );
}
