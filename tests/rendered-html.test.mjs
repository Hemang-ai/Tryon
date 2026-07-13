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
  assert.match(page, /normalizeProduct/);
  assert.match(page, /category\.fullBody/);
  assert.doesNotMatch(page, /wearable-overlay|overlay preview/);
  assert.match(css, /photo-fit-panel/);
  assert.match(css, /account-drawer/);
});

test("connects Google-native generation, native account identity, and private saved looks", async () => {
  const [tryOn, auth, session, looks, deleteLook, schema, page] = await Promise.all([
    source("../app/api/try-on/route.ts"),
    source("../lib/authenticated-user.ts"),
    source("../app/api/auth/session/route.ts"),
    source("../app/api/looks/route.ts"),
    source("../app/api/looks/[id]/route.ts"),
    source("../db/schema.ts"),
    source("../app/page.tsx"),
  ]);

  assert.match(tryOn, /gemini-3\.1-flash-image/);
  assert.match(tryOn, /generativelanguage\.googleapis\.com\/v1beta\/interactions/);
  assert.match(tryOn, /store: false/);
  assert.match(tryOn, /TRY_ON_CAPACITY_UNAVAILABLE/);
  assert.match(tryOn, /Retry-After/);
  assert.doesNotMatch(tryOn, /FASHN|fashn/i);
  assert.match(auth, /oai-authenticated-user-email/);
  assert.match(auth, /oai-authenticated-user-full-name/);
  assert.match(session, /getAuthenticatedUser/);
  assert.match(page, /signin-with-chatgpt/);
  assert.match(looks, /Sign in required/);
  assert.match(looks, /env\.BUCKET\.put/);
  assert.match(deleteLook, /env\.BUCKET\.delete/);
  assert.match(deleteLook, /DELETE FROM try_on_looks/);
  assert.match(page, /Saved look and its photos were deleted/);
  assert.match(schema, /try_on_looks/);
  assert.match(schema, /onDelete: "cascade"/);
});
