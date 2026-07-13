# Try-it-on

Try-it-on is a private, category-aware virtual fitting room. A shopper uploads a half- or full-body photo, selects a wearable and color, generates a Gemini-powered preview, and can save or permanently delete the result.

## Product surface

- Dashboard-first experience behind an authenticated session
- Clothes, eyewear, headwear, jewelry, watches, bags, and shoes
- One working example product per category plus customer uploads
- Color-variant preview and generation instructions
- Adaptive half/full-body framing, zoom, and vertical position
- Before/after comparison and private saved looks
- Account-level daily generation budget

## Local setup

Requires Node.js `>=22.13.0`.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set the values documented in `.env.example`. `AUTH_SECRET` should be a long random value. Keep `TEST_LOGIN_ENABLED=false` anywhere except an owner-only QA environment.

## Validation

```bash
npm test
npm run lint
```

`npm test` builds the Cloudflare-compatible application and runs the source contract tests. Release evidence is maintained in `QA_REPORT.md`; customer and merchant sequencing is maintained in `PRODUCT_ROADMAP.md`.

## Data and privacy

- Generation requests are sent to Gemini with `store=false`.
- Inputs are not persisted unless the shopper explicitly saves a look.
- Saved inputs and results are private to the signed-in account and stored in R2 with D1 metadata.
- Deleting a saved look removes its metadata and all associated image objects.
- AI output is a style preview, not a physical size or fit guarantee.

## Deployment

The app uses Sites with D1 (`DB`) and R2 (`BUCKET`) bindings declared in `.openai/hosting.json`. Runtime secrets and flags belong in the hosted environment, not in source control. Google Identity Services must authorize the exact production origin before public access is enabled, and Test Login must be disabled first.
