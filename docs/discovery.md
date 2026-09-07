# Organic Discovery and Catalog Sync

## Implemented Surfaces

- `/sitemap.xml`: server-generated canonical public URLs from `getCatalog()`, plus existing public informational/game pages. Includes tees (including the existing 724 section), hoodies and hats only when populated. No new category pages, query variants, private paths, or fabricated modification dates.
- `/feeds/products.tsv`: Google text-feed format, one sellable catalog variant per row. Also an export candidate for OpenAI's Google-compatible path after format confirmation and identifier enrichment.
- `/feeds/openai-products.jsonl`: native OpenAI discovery records, stable item/group IDs and selected variant URLs. Search enabled; Ads and checkout explicitly disabled.
- Product JSON-LD: server-rendered `ProductGroup` with every eligible variant's exact price, currency, size/color and Offer URL. Catalog content supplies the markup; no review aggregates, GTINs, shipping promises or unconditional return terms are invented. No product markup is emitted when the product is unavailable.
- `robots.txt`: public crawling allowed, with one shared rule group for general crawlers and OAI-SearchBot excluding admin, API, customer/account/private and transactional/review paths. Feeds live outside `/api` so they remain crawlable.
- `llms.txt`: existing public shop, policy and contact links, with truthful shipping/fit limitations. This is navigation guidance, not a guaranteed ranking or ingestion mechanism.

All dynamic exports load `lib/catalog.cjs`. Its full pagination and sellability rules govern inclusion. Export responses are `no-store`; the shared catalog can reuse its existing successful 60-second snapshot. An upstream or serialization failure returns 503 and Retry-After, never a successful partial export. HEAD validates the same snapshot without sending a body. No request submits data to a provider.

## Required Commerce Policy Coordination

`lib/commerce-policy.cjs` now owns the shared approval gate:

1. Maintain an explicit `APPROVED_PRODUCT_IDS` set containing only owner-approved products. Establish its initial entries from the owner's approved inventory, not from all discovered Printful products or name overrides alone.
2. Require `APPROVED_PRODUCT_IDS.has(Number(product.id))` inside `productVisible`, alongside positive-ID validation, the hidden-ID exclusion, and `is_ignored === false`. Keep all existing variant eligibility checks.
3. Unknown/new sync products default to unpublished until the owner approves their identity, design/images, name/category, variant choices, retail amounts and fulfillment details. Approval must not be inferred from `synced`, `active`, or `is_ignored`.
4. Test that unapproved products are absent from listing, direct product reads, feeds, sitemap and checkout; then prove an approved fixture appears consistently. Clear old catalog snapshots or redeploy when changing approval policy.

The initial explicit list contains the 14 existing owner-approved public products, reconciled against the current public feed and Meta catalog, not all Printful products or name overrides. Discovery has no second approval list. Approved additions and changes appear on the next successful catalog refresh; removals leave subsequent exports. This is pull-based sync, not a webhook or provider upload scheduler.

## Feed Readiness and Access Blockers

These source implementations do not establish merchant-account approval, domain verification or provider ingestion. Current account-specific evidence and human verification requirements belong in the private operations handoff, not this public technical guide. Review endpoints must remain noindex; production submission requires the corresponding deployment and provider gates.

OpenAI native records follow the current stable discovery specification. Optional unknown data is omitted; the restricted returns policy is linked without asserting general return acceptance. The separate Google-compatible importer requires confirmed format selection and identifiers (or a verified absence of assigned identifiers). Do not substitute Printful SKU/sync IDs for GTIN or MPN. See [OpenAI product specification](https://developers.openai.com/commerce/specs/file-upload/products).

An HTTP feed URL alone does not establish OpenAI merchant ingestion. The documented file-upload path requires onboarded SFTP delivery and compressed snapshot files; this code exports uncompressed source JSONL/TSV for a future authorized delivery job. OpenAI can retain omitted records for up to 14 days. An eventual job needs durable previous inventory and explicit `is_eligible_search=false` tombstones for prompt withdrawal, followed by validated upload. These current-state routes cannot emit tombstones for vanished products. See [OpenAI file delivery and retention](https://developers.openai.com/commerce/specs/file-upload/overview).

The Google export is format-compatible, not a claim of Merchant Center approval. The normalized catalog does not provide verified age group/gender, assigned GTIN/MPN or confirmation that identifiers do not exist. Missing color/size may also require enrichment. Product-level images are reused because the catalog has no variant image mapping; verify each color's image and selected landing page before import. Apparel requirements and account shipping settings must be satisfied with verified data. See [Google product data requirements](https://support.google.com/merchants/answer/7052112).

The catalog exposes sellable variants only; unavailable variants disappear rather than becoming out-of-stock feed rows. Downstream stale records may persist on failure or retention. Checkout revalidation remains necessary. Product descriptions are the catalog's existing generic descriptions; measurements, materials, shipping cost/delivery times and variant photography need authoritative enrichment upstream. Terms allow defect-related claims within 14 days, not change-of-mind returns.

The native OpenAI export rejects duplicate option combinations within a product group instead of inventing a distinguishing attribute. If the upstream catalog lacks enough size/color data to distinguish two variants, enrich it before publishing that feed. Additional images are limited to ten extra views and commas inside image URLs are percent-encoded.

## IndexNow Integration

`lib/discovery.cjs` exports:

- `discoverySnapshot(products)`: deterministic public product fingerprints from a complete catalog snapshot.
- `changedDiscoveryUrls(previous, current)`: additions, content/offer changes and removals, plus homepage and affected existing categories. Stable snapshots yield no URLs; reordering variants does not create changes.
- `indexNowPayload(urls)`: canonical-origin/public-path validation, deduplication, 10,000-URL limit and explicit root-level verification location.
- `submitIndexNow(urls, { fetchImpl })`: explicit, bounded POST to IndexNow; no retries or work for an empty batch. Reports 200 or 202 acceptance; rejects other responses.

`/indexnow-key.txt` serves only the public verification key embedded in the helper. It is intentionally public and grants no commerce/admin access. Never replace it with any service credential. No public submission endpoint exists.

A future authorized production job should load and validate the entire catalog, compare with the previous successful snapshot in durable storage, chunk changed URLs into batches of at most 10,000, and checkpoint only after successful submission. Persist batch progress to handle partial batch failure. Preserve the previous snapshot on upstream/IndexNow failure. Initial seeding should be deliberate (`previous=[]` submits current products); page/feed GETs never call this job. Owner revocation/removal still submits the prior product URL so a crawler can see its 404. Deploy the public key first; previews must not submit.

IndexNow acceptance does not promise indexing. Bing participates; this is not a Google submission API. See [IndexNow protocol](https://www.indexnow.org/documentation). Canonical sitemap URLs and omission of unreliable lastmod follow [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Verification

Run `node --test tests/discovery.test.cjs tests/catalog.test.cjs` and the repository's existing test suite. Tests use fixtures and mocked network transport, not live credentials or submissions. Deployment smoke checks must later verify public feed MIME/status, real catalog/variant images and links, key retrieval, robots and the canonical sitemap after the production gate is removed.

Local checkpoint (2026-09-07): the 54-test commerce/catalog/discovery regression passes, including SWC compilation of actual Next routes and product page, fixture requests through `getServerSideProps`, server-rendered JSON-LD, script-escape/outage checks and unapproved-product exclusion. The Stripe test double now supports the fetch transport used by the Cloudflare runtime. Next/OpenNext review builds pass. Hosted feeds and production merchant ingestion remain separate verification gates.

Google variant rich results additionally require distinct selectable variant URLs and accurate page content; see [ProductGroup guidance](https://developers.google.com/search/docs/appearance/structured-data/product-variants). The existing page already selects `?variant=<id>`. Missing dimension metadata is omitted, which can reduce eligibility. OAI-SearchBot rules follow [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots). Robots rules guide cooperative crawlers; they do not authenticate private routes or remove already indexed URLs. Existing deployment authentication and preview noindex controls remain separate prerequisites.
