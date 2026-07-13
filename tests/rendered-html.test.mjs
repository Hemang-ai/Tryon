import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
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
  assert.match(page, /Test Login/);
  assert.match(page, /Half body/);
  assert.match(page, /Full body/);
  assert.match(page, /normalizePerson/);
  assert.match(page, /normalizeProduct/);
  assert.match(page, /recolorProduct/);
  assert.match(page, /variantHex/);
  assert.match(page, /product\.fullBody/);
  assert.match(page, /image\/jpeg,image\/png,image\/webp/);
  assert.match(page, /Permanently delete this saved look and its photos/);
  assert.match(page, /permission to use this photo/);
  assert.match(page, /photo-processing-v1/);
  assert.match(layout, /Try-it-on — Your personal fitting room/);
  assert.match(css, /dashboard-layout/);
  assert.match(css, /variant-swatches/);
  assert.doesNotMatch(page, /product-dots|swatches.*Black|wearable-overlay|overlay preview/);
  for (const category of ["clothes", "eyewear", "headwear", "jewelry", "watches", "bags", "shoes"]) {
    assert.match(catalog, new RegExp(`${category}:`));
  }
});

test("protects generation and storage with verified Google and private test sessions", async () => {
  const [tryOn, auth, credentialAuth, testAuth, session, looks, deleteLook, schema, uploads, migration, limitMigration, lookConfig] = await Promise.all([
    source("../app/api/try-on/route.ts"),
    source("../lib/google-auth.ts"),
    source("../app/api/auth/google/credential/route.ts"),
    source("../app/api/auth/test/route.ts"),
    source("../app/api/auth/session/route.ts"),
    source("../app/api/looks/route.ts"),
    source("../app/api/looks/[id]/route.ts"),
    source("../db/schema.ts"),
    source("../lib/uploads.ts"),
    source("../drizzle/0002_crazy_hiroim.sql"),
    source("../drizzle/0003_limit_saved_looks.sql"),
    source("../lib/looks.ts"),
  ]);
  assert.match(credentialAuth, /verifyGoogleIdToken/);
  assert.match(credentialAuth, /claims\.email_verified/);
  assert.match(credentialAuth, /request\.headers\.get\("origin"\)/);
  assert.match(credentialAuth, /claims\.aud !== env\.GOOGLE_CLIENT_ID/);
  assert.match(credentialAuth, /SESSION_COOKIE/);
  assert.match(testAuth, /TEST_LOGIN_ENABLED !== "true"/);
  assert.match(testAuth, /request\.headers\.get\("origin"\)/);
  assert.match(testAuth, /createSessionToken/);
  assert.match(testAuth, /maxAge: 60 \* 60 \* 8/);
  assert.match(auth, /httpOnly|SESSION_COOKIE/);
  assert.match(session, /googleConfigured/);
  assert.match(session, /testLoginEnabled/);
  assert.match(tryOn, /getGoogleUser/);
  assert.match(tryOn, /gemini-3\.1-flash-image/);
  assert.match(tryOn, /generativelanguage\.googleapis\.com\/v1beta\/interactions/);
  assert.match(tryOn, /store: false/);
  assert.match(tryOn, /variantInstruction/);
  assert.match(tryOn, /DAILY_GENERATION_LIMIT/);
  assert.match(tryOn, /try_on_usage/);
  assert.match(tryOn, /releaseGeneration/);
  assert.match(tryOn, /isCategoryId/);
  assert.match(tryOn, /isAllowedImage/);
  assert.match(tryOn, /Confirm photo-processing permission/);
  assert.doesNotMatch(tryOn, /FASHN|fashn/i);
  assert.match(looks, /getGoogleUser/);
  assert.match(looks, /variant_name/);
  assert.match(looks, /env\.BUCKET\.put/);
  assert.match(looks, /Promise\.allSettled/);
  assert.match(looks, /SAVED_LOOK_LIMIT/);
  assert.match(looks, /COUNT\(\*\) AS count/);
  assert.match(looks, /isCategoryId/);
  assert.match(looks, /isAllowedImage/);
  assert.match(deleteLook, /env\.BUCKET\.delete/);
  assert.match(deleteLook, /DELETE FROM try_on_looks/);
  assert.match(schema, /variantName/);
  assert.match(schema, /onDelete: "cascade"/);
  assert.match(schema, /tryOnUsage/);
  assert.match(uploads, /image\/jpeg/);
  assert.match(uploads, /image\/png/);
  assert.match(uploads, /image\/webp/);
  assert.match(migration, /CREATE TABLE `try_on_usage`/);
  assert.match(limitMigration, /CREATE TRIGGER `try_on_looks_limit_before_insert`/);
  assert.match(limitMigration, /RAISE\(ABORT, 'SAVED_LOOK_LIMIT'\)/);
  assert.match(lookConfig, /MAX_SAVED_LOOKS = 12/);
});

test("bundles a working demo product image for every category", async () => {
  const catalog = await source("../lib/catalog.ts");
  const assets = [
    "essential-tee.jpg", "tortoiseshell-glasses.jpg", "everyday-cap.jpg", "heritage-drops.jpg",
    "minimal-watch.jpg", "heritage-carryall.jpg", "campus-runner.jpg",
  ];
  for (const asset of assets) {
    assert.match(catalog, new RegExp(`assets/${asset.replace(".", "\\.")}`));
    await access(new URL(`../public/assets/${asset}`, import.meta.url));
  }
  await assert.rejects(access(new URL("../app/api/catalog/[category]/route.ts", import.meta.url)));
});

test("contains no starter-only application surfaces or unused public icons", async () => {
  const removed = [
    "../app/chatgpt-auth.ts",
    "../examples/d1/app/api/notes/route.ts",
    "../public/file.svg",
    "../public/globe.svg",
    "../public/window.svg",
    "../public/og.png",
    "../public/assets/mirra-original.png",
    "../public/favicon.svg",
    "../design-qa.md",
  ];
  for (const path of removed) {
    await assert.rejects(access(new URL(path, import.meta.url)));
  }
  const [manifest, readme, worker] = await Promise.all([
    source("../package.json"), source("../README.md"), source("../worker/index.ts"),
  ]);
  assert.match(manifest, /"name": "try-it-on"/);
  assert.match(readme, /^# Try-it-on/m);
  assert.doesNotMatch(readme, /vinext-starter/);
  assert.doesNotMatch(worker, /vinext-starter template/);
});
