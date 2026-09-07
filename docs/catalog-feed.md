# Catalog and Website Checkout

The website is the merchandising source of truth. Printful supplies current sync
relationships, retail amounts and availability; `commerce-policy.cjs` supplies
curated names, exclusions and the shared sellability predicate. Images remain in
the existing curated `product-images.cjs` map.

## Public Inventory

- Product and variant IDs must be valid and correctly related.
- Products and variants must explicitly not be ignored; variants must be synced,
  active, explicitly USD and have a positive valid retail amount.
- Unknown, inactive, out-of-stock, malformed and excluded items are not offered.
- Listing and feed reads paginate completely; any failed page/detail returns 503,
  never a successful partial feed or a zero-price placeholder.
- Successful listing snapshots live in process memory for at most 60 seconds.
  Expired snapshots are not served on failure. Checkout always reads the provider
  again. Availability can change between selection, payment and fulfillment;
  unresolved paid orders must follow the manual reconciliation runbook.

`/api/get-products` serves the curated sellable catalog. Product HTML and JSON-LD
are server-rendered from the same normalization. Unavailable products return 404;
provider outages return 503 with no Offer. The image optimizer remains disabled.

## Meta Feed

GET `/api/meta-catalog` returns UTF-8 CSV. Configure this URL as the catalog's only
scheduled authoritative replacement feed, with hourly refresh and removal of
items missing from a successful full feed. Do not import raw Printful products.

- One row per eligible sync variant.
- Stable ID: `lj_<product ID>_<sync variant ID>`.
- Parent group: `lj_<product ID>`.
- Curated title, description, image(s), USD retail price, size/color when present,
  brand Local Jagoff, new condition and provider-derived sellability.
- Product link: `/product/<product ID>?variant=<sync variant ID>`.
- The linked page selects that exact eligible variant. A stale/invalid variant
  does not silently substitute a different item and cannot be added until the
  customer explicitly selects an available variant.
- Browser cart values never control the Stripe amount. These links implement
  product-level website handoff. If Shop onboarding requires a separate multi-item
  cart-transfer URL, validate that contract separately before claiming Shop
  checkout readiness; do not substitute a generic localStorage-only cart URL.

A failed feed import can leave Meta's last successful inventory in place. Monitor
scheduled feed failures and inventory age; pause the catalog if failures persist.
Checkout revalidation is the final protection, not a claim of real-time Meta stock.

No Pixel is needed to serve this feed or resolve product links. Do not infer a
Purchase event merely from visiting `/success`.
