# Catalog and Google readiness - September 13, 2026

## Scope and shipping basis

Owner authorized two deleted-product removals, artwork-grounded names, verified garment-quality copy, and shipping consistency. No prices, variant IDs, payments, Printful orders, social posts, ads, Pixel settings or Shop configuration are changed.

Normal paid Printful drafts must be reviewed, approved and paid by the owner within a maximum of 2 business days. Release can occur immediately. Printful's current production estimate is 2-5 business days after release, including its waiting-for-fulfillment period; do not add that provider queue twice. US Standard transit is 3-4 business days after fulfillment. Google handling is therefore 2-7 business days, transit 3-4, Monday-Friday. Retain the existing 2 PM America/New_York cutoff and $5.99 per-order shipping. Google can add a business day after cutoff. These are estimates, not guaranteed arrival dates.

Sources inspected: [Printful fulfillment definition](https://help.printful.com/hc/en-us/articles/360014007980-How-long-does-fulfillment-take), [current production estimates](https://www.printful.com/recent-updates), Local Jagoff store 18032822 Standard shipping settings, and [Google delivery calculation](https://support.google.com/merchants/answer/14949917).

Future Stuff N'at remains unpublished with its separate owner-fulfilled 3-5 business-day handling plus carrier transit profile. Before such products become live, create a separate labeled Google shipping service, stop the Printful service applying to all products, and disclose that mixed orders may ship separately. No future inventory/listings created.

Operational blind spot: the two-day owner release commitment is now customer-facing. The owner remains primary with no backup assigned, an acknowledged key-person risk; missed release commitments must be escalated, not concealed in provider estimates.

## Stable-ID name mapping and blank verification

All 11 apparel model identities were read in authenticated Printful product details. Current live apparel colors are Black. Hat names are unchanged.

| ID | Previous name | New name | Verified blank |
| --- | --- | --- | --- |
| 428821578 | Pittsburgh Local Jagoff Keystone Hoodie | Steel City 412 Crest Zip Hoodie | Gildan 18600 |
| 428851513 | Local Jagoff 412 Sideways Tee | Sideways 412 Tee | Cotton Heritage MC1082 |
| 428851608 | Local Jagoff Steel City Front and Back Tee | Steel City Shield Tee | Cotton Heritage MC1082 |
| 428851698 | Local Jagoff Keystone 412 Tee | 412 Keystone Crest Tee | Cotton Heritage MC1082 |
| 428851907 | Local Jagoff Trucker Cap | Local Jagoff Trucker Cap | Headwear; no apparel claim |
| 428980566 | Local Jagoff Trucker Hat | Local Jagoff Trucker Hat | Headwear; no apparel claim |
| 428982889 | Local Jagoff Keystone Tee | Crowned 412 Tee | Cotton Heritage MC1082 |
| 428983169 | Local Jagoff Keystone 412 Hoodie | Crowned 412 Hoodie | Cotton Heritage M2580 |
| 429208592 | Local Jagoff Keystone Hoodie | Pittsburgh 412 Arch Zip Hoodie | Gildan 18600 |
| 429536493 | Local Jagoff 412 Tee | Pittsburgh 412 Arch Tee | Cotton Heritage MC1082 |
| 429728777 | Local Jagoff Stamp Tee | 412 City Seal Tee | Cotton Heritage MC1082 |
| 429821634 | Local Jagoff Tee | Wordmark Stamp Tee | Cotton Heritage MC1082 |
| 430964873 | Local Jagoff Keystone 724 Tee | Crowned 724 Tee | Cotton Heritage MC1082 |

Shared reusable marketing data is in `lib/product-merchandising.cjs`. MC1082 is truthfully positioned as premium soft-washed, 5.5 oz midweight combed ring-spun cotton, not heavyweight. M2580 is 8.5 oz cotton-face fleece (65/35 Black), and Gildan 18600 is 8 oz 50/50 soft fleece with a full metal zipper. No unsupported shrinkage/durability guarantees.

Specification sources: [MC1082 manufacturer](https://www.cottonheritage.com/product/MC1082/Mens-Premium-Short-Sleeve-Tee.html), [MC1082 specification PDF](https://www.cottonheritage.com/catImg/product_spec/MC1082_ProductSpecs.pdf), [M2580 Printful](https://www.printful.com/custom/womens/hoodies/unisex-premium-hoodie-cotton-heritage-m2580), [Gildan 18600 Printful](https://www.printful.com/custom/mens/hoodies-sweatshirts/unisex-heavy-blend-zip-hoodie-gildan-18600).

## Deleted products and safe snapshot transition

430697388 (PGH OG Tee) removed from approval, names, imagery mapping and Google attributes. Obsolete hidden-product configuration for 430925200 removed. New checkout resolution rejects any unapproved product before provider access, without changing historical paid metadata parsing. Historical/negative fixtures remain where meaningful. Unreferenced original art is retained as history, not an offer.

Before deployment the authoritative provider-backed live catalog already contained 13 products / 72 variants. The database policy still named the former 14-ID allowlist. Explicit removal-only snapshot compatibility accepts that exact previous policy, filters the retired product and overlays current merchandising, preserving original snapshot age and remaining offers while the normal refresh transitions to 13 IDs. Unknown policies still fail closed. This exception must not be broadened to authorize future products.

## Verification

Final verification: 309 tests and 22 built storefront smoke tests pass; production OpenNext build succeeds. Live checks confirm 13 products / 72 variants, all 13 landing pages and clean Google images, consistent Google/Meta/OpenAI/JSON-LD titles and offers, and no live offer for either retired product. Remaining product/variant IDs, prices, currency, size, color and availability match the pre-edit baseline. One-size hat variant labels are normalized to Black / One size without changing their product names.

Production code commits: 04b22a2dc8b21b7853361876534ff30b9b60610d and c1b327c17ebe76cd2980085d3cb84b72b0cb5ef8, pushed atomically to main and fix/cloudflare-platform. Final Worker version d43cdcaf-82a2-4297-9eac-86a2cba2c1d7; Next build UH6wENKVFFVxVjHazqUYA. Desktop and 390px mobile-size browser checks cover home, all three apparel/headwear categories, representative product galleries/fabric/size controls, cart and an unpaid Stripe handoff. No payment details, purchase or Printful order were created; the QA cart was restored empty.

Google shipping saved as Printful made-to-order US: 2-7 handling + 3-4 transit business days, Monday-Friday, 2 PM Eastern cutoff, $5.99 per order. Six retired PGH OG variants archived; ten older manual items remain archived. Only account-level Misrepresentation remains; owner attestation and review request are not submitted. Full provider-UI ingestion evidence, readiness boundaries and owner action are recorded in the private operations handoff.
