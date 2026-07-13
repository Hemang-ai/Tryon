import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("ships a focused Google-gated dashboard with adaptive photos and real variants", async () => {
  const [page, layout, css, catalog] = await Promise.all([
    source("../app/page.tsx"), source("../app/layout.tsx"), source("../app/globals.css"), source("../lib/catalog.ts"),
  ]);
  assert.match(page, /Dashboard/);
  assert.match(page, /Continue with Google/);
  assert.match(page, /Half body/);
  assert.match(page, /Full body/);
  assert.match(page, /normalizePerson/);
  assert.match(page, /normalizeProduct/);
  assert.match(page, /recolorProduct/);
  assert.match(page, /variantHex/);
  assert.match(page, /product\.fullBody/);
  assert.match(layout, /Try-it-on — Your personal fitting room/);
  assert.match(css, /dashboard-layout/);
  assert.match(css, /variant-swatches/);
  assert.doesNotMatch(page, /product-dots|swatches.*Black|wearable-overlay|overlay preview/);
  for (const category of ["clothes", "eyewear", "headwear", "jewelry", "watches", "bags", "shoes"]) {
    assert.match(catalog, new RegExp(`${category}:`));
  }
});

test("protects generation and storage with verified Google OAuth", async () => {
  const [tryOn, auth, credentialAuth, session, looks, deleteLook, schema] = await Promise.all([
    source("../app/api/try-on/route.ts"),
    source("../lib/google-auth.ts"),
    source("../app/api/auth/google/credential/route.ts"),
    source("../app/api/auth/session/route.ts"),
    source("../app/api/looks/route.ts"),
    source("../app/api/looks/[id]/route.ts"),
    source("../db/schema.ts"),
  ]);
  assert.match(credentialAuth, /verifyGoogleIdToken/);
  assert.match(credentialAuth, /claims\.email_verified/);
  assert.match(credentialAuth, /request\.headers\.get\("origin"\)/);
  assert.match(credentialAuth, /claims\.aud !== env\.GOOGLE_CLIENT_ID/);
  assert.match(credentialAuth, /SESSION_COOKIE/);
  assert.match(auth, /httpOnly|SESSION_COOKIE/);
  assert.match(session, /googleConfigured/);
  assert.match(tryOn, /getGoogleUser/);
  assert.match(tryOn, /gemini-3\.1-flash-image/);
  assert.match(tryOn, /generativelanguage\.googleapis\.com\/v1beta\/interactions/);
  assert.match(tryOn, /store: false/);
  assert.match(tryOn, /variantInstruction/);
  assert.doesNotMatch(tryOn, /FASHN|fashn/i);
  assert.match(looks, /getGoogleUser/);
  assert.match(looks, /variant_name/);
  assert.match(looks, /env\.BUCKET\.put/);
  assert.match(deleteLook, /env\.BUCKET\.delete/);
  assert.match(deleteLook, /DELETE FROM try_on_looks/);
  assert.match(schema, /variantName/);
  assert.match(schema, /onDelete: "cascade"/);
});

test("provides an allowlisted demo product image for every remote category", async () => {
  const [route, catalog] = await Promise.all([source("../app/api/catalog/[category]/route.ts"), source("../lib/catalog.ts")]);
  for (const category of ["clothes", "headwear", "jewelry", "watches", "bags", "shoes"]) {
    assert.match(route, new RegExp(`${category}:`));
  }
  assert.match(route, /Cache-Control/);
  assert.match(catalog, /assets\/tortoiseshell-glasses\.jpg/);
});
