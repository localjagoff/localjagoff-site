# Featured Tee Drop And Clean Primary Mockups

## Scope

The homepage's existing featured section now presents, in order, Smoking 412 Smiley Tee (471744647), 412 Smiley Tee (471744585), Pittsburgh Original Tee (471744477), and Brushstroke Wordmark Tee (471744283). Four columns on desktop and the existing accessible horizontal mobile strip preserve the redesigned layout. The same single ID list leads the tee collection's Featured order; explicit price/name sorts still work. The secondary homepage selection returns to established designs without repeating a new-drop item. The existing hero remains unchanged.

Eight older tees reuse their already-reviewed, original 2000x2000 clean white-background front mockups as the primary image. No image pixels or garment artwork were changed. These files remain at their existing `/images/google/<ID>.jpg` paths; using them on the website does not change channel approval.

| ID | Product |
| --- | --- |
| 428851513 | Sideways 412 Tee |
| 428851608 | Steel City Shield Tee |
| 428851698 | 412 Keystone Crest Tee |
| 428982889 | Crowned 412 Tee |
| 429536493 | Pittsburgh 412 Arch Tee |
| 429728777 | 412 City Seal Tee |
| 429821634 | Wordmark Stamp Tee |
| 430964873 | Crowned 724 Tee |

All secondary gallery entries are retained in their previous order, including the Steel City Shield's back design. The four new tees already had clean front/back imagery. The three hoodies and two hats are outside the requested older-tee/shirt scope and retain their imagery. The T-Shirts category tile also uses the clean Crowned 412 front. No product, offer, checkout or provider configuration is changed.

## Artwork Recheck

Owner reports the earlier outside-print-area warning was not reproduced in their current designer inspection and no clipping was visible. A fresh read-only inspection on September 13 in this browser still displayed the banner on all four selected front layers, with Good print quality 384/389/407/402 DPI respectively. Each current provider front mockup was opened at large size: all lettering, borders, smiley details and brush strokes are visibly complete. No Save, Proceed, transform, crop or artwork modification was submitted.

The historical warning is not an established clipping defect or authorization to resize artwork. No current artwork correction is required based on the complete mockups and owner's check. However, it would be inaccurate to record the banner as universally absent: the owner/session discrepancy remains documented. A mockup is not a physical print proof. Do not reopen or automatically alter artwork solely because of that historical note.

## Channel Preservation

Website/Meta remain 17 products and 96 variants. Google approval remains the existing 13 groups/72 offers, with new four explicitly staged. On September 13 the refreshed Merchant account-issues screen says **No issues for you to fix**. No review/attestation, account setting, feed approval, price, identifier or Google image file was changed during this pass. That screen alone is not proof of every item's serving status; release of the staged products still requires a separate channel decision.

Original source images are reused byte-for-byte. Catalog publication uses the existing normal atomic refresh; no D1 mutation, forced refresh, freshness extension, credential, binding or cron change is made. The read-only D1 CLI query was denied with Cloudflare 7403; no permissions were expanded. Live API and sanitized scheduled catalog logs supply verification instead.

## Release And Verification

Initial code: `947f530`, pushed atomically to website main and fix/cloudflare-platform. Initial Worker: `52d69c80-0ac9-4f79-8649-527befc54cfd`; Next build: `atVc3szRHGf4jloZH11Ng`. Superseded by the final release below.

313 tests and 22 built-storefront smoke tests pass. Initial assertions referencing the old primary path were updated, while Google channel-isolation coverage retains an explicit legacy-image fixture. The final suite was run after the build completed because Worker tests import generated build artifacts.

Live verification commands: `node scripts/verify-featured-drop.cjs <pre-deployment-evidence-directory>` and `node scripts/verify-shipping-public.cjs`. The first compares every non-image product field and every secondary gallery entry against the captured production baseline, checks all primary images/product pages, and requires a byte-identical Google TSV. Final deployed verification and Meta ingestion are recorded in the private operations handoff.

No payment, Printful order/draft/fulfillment, customer email, advertising, social publication, new asset generation or spending occurred.

### Final Production Evidence - September 13, 15:18 UTC

- Final deployed code: `b3b69e47126dea84298bfdf265deefbb4146b572`, on main and fix/cloudflare-platform. Worker `cb9ae5d4-af28-48d8-9ea6-f19175bce1a2`; Next build `QhKXmR1qrZUYMmbTOaXUy`. Documentation/verifier commit `2601f8371bc8591b4a60c226685232f99b67af5e` is included.
- Final card fix prevents an old promotional secondary from replacing a clean tee primary on hover. All gallery views remain available; new-drop clean back-image hover remains unchanged.
- Normal atomic refresh published all 17 products; sanitized scheduled log `published_source_at=2026-09-13T14:52:43.914Z`, `catalog_published`, fresh. No forced snapshot mutation or expiry extension.
- Both deployed verification commands PASS: 17 product pages, 96 exact offers, 68 image requests successful; every non-image field and every secondary gallery entry matches the production baseline. All eight clean primaries are live. Final 313 tests and 22 smoke checks PASS.
- Desktop featured row, curated/price sorting, all eight older next/previous galleries, the Steel City Shield front/back composite, and all four new front/back galleries verified. New-drop larger-size prices remain correct. The homepage was visually verified at 1280px desktop and 390x844 mobile, including scrolling to the fourth card with no page overflow. A later product-detail mobile override did not apply (actual width stayed 1280px); that later check is desktop evidence only, not an iPhone test.
- Google TSV remains byte-identical, SHA256 `331b423b48db7ec94a989624b09994722df39214f965453f882f5e906286f534`, 13 groups/72 offers, all four new IDs excluded. Google account issues now says No issues for you to fix; products heading says Your products have been reviewed, 72 total, visible rows Approved. No Google mutation performed.
- Meta existing feed import September 13, 11:15 AM Eastern: 96 updated or added, 0 removed, 0 failed, 0 issues. Live CSV SHA256 `3650e9f3d845ef59d4474020e4e1664ad81a209bcccfcad5efc77271f2c56b68`. Existing hourly source/catalog retained; no Shop or Pixel reconfiguration.
