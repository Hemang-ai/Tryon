# Try-it-on Product Requirements

## Product thesis

Try-it-on helps online shoppers answer “does this suit me?” before they buy. It accepts half-body and full-body photos, adapts guidance and placement to the selected wearable category, and clearly separates style visualization from exact size or fit prediction.

## Customer problem

Shoppers struggle to translate polished product photography onto their own body, face, height, and proportions. Existing try-on tools often create attractive images without explaining their confidence, hide their photo-retention practices, require a perfect full-body photo for every category, or imply physical fit that a single image cannot prove.

The first release therefore optimizes for three jobs:

1. Help a shopper submit a usable photo on the first attempt.
2. Show one selected wearable on the shopper with minimal waiting and friction.
3. Communicate what the preview can and cannot reliably tell them.

## Supported categories

- Clothes: tops, bottoms, dresses, outerwear, and one-piece garments.
- Eyewear: sunglasses and optical frames.
- Headwear: caps, hats, scarves, and head accessories.
- Jewelry: earrings, necklaces, pendants, rings, and bracelets.
- Watches and wrist wearables.
- Bags and shoulder accessories.
- Shoes and footwear.

Each category must provide its own photo framing guidance, product-image requirements, placement model, quality checks, and accuracy disclaimer.

## Primary journey

1. Shopper chooses a wearable category.
2. Try-it-on explains whether a face, half-body, wrist/hand, or full-body photo works best.
3. Shopper uploads their photo or continues with the sample.
4. Shopper selects a catalog item or uploads a product photo.
5. Try-it-on validates file type, size, visibility, lighting, pose, and likely occlusions.
6. Shopper generates a preview and sees an honest progress state.
7. Result opens with a before/after scrubber, confidence cues, and a “style preview—not an exact sizing guarantee” disclaimer.
8. Shopper can save, retry, replace either image, or continue to a retailer.

## Functional requirements

- Accept JPG, PNG, WebP, and HEIC inputs up to 20 MB.
- Support drag-and-drop, file picker, touch, and keyboard input.
- Detect photo framing and route it to the selected category workflow.
- Preserve the person’s identity, body proportions, pose, skin tone, and background.
- Preserve the product’s color, silhouette, texture, logos, and key details.
- Use category-specific placement instructions and photo requirements while keeping one maintainable Google-native image engine.
- Return a result, actionable error, or retry path within 30 seconds; target under 8 seconds for face accessories.
- Provide original/result comparison, retry, save, replace-photo, and replace-product actions.
- Never imply the visualization proves physical size or comfort.

## Trust, safety, and privacy

- Obtain plain-language consent immediately before upload.
- Encrypt images in transit and at rest.
- Default to deleting original and generated photos within 24 hours.
- Do not use customer images for training without separate, explicit opt-in consent.
- Block sexualized transformations, minors in inappropriate categories, non-consensual images, and identity-changing requests.
- Provide immediate deletion and account-level retention controls when accounts are introduced.
- Keep an auditable record of consent, processing provider, retention deadline, and deletion outcome without retaining the image itself.

## Architecture recommendation

- Frontend: responsive Next.js/Vinext experience with client-side validation and instant local previews.
- Orchestration API: accepts a person image, product image, category, and optional fit intent; validates and routes the request.
- Image generation: Google Gemini 3.1 Flash Image through the stateless Interactions API, receiving the normalized person and exact product as separate reference images.
- Placement: strict per-category prompts preserve person identity and product fidelity while specifying anatomical placement, occlusion, scale, perspective, lighting, reflections, and contact shadows.
- Privacy: send `store=false` on every Gemini interaction so uploaded customer images are not retained as Interaction objects.
- Storage: short-lived encrypted object storage with lifecycle deletion; store only processing metadata and derived quality signals long-term.
- Identity: require Google OAuth before the dashboard or any generation/storage API is available. Use authorization-code flow with PKCE, verified ID-token signatures, short-lived state/nonce cookies, and a signed HTTP-only application session.
- Queue: asynchronous jobs with idempotency, retries, timeout handling, and provider fallback.
- Observability: latency, generation failure, identity drift, product fidelity, retry rate, save rate, and downstream conversion.

## API contract

`POST /api/try-on` receives multipart fields `person`, `product`, and `category`. It sends both reference images to Google Gemini 3.1 Flash Image using the server-side `GEMINI_API_KEY`, requests a single 3:4 JPEG, and returns a private inline data URL. The API never returns a fake overlay when generation is unavailable.

## Success measures

- First-attempt photo acceptance above 80%.
- Median time from entry to first preview under 45 seconds.
- Generation success above 95% excluding invalid inputs.
- Preview-to-product click-through and add-to-cart uplift against control.
- Reduction in returns attributed to “didn’t suit me” or visual mismatch.
- Explicit trust score: percentage of users who understand that style preview is not a size guarantee.

## Phased delivery

- MVP: clothes and eyewear, upload flow, validation, sample experience, result comparison, privacy controls, provider abstraction.
- Phase 2: jewelry, hats, watches, bags, and shoes with category-specific routing; retailer catalog ingestion; saved looks.
- Phase 3: live camera AR, size recommendations using measurements and garment data, multi-item outfits, social sharing, retailer analytics.
