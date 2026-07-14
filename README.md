# Try-it-on

Try-it-on is an account-based virtual fitting room for apparel and accessories. A shopper uploads a half- or full-body photo, chooses a product and color, and generates a realistic preview with Google Gemini or OpenAI Image.

Production: [tryon-opal.vercel.app](https://tryon-opal.vercel.app)

> AI output is a style visualization. It is not a physical size, fit, safety, or purchase guarantee.

## What works

- Google Identity Services sign-in plus an optional Test Login mode
- Clothes, eyewear, headwear, jewelry, watches, bags, and shoes
- Bundled product examples and customer product uploads
- Half/full-body framing, zoom, and vertical positioning
- Product color variants with product-preserving generation instructions
- Gemini and OpenAI Image provider support
- Optional encrypted personal API keys
- Before/after comparison
- Up to 12 private saved looks per signed-in user and browser
- JPG, PNG, and WebP validation with explicit photo-processing consent

## Provider selection

Signed-in shoppers open **AI provider settings** from the gear icon.

- **Auto** chooses the first available provider in this order: personal Gemini, app Gemini, personal OpenAI, app OpenAI.
- **Gemini** uses the shopper's Gemini key, then the app Gemini key.
- **OpenAI** uses the shopper's OpenAI key, then the app OpenAI key.

Personal keys are encrypted with AES-GCM before being placed in a secure, HTTP-only account cookie. The API never returns a key to browser JavaScript. Replacing and deleting a key are supported. Requests made with a personal key are billed by that provider to the shopper's provider account.

## Technology

- Next.js App Router on Vercel Functions
- Google Identity Services for sign-in
- Gemini Interactions API for Gemini image generation
- OpenAI Image Edits API for person-plus-product generation
- IndexedDB for private saved-look storage in the current browser
- Encrypted HTTP-only cookies for sessions and personal provider settings

The production MVP does not require a database or object-storage service. Saved looks do not sync between browsers or devices.

## Local setup

Requires Node.js 22.13 through Node.js 24.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Create long random values for `AUTH_SECRET` and `CREDENTIAL_ENCRYPTION_KEY`. Keep both stable after launch; changing them signs users out and makes previously encrypted personal provider keys unreadable.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | Yes | Signs secure account session cookies |
| `CREDENTIAL_ENCRYPTION_KEY` | Recommended | Encrypts personal provider keys; falls back to `AUTH_SECRET` |
| `GOOGLE_CLIENT_ID` | For Google login | Google OAuth Web client ID; no client secret is used by this flow |
| `GEMINI_API_KEY` | Optional | App-managed Gemini fallback key |
| `GEMINI_IMAGE_MODEL` | Optional | Defaults to `gemini-3.1-flash-image` |
| `OPENAI_API_KEY` | Optional | App-managed OpenAI fallback key |
| `OPENAI_IMAGE_MODEL` | Optional | Defaults to `gpt-image-2` |
| `DAILY_GENERATION_LIMIT` | Optional | Browser-enforced daily cap for the app-managed key; defaults to 20 |
| `TEST_LOGIN_ENABLED` | No | QA bypass; set to `false` for a public launch |

With no app-managed provider key, each shopper must add a personal key before generating.

## Google login configuration

Create a Google OAuth client with application type **Web application**.

### Authorized JavaScript origins

```text
http://localhost:3000
https://tryon-opal.vercel.app
```

Also add every final custom or production domain that serves the app. Enter only the scheme and hostname, with no path or trailing route.

### Authorized redirect URIs

Leave this section empty. Google Identity Services returns an ID credential to a browser callback, which the application posts to `/api/auth/google/credential`; Google does not redirect to that route.

An `Error 400: origin_mismatch` means the exact current browser origin is missing from **Authorized JavaScript origins**.

## Vercel deployment

The GitHub repository is connected to the Vercel project `hemangs-projects-e0d7efbf/tryon`. Pushes to `main` create production deployments.

1. Add the variables above in **Project Settings → Environment Variables** and scope them to Production.
2. Set `TEST_LOGIN_ENABLED=true` while validating the first deployment, or `false` after the Vercel origin is accepted by Google.
3. Run `npm test` and `npm run lint`.
4. Push the tested commit to `main`.
5. Inspect the Vercel build and runtime logs, then verify login, provider settings, uploads, generation, comparison, saving, deletion, and logout.

Vercel project URLs use the `vercel.app` domain. `tryon.vercel.com` is not a project domain. Connect a domain you own in Vercel Project Settings if a branded hostname is required.

## Data and privacy

- Uploaded images are sent to the selected AI provider only after consent.
- Gemini requests set `store=false`.
- Uploaded source photos are not stored by this application.
- A saved result is stored only in IndexedDB in the current browser.
- Personal provider keys are encrypted and kept in HTTP-only cookies.
- API keys and `.env` files are excluded from Git.

Before a public commercial launch, publish a privacy policy, terms, AI disclosure, retention policy, provider subprocessors, support contact, and an account/data deletion process.

## Validation

```bash
npm test
npm run lint
```

## Product documentation

- [Product requirements](PRODUCT_REQUIREMENTS.md)
- [Product roadmap](PRODUCT_ROADMAP.md)
- [QA report](QA_REPORT.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
