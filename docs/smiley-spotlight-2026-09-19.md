# Two smiley tees: storefront spotlight

Live September 19, 2026 Eastern, by owner request.

## Superseding White-only update

Later September 19, the owner withdrew Black approval for Beanie473808622 and confirmed deleting exactly its six Black variants from Printful. It now retains White S-3XL only. Website gallery/spotlight/copy use White; snapshot reads filter out stale Black variants/images immediately; new checkout rejects any non-White variant for this product. White IDs/prices and all other19products, including Snapback473808088, remain unchanged.

Live catalog is now20products/120variants; Google remains byte-identical13groups/72offers. Meta September19,9:51PMEastern import:120updated,6removed,0failed,0issues. Actual withdrawn Black checkout returns400/Variant is unavailable/no Checkout URL;325tests/buildPASS. No artwork edit or order/payment. Earlier12variant/Black approval below is historical and superseded.

Update deployed source: `31f3b86c8f96dbbdd77cb9869fd69cdcef68ef62`; Worker `ddbf66a3-d891-44bd-94eb-77681746dc16`; build `of30dzs3qbEFHwrRIDdPe`.

## Products and presentation

- 473808622: **412 Beanie Smiley Backprint Tee**.
- 473808088: **412 Snapback Smiley Backprint Tee**.
- Both are Cotton Heritage MC1082 premium short-sleeve tees, in Black and White, S-3XL. Original retail prices are preserved: S-XL $35, 2XL $37, 3XL $39.
- Each has a small wearer-left chest print and a large back print. Unique descriptions and labeled front/back images make that distinction explicit.
- Eight original 800px Printful mockups were downloaded read-only from the product/variant previews. They were flattened on white and given a 40px neutral margin, then optimized as 880px JPEGs. No design regeneration, image crop, artwork or placement edits.
- The homepage's two-product **In the spotlight** section replaces the old secondary four-product row, immediately below the hero/brand strip. Black Beanie and White Snapback show large back and smaller front views.
- The original four-card new drop remains unchanged. Pittsburgh Original Script Tee 473689891 remains the T-Shirts category image and fifth in default Featured order; the two new tees follow in positions six and seven.
- Variant selection and variant-specific landing URLs choose the correct Black/White image. Galleries retain all four views and zoom. Meta and structured variant imagery use matching colors.

## Verification

- Full suite: **323 tests passed**. Production Cloudflare build passed.
- Live catalog: **20 products / 126 variants**. All prior 18 products deep-equal the pre-release API snapshot.
- Both new product pages return 200 with correct names, 12 variants each, original prices, and all eight local image files byte-equal to the deployed assets.
- Homepage and product presentation visually checked at 1280px desktop and 390x844 browser viewport; no horizontal overflow. All 15 tee primary images load. This is browser QA, not a physical iPhone test.
- White spotlight link selects White/S; White/3XL shows $39; switching Black selects the black image; back-gallery zoom works.
- Cart test: one new tee $35 + $4.95 shipping, with $25 remaining toward free US Standard shipping; two tees $70 and free shipping. Test cart restored empty; checkout/payment was not entered.
- Meta source 1828803941620725 imported **126 updated/added, 0 removed, 0 failed, 0 issues**, September 19 at 9:05 PM Eastern. Catalog shows 20 grouped products.
- Both new Meta groups show **Eligible**, **In stock**, 12 variants each, $35-$39.
- Google feed remains byte-identical: **13 groups / 72 offers**. Neither new product was released to Google.
- Existing shipping thresholds, prices, checkout, fulfillment, credentials, bindings, cron schedules, Shop configuration and Pixel remain unchanged.

## Review limits

Desktop Printful front-design previews showed a boundary warning; the original mockups show complete artwork. No artwork was moved or resized, and no physical print proof was ordered. A warning alone is not recorded as confirmed clipping. Storefront merchandising approval is not legal/IP clearance or a promise of future advertising-policy approval.

## Release

- Deployed source: `e27998ff88917c569f11aae3e44b0296958273d4`.
- Worker: `0c7bb806-7700-4a25-961d-e49aee88d446`.
- Next build: `or-j14uGGilsalQ1c92ym`.
- Atomic catalog snapshot published at 2026-09-20T00:58:52.274Z with source time 2026-09-20T00:55:21.928Z.
- The existing 18-product snapshot remained valid until the full 20-product refresh completed, without extending its original freshness.
- No purchase, payment, Printful draft/order/fulfillment, social publication, ad, or spend.
