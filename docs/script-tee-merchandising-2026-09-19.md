# Script Tee category merchandising

Live September 19, 2026, by owner request.

- Homepage T-Shirts category tile now uses Pittsburgh Original Script Tee 473689891's existing `/images/products/473689891/front.jpg`, with matching alt text. The tile still links to `/tees`.
- Default collection Featured order pins it fifth, after 471744647, 471744585, 471950476 and 471744283. The four-card homepage new-drop lineup remains unchanged.
- Price and alphabetical sort remain customer-controlled; the top-five guarantee applies to default Featured order.
- No source images, artwork, product names, prices, variants, checkout, shipping, catalog approval or feed logic changed.

## Verification

- Full suite: 321 tests passed; focused six-test merchandising suite passed again after normalizing CRLF in the source assertion. Production Cloudflare build passed.
- Actual live homepage tile visibly shows the Script Tee and opens the tee collection. Live DOM lists it fifth of 13 tee styles; all 13 primary images loaded.
- Desktop visual check passed at 1280px. Narrow viewport DOM check at 390px confirms responsive category geometry, correct loaded image, preserved first-five order and no horizontal document overflow; no physical iPhone test claimed.
- Before/after public product JSON, Meta CSV and Google TSV SHA-256 values are identical. Storefront 18 products / 102 variants; Meta 102 rows; Google 72 offers. Newer Google-held products remain excluded.
- No cart/order/payment, provider fulfillment, credential, scheduler, Meta/Google configuration or social action.

## Release

- Deployed source: `aaed589231d6211413d9c2cd5dd61c043ce08956`.
- Worker: `1ee7fd24-10e0-4d82-bab5-2099f2cfd189`.
- Next build: `Ru_qHFDA0-ClpfvyRwnFZ`.
