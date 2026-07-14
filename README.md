# Try-it-on

Try-it-on is an account-based virtual fitting room for apparel and accessories. A shopper uploads a half- or full-body photo, chooses a product and color, and generates a realistic preview with Google Gemini or OpenAI Image.

Live private preview: [mirra-virtual-try-on.databackup123.chatgpt.site](https://mirra-virtual-try-on.databackup123.chatgpt.site)

> AI output is a style visualization. It is not a physical size, fit, safety, or purchase guarantee.

## What works

- Google Identity Services sign-in plus an owner-only Test Login mode
- Clothes, eyewear, headwear, jewelry, watches, bags, and shoes
- Bundled example product for every category and customer product uploads
- Half/full-body framing, zoom, and vertical positioning
- Product color variants with material-preserving generation instructions
- Gemini and OpenAI Image provider support
- Optional encrypted API key per account (bring your own key)
- Before/after comparison
- Private saved looks with permanent deletion
- Daily generation limit and 12-look account cap
- JPG, PNG, and WebP validation with explicit photo-processing consent

## How provider selection works

Signed-in shoppers open **AI provider settings** from the gear icon in the header.

- **Auto** uses the first available provider in this order: personal Gemini key, app Gemini key, personal OpenAI key, app OpenAI key.
- **Gemini** uses that account's Gemini key, then the app Gemini key.
- **OpenAI** uses that account's OpenAI key, then the app OpenAI key.

Personal keys are AES-GCM encrypted on the server before being saved in D1. The API never returns the plaintext or encrypted value to the browser. Replacing and deleting a key are supported. Requests made with a personal key are billed to that provider account.

## Technology

- Next.js-compatible Vinext application on Cloudflare Workers
- D1 for users, usage, saved-look metadata, provider preferences, and encrypted credentials
- R2 for explicitly saved source and generated images
- Google Identity Services for sign-in
- Gemini Interactions API for Gemini image generation
- OpenAI Image Edits API with `gpt-image-2` for person-plus-product generation

## Local setup

Requires Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Create long, random values for `AUTH_SECRET` and `CREDENTIAL_ENCRYPTION_KEY`. Keep them stable after launch: changing the credential encryption key makes previously stored personal provider keys unreadable.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | Yes | Signs the secure account session cookie |
| `CREDENTIAL_ENCRYPTION_KEY` | Recommended | Encrypts personal AI provider keys; falls back to `AUTH_SECRET` if omitted |
| `GOOGLE_CLIENT_ID` | For Google login | Google OAuth Web client ID; the client secret is not used by the current GIS ID-token flow |
| `GEMINI_API_KEY` | Optional | App-managed Gemini fallback key |
| `GEMINI_IMAGE_MODEL` | Optional | Defaults to `gemini-3.1-flash-image` |
| `OPENAI_API_KEY` | Optional | App-managed OpenAI fallback key |
| `OPENAI_IMAGE_MODEL` | Optional | Defaults to `gpt-image-2` |
| `DAILY_GENERATION_LIMIT` | Optional | Per-account UTC daily cap; defaults to 20 |
| `TEST_LOGIN_ENABLED` | No | Owner QA bypass; use only on a private environment and disable before public launch |

At least one app-managed provider key is recommended for a consumer launch. With neither app key configured, each shopper must add a personal key before generating.

## Google login configuration

In Google Cloud Console, open **APIs & Services → Credentials → your OAuth 2.0 Client ID**. The application uses a **Web application** client.

### Authorized JavaScript origins

Add these exact origins for the current environments:

```text
http://localhost:3000
https://mirra-virtual-try-on.databackup123.chatgpt.site
```

If local development starts on a different port, add that exact origin as well, for example `http://localhost:3001`. When a custom production domain is connected, add its exact HTTPS origin. Origins contain only scheme, host, and optional port—no path and no trailing route.

### Authorized redirect URIs

Leave this section empty for the current implementation. Google Identity Services returns an ID credential to a browser callback, and the application posts it to `/api/auth/google/credential`; Google does not redirect to that API route.

Do not enter the GitHub repository URL, the API credential route, or the Sites URL with a path as a redirect URI. If the sign-in implementation is later changed to an authorization-code redirect flow, add and implement an exact callback such as:

```text
https://YOUR_DOMAIN/api/auth/google/callback
```

Google configuration changes can take several minutes to propagate. An `Error 400: origin_mismatch` means the exact origin currently shown in the browser is missing from **Authorized JavaScript origins**.

## Database migrations

Schema lives in `db/schema.ts`; generated SQL is committed under `drizzle/`.

```bash
npm run db:generate
```

The host applies the migrations to the bound D1 database. The provider migration creates `ai_provider_settings` and `ai_provider_credentials`.

## Validation

```bash
npm test
npm run lint
```

`npm test` builds the Cloudflare-compatible application and runs product/security contract tests. Release evidence is recorded in `QA_REPORT.md`; planned sequencing is in `PRODUCT_ROADMAP.md`.

## Data and privacy

- Uploaded images are sent to the selected AI provider only after consent.
- Gemini requests set `store=false`.
- Uploads are not persisted unless the shopper chooses **Save look**.
- Saved looks are private to the signed-in account.
- Deleting a saved look removes its D1 metadata and all associated R2 objects.
- Personal provider keys are encrypted at rest and never returned to the client.
- API keys and `.env` files are excluded from Git.

Before a public commercial launch, publish a privacy policy, terms, AI disclosure, retention policy, provider subprocessors, support contact, and an account/data deletion process.

## Deployment

GitHub stores the source code; GitHub Pages cannot run this application because it requires server routes, secure secrets, D1, and R2. The current runtime is OpenAI Sites/Cloudflare Workers, configured by `.openai/hosting.json` with logical `DB` and `BUCKET` bindings.

For production:

1. Configure D1 and R2 bindings.
2. Apply all committed migrations.
3. Add runtime secrets through the hosting platform, never through Git.
4. Add the final domain to Google Authorized JavaScript origins.
5. Set `TEST_LOGIN_ENABLED=false`.
6. Run the validation commands and deploy the exact tested commit.

## Product documentation

- [Product requirements](PRODUCT_REQUIREMENTS.md)
- [Product roadmap](PRODUCT_ROADMAP.md)
- [QA report](QA_REPORT.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
