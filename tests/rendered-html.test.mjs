import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("ships the adaptive Try-it-on experience without a fake overlay", async () => {
  const [page, layout, css] = await Promise.all([
    source("../app/page.tsx"), source("../app/layout.tsx"), source("../app/globals.css"),
  ]);

  assert.match(page, /Try-it-on/);
  assert.match(layout, /Try-it-on — Your personal fitting room/);
  assert.match(page, /Half body/);
  assert.match(page, /Full body/);
  assert.match(page, /normalizePerson/);
  assert.match(page, /category\.fullBody/);
  assert.doesNotMatch(page, /wearable-overlay|overlay preview/);
  assert.match(css, /photo-fit-panel/);
  assert.match(css, /account-drawer/);
});

test("connects realistic generation, Google auth, and private saved looks", async () => {
  const [tryOn, authStart, authCallback, looks, schema] = await Promise.all([
    source("../app/api/try-on/route.ts"),
    source("../app/api/auth/google/start/route.ts"),
    source("../app/api/auth/google/callback/route.ts"),
    source("../app/api/looks/route.ts"),
    source("../db/schema.ts"),
  ]);

  assert.match(tryOn, /model_name: "tryon-max"/);
  assert.match(tryOn, /return_base64: true/);
  assert.match(authStart, /code_challenge_method/);
  assert.match(authCallback, /verifyGoogleIdToken/);
  assert.match(looks, /Sign in required/);
  assert.match(looks, /env\.BUCKET\.put/);
  assert.match(schema, /try_on_looks/);
  assert.match(schema, /onDelete: "cascade"/);
});
