# Release QA report

Date: 2026-07-13

## Automated checks

- Production build: passed
- ESLint: passed
- Source-level product/authentication tests: 4 passed
- Production catalog delivery: passed for all seven categories
- Production authentication boundary: unauthenticated generation returns `401`

## Authenticated AI try-on matrix

The following tests ran against the private production deployment through the explicitly enabled Test Login session and the configured Gemini image model. Each response was decoded and visually inspected for placement, identity preservation, and selected color.

| Category | Product | Variant | Result |
| --- | --- | --- | --- |
| Clothes | Essential tee | Burgundy `#7d2738` | Passed |
| Eyewear | NRW 04 sunglasses | Onyx `#202020` | Passed |
| Headwear | Everyday cap | Forest `#315644` | Passed |
| Jewelry | Heritage drops | Gold `#c6a25a` | Passed |
| Watches | Minimal watch | Navy `#1f3556` | Passed |
| Bags | Heritage carryall | Oxblood `#6b2737` | Passed |
| Shoes | Campus runner | Crimson `#bb2636` | Passed |

The eyewear test initially exposed a request-size failure. Its 1.9 MB PNG was replaced with a visually equivalent 128 KB JPEG, after which the same end-to-end request passed.

## Saved-look lifecycle

- Create with category and variant metadata: `201`
- List and verify variant metadata: `200`
- Read stored result image: `200 image/jpeg`
- Delete look and all associated images: `204`
- Read after deletion: `404`

## Test Login lifecycle

- Test Login session creation: `200`
- Browser CTA transition from login screen to Dashboard: passed
- Dashboard category navigation: all seven categories visible
- Protected session lookup: `200`
- Logout redirect: `307`
- Session after logout: `user=null`

## Release hardening

- All seven demo products are bundled and no longer depend on a third-party image host at runtime.
- Client and API upload allowlist: JPG, PNG, and WebP only; 20 MB maximum.
- Unsupported category rejection: passed with an actionable `400` response.
- Missing photo-processing consent rejection: passed with an actionable `400` response.
- Unsupported MIME rejection: passed with an actionable `400` response.
- Plain-language photo permission and storage disclosure: visible immediately beside upload.
- Per-account daily generation budget: migration and atomic limit query validated; failed provider requests are refunded.
- Saved-look failure compensation: partial R2 objects are removed when storage or metadata creation fails.
- Permanent-delete confirmation: present before saved images and metadata are removed.
- Saved-look retention boundary: exactly 12 inserts succeed; the 13th is atomically rejected with `SAVED_LOOK_LIMIT` before image storage.
- Mobile Test Login and Dashboard states: captured and visually inspected; no clipped primary action or horizontal page overflow found.
- Starter-only routes, example code, icons, duplicate imagery, and stale design QA were removed.

## Hardened production checkpoint

Version 17 was exercised after the D1 usage migration and environment revision were applied:

- Seven bundled catalog assets: `200 image/jpeg` for every category.
- Unsupported category: `400` with actionable copy.
- Missing processing consent: `400` with actionable copy.
- Unsupported MIME type: `400` with actionable copy.
- Consent-bearing Burgundy clothes generation: `200`; the returned Gemini JPEG was decoded and visually inspected for identity, placement, and selected color.
- Save hardened result: `201`; list and metadata check: `200`; private result image: `200 image/jpeg`.
- Delete temporary QA look: `204`; image after deletion: `404`.
- Working generation through the migrated `try_on_usage` table confirms the production usage migration is active.

## Deferred launch gate

Per product-owner direction, Google sign-in is temporarily deferred. The production site remains owner-only while `TEST_LOGIN_ENABLED=true`; Test Login issues the same signed HTTP-only session and exercises the same protected generation and saved-look APIs. Test Login must be disabled and Google Identity Services verified before public access is enabled.
