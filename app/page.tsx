"use client";

import {
  ArrowCounterClockwise,
  Bag,
  Check,
  CloudArrowUp,
  CoatHanger,
  Eye,
  Eyeglasses,
  Handbag,
  Heart,
  Info,
  LockKey,
  MagicWand,
  Plus,
  Question,
  ShieldCheck,
  Sneaker,
  Sparkle,
  TShirt,
  UploadSimple,
  User,
  Watch,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

type Category = {
  id: string;
  label: string;
  singular: string;
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "fill" | "bold" }>;
  guidance: string;
  overlay: { width: number; top: number; left: number };
};

const categories: Category[] = [
  { id: "clothes", label: "Clothes", singular: "garment", icon: TShirt, guidance: "Use a waist-up or full-body photo in fitted clothing.", overlay: { width: 46, top: 34, left: 27 } },
  { id: "eyewear", label: "Eyewear", singular: "pair of glasses", icon: Eyeglasses, guidance: "Face the camera with your eyes and ears visible.", overlay: { width: 27, top: 23, left: 36 } },
  { id: "headwear", label: "Headwear", singular: "hat or cap", icon: CoatHanger, guidance: "Keep your full head visible with hair away from your face.", overlay: { width: 33, top: 4, left: 34 } },
  { id: "jewelry", label: "Jewelry", singular: "jewelry item", icon: Sparkle, guidance: "Use a close, well-lit photo with the placement area visible.", overlay: { width: 18, top: 42, left: 41 } },
  { id: "watches", label: "Watches", singular: "watch", icon: Watch, guidance: "Show your wrist clearly and avoid sleeves covering it.", overlay: { width: 14, top: 70, left: 24 } },
  { id: "bags", label: "Bags", singular: "bag", icon: Handbag, guidance: "A full-body photo gives the best scale and proportion.", overlay: { width: 32, top: 49, left: 61 } },
  { id: "shoes", label: "Shoes", singular: "pair of shoes", icon: Sneaker, guidance: "Use a full-body photo with both feet in frame.", overlay: { width: 35, top: 83, left: 32 } },
];

const demoProduct = {
  name: "NRW 04",
  description: "Sculpted oval sunglasses",
  color: "Tortoiseshell",
  image: "/assets/tortoiseshell-glasses.png",
};

export default function Home() {
  const [categoryId, setCategoryId] = useState("eyewear");
  const [personUrl, setPersonUrl] = useState<string | null>(null);
  const [productUrl, setProductUrl] = useState<string | null>(null);
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [compare, setCompare] = useState(52);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const personInput = useRef<HTMLInputElement>(null);
  const productInput = useRef<HTMLInputElement>(null);

  const category = useMemo(
    () => categories.find((item) => item.id === categoryId) ?? categories[1],
    [categoryId],
  );
  const isDemo = !personUrl && !productUrl && categoryId === "eyewear";
  const sourceImage = personUrl ?? "/assets/mirra-original.png";
  const resultImage = isDemo ? "/assets/mirra-tryon.png" : sourceImage;
  const selectedProduct = productUrl ?? (categoryId === "eyewear" ? demoProduct.image : null);

  useEffect(() => {
    return () => {
      if (personUrl) URL.revokeObjectURL(personUrl);
      if (productUrl) URL.revokeObjectURL(productUrl);
    };
  }, [personUrl, productUrl]);

  function loadFile(file: File, type: "person" | "product") {
    if (!file.type.startsWith("image/")) {
      setNotice("Please choose a JPG, PNG, WebP, or HEIC image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setNotice("That image is over 20 MB. Choose a smaller file.");
      return;
    }
    const url = URL.createObjectURL(file);
    if (type === "person") {
      if (personUrl) URL.revokeObjectURL(personUrl);
      setPersonUrl(url);
      setPersonFile(file);
    } else {
      if (productUrl) URL.revokeObjectURL(productUrl);
      setProductUrl(url);
      setProductFile(file);
    }
    setGenerated(false);
    setNotice(null);
  }

  function onInput(event: ChangeEvent<HTMLInputElement>, type: "person" | "product") {
    const file = event.target.files?.[0];
    if (file) loadFile(file, type);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) loadFile(file, "person");
  }

  async function generateTryOn() {
    if (!selectedProduct) {
      productInput.current?.click();
      setNotice(`Upload a clear image of the ${category.singular} first.`);
      return;
    }
    setProcessing(true);
    setNotice(null);

    try {
      if (personFile && productFile) {
        const data = new FormData();
        data.append("person", personFile);
        data.append("product", productFile);
        data.append("category", categoryId);
        const response = await fetch("/api/try-on", { method: "POST", body: data });
        if (response.ok) {
          const payload = (await response.json()) as { resultUrl?: string; mode?: string };
          if (payload.resultUrl) {
            setPersonUrl(payload.resultUrl);
          }
          setNotice(payload.mode === "provider" ? "Photorealistic preview generated." : "Quick preview created. Connect an AI engine for photorealistic output.");
        } else {
          setNotice("Quick preview created. The photorealistic engine is not connected yet.");
        }
      }
      await new Promise((resolve) => setTimeout(resolve, isDemo ? 1250 : 900));
      setGenerated(true);
      setCompare(52);
    } catch {
      setGenerated(true);
      setNotice("Quick preview created locally; the AI engine could not be reached.");
    } finally {
      setProcessing(false);
    }
  }

  function reset() {
    if (personUrl) URL.revokeObjectURL(personUrl);
    if (productUrl) URL.revokeObjectURL(productUrl);
    setPersonUrl(null);
    setProductUrl(null);
    setPersonFile(null);
    setProductFile(null);
    setCategoryId("eyewear");
    setGenerated(false);
    setSaved(false);
    setNotice(null);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">MIRRA</div>
        <button className="privacy-chip" onClick={() => setNotice("Your photos are used only for this try-on session and are not stored by the demo.")}> 
          <LockKey size={16} /> Your try-ons are private
        </button>
        <ol className="stepper" aria-label="Try-on progress">
          <li className={!generated ? "active" : "complete"}><span>{generated ? <Check size={13} weight="bold" /> : "1"}</span><small>Upload</small></li>
          <li className={generated ? "complete" : selectedProduct ? "active" : ""}><span>{generated ? <Check size={13} weight="bold" /> : "2"}</span><small>Select</small></li>
          <li className={generated ? "active" : ""}><span>3</span><small>Preview</small></li>
        </ol>
        <button className="new-try" onClick={reset}>New try-on <Plus size={17} /></button>
        <button className="profile" aria-label="Profile"><User size={18} weight="fill" /></button>
      </header>

      <section className="studio">
        <nav className="category-rail" aria-label="Wearable categories">
          <div className="rail-items">
            {categories.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={item.id === categoryId ? "rail-item active" : "rail-item"}
                  onClick={() => { setCategoryId(item.id); setGenerated(false); setProductUrl(null); setProductFile(null); setNotice(null); }}
                  aria-pressed={item.id === categoryId}
                >
                  <Icon size={29} weight={item.id === categoryId ? "fill" : "regular"} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
          <button className="rail-upload" onClick={() => personInput.current?.click()}>
            <UploadSimple size={25} />
            <span>Upload photo</span>
            <small>JPG, PNG · 20MB</small>
          </button>
        </nav>

        <div className="canvas-wrap">
          <div className="photo-stage">
            <Image src={sourceImage} alt="Original person photo" fill priority className="person-photo" unoptimized />

            {generated && (
              <div className="result-layer" style={{ clipPath: `inset(0 0 0 ${compare}%)` }}>
                <Image src={resultImage} alt="Virtual try-on preview" fill className="person-photo" unoptimized />
                {!isDemo && selectedProduct && (
                  <Image
                    src={selectedProduct}
                    alt={`${category.label} overlay preview`}
                    width={520}
                    height={390}
                    className={`wearable-overlay ${category.id}`}
                    style={{ width: `${category.overlay.width}%`, top: `${category.overlay.top}%`, left: `${category.overlay.left}%` }}
                    unoptimized
                  />
                )}
              </div>
            )}

            {!personUrl && !generated && (
              <div
                className={isDragging ? "upload-panel dragging" : "upload-panel"}
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
              >
                <button className="drop-target" onClick={() => personInput.current?.click()}>
                  <CloudArrowUp size={40} />
                  <strong>Drop your photo here</strong>
                  <span>or click to browse</span>
                </button>
                <div className="photo-guidelines">
                  <span>Photo guidelines</span>
                  <p><User size={19} /> Full or half body</p>
                  <p><Eye size={19} /> Good, even lighting</p>
                  <p><ShieldCheck size={19} /> Nothing covering you</p>
                </div>
              </div>
            )}

            <div className="quality-panel">
              <div><span className="quality-dot" /> <strong>Photo quality</strong></div>
              <p>{personUrl ? "Uploaded and ready" : "Sample photo · well-lit and clear"}</p>
              <small>{category.guidance}</small>
            </div>

            {generated && (
              <>
                <input
                  className="compare-range"
                  type="range"
                  min="0"
                  max="100"
                  value={compare}
                  onChange={(event) => setCompare(Number(event.target.value))}
                  aria-label="Compare before and after"
                />
                <div className="compare-handle" style={{ left: `${compare}%` }}><span>‹</span><span>›</span></div>
                <div className="compare-labels"><span>Before</span><span>After</span></div>
              </>
            )}

            <div className="estimate-note"><Info size={17} /> Style preview — fit and scale are estimates.</div>
          </div>

          <aside className="product-inspector">
            <div className="inspector-head">
              <span>Selected product</span>
              <button aria-label="Clear product" onClick={() => { setProductUrl(null); setProductFile(null); setGenerated(false); }}><X size={18} /></button>
            </div>

            {selectedProduct ? (
              <button className="product-media" onClick={() => productInput.current?.click()} aria-label="Replace selected product">
                <Image src={selectedProduct} alt={productUrl ? `Uploaded ${category.singular}` : demoProduct.description} fill className="product-image" unoptimized />
                <span>Replace</span>
              </button>
            ) : (
              <button className="product-empty" onClick={() => productInput.current?.click()}>
                <Bag size={34} />
                <strong>Upload {category.singular}</strong>
                <span>Use a clean product photo</span>
              </button>
            )}

            <div className="product-dots" aria-hidden="true"><i className="active" /><i /><i /><i /></div>
            <div className="product-copy">
              <small>{category.label}</small>
              <h1>{productUrl ? `Your ${category.singular}` : categoryId === "eyewear" ? demoProduct.name : `Add ${category.singular}`}</h1>
              <p>{productUrl ? "Personal item upload" : categoryId === "eyewear" ? demoProduct.description : "Upload a product image to begin"}</p>
              <span>{productUrl ? "Custom color" : categoryId === "eyewear" ? demoProduct.color : "JPG or PNG works best"}</span>
            </div>

            <div className="swatches" aria-label="Available colors">
              <button className="selected" aria-label="Tortoiseshell" />
              <button aria-label="Black" />
              <button aria-label="Olive" />
              <button aria-label="Brown" />
              <button aria-label="More colors">+2</button>
            </div>

            <button className="try-button" onClick={generateTryOn} disabled={processing}>
              {processing ? <><span className="spinner" /> Creating your look…</> : generated ? <><ArrowCounterClockwise size={20} /> Try again</> : <><MagicWand size={20} weight="fill" /> Try this on</>}
            </button>
            <button className={saved ? "save-button saved" : "save-button"} onClick={() => setSaved(!saved)}>
              <Heart size={19} weight={saved ? "fill" : "regular"} /> {saved ? "Saved" : "Save for later"}
            </button>

            <div className="inspector-trust">
              <ShieldCheck size={18} />
              <span><strong>Private by design</strong>Your uploads stay in this session.</span>
              <button aria-label="Privacy details" onClick={() => setNotice("Production requirement: encrypt uploads in transit, remove originals within 24 hours, and never train on photos without explicit consent.")}><Question size={17} /></button>
            </div>
          </aside>
        </div>
      </section>

      <input ref={personInput} className="hidden-input" type="file" accept="image/*" onChange={(event) => onInput(event, "person")} />
      <input ref={productInput} className="hidden-input" type="file" accept="image/*" onChange={(event) => onInput(event, "product")} />

      {notice && (
        <div className="toast" role="status">
          <Info size={19} /> <span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={17} /></button>
        </div>
      )}
    </main>
  );
}
