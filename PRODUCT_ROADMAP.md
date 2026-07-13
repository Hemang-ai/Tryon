# Try-it-on product roadmap

## Product promise

Help a shopper answer “does this suit me in this exact color?” in under one minute, without implying that an image can guarantee physical size or fit.

## Customer evidence shaping the product

- Google/Ipsos reported that 42% of online shoppers did not feel represented by model imagery and 59% had been dissatisfied because an item looked different on them than expected. This makes the shopper's own photo—not a generic model—the core input. [Source](https://blog.google/products-and-platforms/products/shopping/ai-virtual-try-on-google-shopping/)
- Baymard's ecommerce research recommends visible, interactive color swatches for visually driven products. Color is therefore a first-class choice that changes both the product preview and generated try-on. [Source](https://baymard.com/blog/mobile-interactive-color-swatches)
- Google recommends clear, high-resolution product images with limited distractions for virtual try-on. The upload guidance and catalog examples reinforce that behavior. [Source](https://blog.google/products-and-platforms/products/shopping/google-ai-merchants-tips/)

## Launch customer journey

1. Sign in with Google.
2. Land on the Dashboard; no generation or personal storage API is available before authentication.
3. Choose one of seven wearable categories and start with a working example product.
4. Choose a visible color variant or upload a replacement product.
5. Upload a half- or full-body photo; the product explains which framing is required.
6. Generate and compare before/after.
7. Save the look privately or permanently delete the look and all associated images.

## Release 1 — customer-ready foundation

- Google OAuth authorization-code flow with PKCE, state, nonce, verified ID-token signature, and HTTP-only signed session.
- Google Gemini 3.1 Flash Image generation with stateless interactions (`store=false`).
- Clothes, eyewear, headwear, jewelry, watches, bags, and shoes.
- One licensed example product per category plus customer product uploads.
- Functional variant recoloring in the product preview and explicit color instructions in the generation request.
- Adaptive half/full-body framing, zoom, and vertical positioning.
- Private saved looks backed by D1 and R2, including user-controlled permanent deletion.
- Clear “style preview, not fit guarantee” language.

## Release 1.1 — merchant pilot

- Merchant catalog import with SKU, variant, availability, and attribution metadata.
- Product-detail deep links and add-to-cart handoff.
- Background jobs, idempotency keys, retry policy, and generation status history.
- Consent timestamp, retention deadline, provider, latency, and deletion audit metadata.
- Category-level quality scoring and a “report inaccurate preview” action.

## Release 1.2 — conversion and trust

- A/B testing for preview-to-product and preview-to-cart conversion.
- Merchant dashboard: generation success, save rate, variant engagement, product clicks, and reported quality issues.
- Accessibility review covering keyboard flow, focus order, screen-reader status announcements, and contrast.
- Abuse controls, rate limits, image moderation, and per-account generation budgets.

## Release 2 — fit intelligence

- Optional measurements and brand size-chart ingestion.
- Separate size recommendation from appearance visualization; never infer a guaranteed fit from one photo.
- Multi-item outfit composition after single-item fidelity meets the launch quality threshold.
- Regional privacy and retention controls for merchant deployments.

## Launch scorecard

- Photo acceptance: at least 80% on first upload.
- Successful generations: at least 95%, excluding invalid inputs.
- Median time to preview: under 45 seconds.
- Identity-preservation and product-fidelity review: at least 90% pass rate by category.
- Saved-look deletion: 100% removal of metadata and all associated objects.
- Zero unauthenticated generation or personal-storage access.
- Pilot target: measurable lift in product engagement without an increase in misleading-fit complaints.

## Explicit non-goals for Release 1

- No claim of size accuracy or guaranteed physical fit.
- No checkout, fake pricing, fake inventory, decorative swatches, or controls without working behavior.
- No use of customer photos for training and no automatic storage of generation inputs.
