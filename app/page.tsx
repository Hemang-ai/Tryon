"use client";

import {
  ArrowCounterClockwise, Bag, Check, CloudArrowUp, CoatHanger, Eye, Eyeglasses,
  Handbag, Heart, Info, LockKey, MagicWand, Plus, ShieldCheck, SignOut, Sneaker,
  Sparkle, Trash, TShirt, UploadSimple, User, Watch, X,
} from "@phosphor-icons/react";
import Image from "next/image";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

type PhotoMode = "half" | "full";
type AccountUser = { id: string; email: string; name: string; picture?: string };
type Look = { id: string; category: string; createdAt: string; imageUrl: string };
type Category = {
  id: string; label: string; singular: string;
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "fill" | "bold" }>;
  guidance: string; fullBody?: boolean;
};

const categories: Category[] = [
  { id: "clothes", label: "Clothes", singular: "garment", icon: TShirt, guidance: "Waist-up works for tops; choose full body for dresses or trousers." },
  { id: "eyewear", label: "Eyewear", singular: "pair of glasses", icon: Eyeglasses, guidance: "Face the camera with your eyes, nose, and ears visible." },
  { id: "headwear", label: "Headwear", singular: "hat or cap", icon: CoatHanger, guidance: "Keep your whole head visible and use even light." },
  { id: "jewelry", label: "Jewelry", singular: "jewelry item", icon: Sparkle, guidance: "Keep the neck, ears, or hands visible for accurate placement." },
  { id: "watches", label: "Watches", singular: "watch", icon: Watch, guidance: "Show an uncovered wrist clearly." },
  { id: "bags", label: "Bags", singular: "bag", icon: Handbag, guidance: "Use a full-body photo for realistic scale and strap placement.", fullBody: true },
  { id: "shoes", label: "Shoes", singular: "pair of shoes", icon: Sneaker, guidance: "Use a full-body photo with both feet visible.", fullBody: true },
];

const demo = {
  name: "NRW 04", description: "Sculpted oval sunglasses", color: "Tortoiseshell",
  product: "/assets/tortoiseshell-glasses.png", before: "/assets/mirra-original.png", after: "/assets/mirra-tryon.png",
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
  const scale = (mode === "full" ? contain : cover) * (zoom / 100);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2 + (vertical / 100) * canvas.height;
  context.drawImage(image, x, y, width, height);
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

async function urlToFile(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The result image could not be saved.");
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

export default function Home() {
  const [categoryId, setCategoryId] = useState("eyewear");
  const [personUrl, setPersonUrl] = useState<string | null>(null);
  const [productUrl, setProductUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [photoMode, setPhotoMode] = useState<PhotoMode>("half");
  const [photoZoom, setPhotoZoom] = useState(100);
  const [photoPosition, setPhotoPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [compare, setCompare] = useState(52);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [looks, setLooks] = useState<Look[]>([]);
  const personInput = useRef<HTMLInputElement>(null);
  const productInput = useRef<HTMLInputElement>(null);
  const personObjectUrl = useRef<string | null>(null);
  const productObjectUrl = useRef<string | null>(null);

  const category = useMemo(() => categories.find((item) => item.id === categoryId) ?? categories[1], [categoryId]);
  const isDemo = !personFile && !productFile && categoryId === "eyewear";
  const sourceImage = personUrl ?? demo.before;
  const resultImage = resultUrl ?? (isDemo ? demo.after : sourceImage);
  const selectedProduct = productUrl ?? (categoryId === "eyewear" ? demo.product : null);
  const sourceStyle = personFile ? {
    objectFit: photoMode === "full" ? "contain" as const : "cover" as const,
    objectPosition: `center ${50 + photoPosition}%`,
    transform: `scale(${photoZoom / 100})`,
  } : undefined;

  useEffect(() => {
    fetch("/api/auth/session").then((response) => response.json()).then((data: { user?: AccountUser }) => {
      setUser(data.user ?? null);
      if (data.user) loadLooks();
    }).catch(() => setUser(null));
  }, []);

  useEffect(() => () => {
    if (personObjectUrl.current) URL.revokeObjectURL(personObjectUrl.current);
    if (productObjectUrl.current) URL.revokeObjectURL(productObjectUrl.current);
  }, []);

  async function loadLooks() {
    const response = await fetch("/api/looks");
    if (response.ok) setLooks(((await response.json()) as { looks: Look[] }).looks);
  }

  async function deleteLook(id: string) {
    const response = await fetch(`/api/looks/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setNotice("This saved look could not be deleted. Please try again.");
      return;
    }
    setLooks((current) => current.filter((look) => look.id !== id));
    setNotice("Saved look and its photos were deleted.");
  }

  async function loadFile(file: File, type: "person" | "product") {
    if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) {
      setNotice("Choose a JPG, PNG, WebP, or HEIC image under 20 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    if (type === "person") {
      if (personObjectUrl.current) URL.revokeObjectURL(personObjectUrl.current);
      personObjectUrl.current = url;
      setPersonUrl(url); setPersonFile(file); setPhotoZoom(100); setPhotoPosition(0);
      try {
        const image = await imageFromFile(file);
        setPhotoMode(image.height / image.width >= 1.45 ? "full" : "half");
      } catch { setPhotoMode("half"); }
    } else {
      if (productObjectUrl.current) URL.revokeObjectURL(productObjectUrl.current);
      productObjectUrl.current = url;
      setProductUrl(url); setProductFile(file);
    }
    setGenerated(false); setResultUrl(null); setSaved(false); setNotice(null);
  }

  function onInput(event: ChangeEvent<HTMLInputElement>, type: "person" | "product") {
    const file = event.target.files?.[0];
    if (file) void loadFile(file, type);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadFile(file, "person");
  }

  async function generateTryOn() {
    if (!selectedProduct) {
      productInput.current?.click();
      setNotice(`Upload a clear image of the ${category.singular} first.`);
      return;
    }
    if (category.fullBody && personFile && photoMode !== "full") {
      setNotice(`${category.label} need a full-body photo. Switch Photo fit to Full body or upload another photo.`);
      return;
    }
    if (isDemo) {
      setProcessing(true); setNotice(null);
      await new Promise((resolve) => setTimeout(resolve, 950));
      setGenerated(true); setCompare(52); setProcessing(false);
      return;
    }
    if (!personFile || !productFile) {
      setNotice("Upload both your photo and a product image to create a personal try-on.");
      return;
    }
    setProcessing(true); setNotice("Adapting the photo and placing the product naturally…");
    try {
      const [prepared, preparedProduct] = await Promise.all([
        normalizePerson(personFile, photoMode, photoZoom, photoPosition),
        normalizeProduct(productFile),
      ]);
      const data = new FormData();
      data.append("person", prepared); data.append("product", preparedProduct); data.append("category", categoryId);
      const response = await fetch("/api/try-on", { method: "POST", body: data });
      const payload = (await response.json()) as { resultUrl?: string; error?: string };
      if (!response.ok || !payload.resultUrl) throw new Error(payload.error ?? "No preview was returned.");
      setResultUrl(payload.resultUrl); setGenerated(true); setCompare(52); setSaved(false);
      setNotice("Your realistic try-on is ready.");
    } catch (error) {
      setGenerated(false);
      setNotice(error instanceof Error ? error.message : "The realistic preview could not be created.");
    } finally { setProcessing(false); }
  }

  async function saveLook() {
    if (!user) { setAccountOpen(true); setNotice("Sign in with ChatGPT to keep looks in your personal account."); return; }
    if (!generated || !resultUrl || !personFile || !productFile) {
      setNotice("Create a personal try-on first, then save it to your account."); return;
    }
    try {
      const [prepared, preparedProduct] = await Promise.all([
        normalizePerson(personFile, photoMode, photoZoom, photoPosition),
        normalizeProduct(productFile),
      ]);
      const result = await urlToFile(resultUrl, "try-it-on-result.jpg");
      const data = new FormData();
      data.append("person", prepared); data.append("product", preparedProduct); data.append("result", result); data.append("category", categoryId);
      const response = await fetch("/api/looks", { method: "POST", body: data });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error ?? "This look could not be saved.");
      setSaved(true); setNotice("Saved to your Try-it-on account."); await loadLooks();
    } catch (error) { setNotice(error instanceof Error ? error.message : "This look could not be saved."); }
  }

  function reset() {
    if (personObjectUrl.current) URL.revokeObjectURL(personObjectUrl.current);
    if (productObjectUrl.current) URL.revokeObjectURL(productObjectUrl.current);
    personObjectUrl.current = null; productObjectUrl.current = null;
    setPersonUrl(null); setProductUrl(null); setResultUrl(null); setPersonFile(null); setProductFile(null);
    setCategoryId("eyewear"); setPhotoMode("half"); setPhotoZoom(100); setPhotoPosition(0);
    setGenerated(false); setSaved(false); setNotice(null);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">Try-it-on</div>
        <button className="privacy-chip" onClick={() => setNotice("Photos are processed only to create your preview. They are stored only when you deliberately save a look to your account.")}><LockKey size={16} /> Private by default</button>
        <ol className="stepper" aria-label="Try-on progress">
          <li className={!generated ? "active" : "complete"}><span>{generated ? <Check size={13} weight="bold" /> : "1"}</span><small>Upload</small></li>
          <li className={generated ? "complete" : selectedProduct ? "active" : ""}><span>{generated ? <Check size={13} weight="bold" /> : "2"}</span><small>Select</small></li>
          <li className={generated ? "active" : ""}><span>3</span><small>Preview</small></li>
        </ol>
        <button className="new-try" onClick={reset}>New try-on <Plus size={17} /></button>
        <button className="profile" aria-label="Open account" onClick={() => setAccountOpen(true)}>
          {user?.picture ? <Image src={user.picture} alt="" width={38} height={38} unoptimized /> : <User size={18} weight="fill" />}
        </button>
      </header>

      <section className="studio">
        <nav className="category-rail" aria-label="Wearable categories">
          <div className="rail-items">{categories.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={item.id === categoryId ? "rail-item active" : "rail-item"} onClick={() => {
              setCategoryId(item.id); setGenerated(false); setResultUrl(null); setProductUrl(null); setProductFile(null); setNotice(null);
            }} aria-pressed={item.id === categoryId}><Icon size={29} weight={item.id === categoryId ? "fill" : "regular"} /><span>{item.label}</span></button>;
          })}</div>
          <button className="rail-upload" onClick={() => personInput.current?.click()}><UploadSimple size={25} /><span>Upload photo</span><small>JPG, PNG · 20MB</small></button>
        </nav>

        <div className="canvas-wrap">
          <div className="photo-stage">
            <Image src={sourceImage} alt="Original person photo" fill priority className="person-photo" style={sourceStyle} unoptimized />
            {generated && <div className="result-layer" style={{ clipPath: `inset(0 0 0 ${compare}%)` }}><Image src={resultImage} alt="Realistic virtual try-on preview" fill className="person-photo" unoptimized /></div>}

            {!personUrl && !generated && <div className={isDragging ? "upload-panel dragging" : "upload-panel"} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={onDrop}>
              <button className="drop-target" onClick={() => personInput.current?.click()}><CloudArrowUp size={40} /><strong>Drop your photo here</strong><span>or click to browse</span></button>
              <div className="photo-guidelines"><span>Photo guidelines</span><p><User size={19} /> Full or half body</p><p><Eye size={19} /> Good, even lighting</p><p><ShieldCheck size={19} /> Placement area visible</p></div>
            </div>}

            {personFile && !generated && <div className="photo-fit-panel">
              <div><span><Sparkle size={15} /> Auto-framed</span><strong>Photo fit</strong></div>
              <div className="mode-toggle"><button className={photoMode === "half" ? "active" : ""} onClick={() => setPhotoMode("half")}>Half body</button><button className={photoMode === "full" ? "active" : ""} onClick={() => setPhotoMode("full")}>Full body</button></div>
              <label>Zoom <input type="range" min="100" max="150" value={photoZoom} onChange={(event) => setPhotoZoom(Number(event.target.value))} /></label>
              <label>Vertical position <input type="range" min="-25" max="25" value={photoPosition} onChange={(event) => setPhotoPosition(Number(event.target.value))} /></label>
              <small>The same framing is sent to the realistic try-on engine.</small>
            </div>}

            <div className="quality-panel"><div><span className="quality-dot" /><strong>Photo quality</strong></div><p>{personUrl ? `${photoMode === "full" ? "Full" : "Half"}-body photo · ready` : "Sample photo · ready"}</p><small>{category.guidance}</small></div>

            {generated && <><input className="compare-range" type="range" min="0" max="100" value={compare} onChange={(event) => setCompare(Number(event.target.value))} aria-label="Compare before and after" /><div className="compare-handle" style={{ left: `${compare}%` }}><span>‹</span><span>›</span></div><div className="compare-labels"><span>Before</span><span>After</span></div></>}
            <div className="estimate-note"><Info size={17} /> AI preview — confirm actual fit before purchase.</div>
          </div>

          <aside className="product-inspector">
            <div className="inspector-head"><span>Selected product</span><button aria-label="Clear product" onClick={() => { setProductUrl(null); setProductFile(null); setGenerated(false); setResultUrl(null); }}><X size={18} /></button></div>
            {selectedProduct ? <button className="product-media" onClick={() => productInput.current?.click()} aria-label="Replace selected product"><Image src={selectedProduct} alt={productUrl ? `Uploaded ${category.singular}` : demo.description} fill className="product-image" unoptimized /><span>Replace</span></button> : <button className="product-empty" onClick={() => productInput.current?.click()}><Bag size={34} /><strong>Upload {category.singular}</strong><span>Use a clean product photo</span></button>}
            <div className="product-dots" aria-hidden="true"><i className="active" /><i /><i /><i /></div>
            <div className="product-copy"><small>{category.label}</small><h1>{productUrl ? `Your ${category.singular}` : categoryId === "eyewear" ? demo.name : `Add ${category.singular}`}</h1><p>{productUrl ? "Personal item upload" : categoryId === "eyewear" ? demo.description : "Upload a product image to begin"}</p><span>{productUrl ? "Ready for realistic placement" : categoryId === "eyewear" ? demo.color : "Front-facing product photos work best"}</span></div>
            <div className="swatches" aria-label="Product details"><button className="selected" aria-label="Selected color" /><button aria-label="Black" /><button aria-label="Olive" /><button aria-label="Brown" /><button aria-label="More colors">+2</button></div>
            <button className="try-button" onClick={generateTryOn} disabled={processing}>{processing ? <><span className="spinner" /> Creating your look…</> : generated ? <><ArrowCounterClockwise size={20} /> Try again</> : <><MagicWand size={20} weight="fill" /> Try this on</>}</button>
            <button className={saved ? "save-button saved" : "save-button"} onClick={() => void saveLook()}><Heart size={19} weight={saved ? "fill" : "regular"} /> {saved ? "Saved to account" : "Save for later"}</button>
            <div className="inspector-trust"><ShieldCheck size={18} /><span><strong>Built for confidence</strong>Identity-preserving AI, adjustable framing, private saved looks.</span></div>
          </aside>
        </div>
      </section>

      {accountOpen && <div className="account-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setAccountOpen(false); }}>
        <aside className="account-drawer" aria-label="Your Try-it-on account">
          <button className="drawer-close" onClick={() => setAccountOpen(false)} aria-label="Close account"><X size={20} /></button>
          {user ? <>
            <div className="account-person">{user.picture ? <Image src={user.picture} alt="" width={62} height={62} unoptimized /> : <User size={25} />}<div><small>Your Try-it-on account</small><h2>{user.name}</h2><p>{user.email}</p></div></div>
            <button className="account-new" onClick={() => { reset(); setAccountOpen(false); }}><Plus size={18} /> Create a new look</button>
            <div className="recent-head"><strong>Recent looks</strong><span>{looks.length} saved</span></div>
            {looks.length ? <div className="recent-grid">{looks.map((look) => <div className="recent-card" key={look.id}><button className="recent-open" onClick={() => { setResultUrl(look.imageUrl); setGenerated(true); setCompare(0); setAccountOpen(false); }}><Image src={look.imageUrl} alt={`Saved ${look.category} try-on`} width={180} height={230} unoptimized /><span>{look.category}</span></button><button className="recent-delete" onClick={() => void deleteLook(look.id)} aria-label={`Delete saved ${look.category} look`}><Trash size={15} /></button></div>)}</div> : <div className="empty-looks"><Heart size={28} /><p>Your saved looks will appear here.</p></div>}
            <a className="sign-out" href="/signout-with-chatgpt?return_to=/"><SignOut size={18} /> Sign out</a>
          </> : <>
            <div className="account-intro"><span><Sparkle size={23} /></span><small>Personal fitting room</small><h2>Your looks, all in one place.</h2><p>Sign in to save realistic previews, compare products, and return to your favorites on any device.</p></div>
            <a className="google-button" href="/signin-with-chatgpt?return_to=/"><Sparkle size={19} /> Continue with ChatGPT</a>
            <p className="account-privacy"><LockKey size={16} /> We only store a photo when you choose Save for later.</p>
          </>}
        </aside>
      </div>}

      <input ref={personInput} className="hidden-input" type="file" accept="image/*" onChange={(event) => onInput(event, "person")} />
      <input ref={productInput} className="hidden-input" type="file" accept="image/*" onChange={(event) => onInput(event, "product")} />
      {notice && <div className="toast" role="status"><Info size={19} /><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={17} /></button></div>}
    </main>
  );
}
