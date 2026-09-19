# Script Tee and $60 Free Shipping

- Owner approved Printful product 473689891 for the storefront and appropriate non-Google discovery.
- Public name: Pittsburgh Original Script Tee. Cotton Heritage MC1082, Black, S-3XL. Retail prices remain $30/$30/$30/$30/$32/$34.
- Original provider-rendered front/back mockups; transparency flattened onto white with padding, no generated or altered artwork. Front design is complete; desktop Design Maker reports Good / 486 DPI.
- New Google presentation is staged, not released. The existing 13-group/72-offer Google set is unchanged.
- Existing featured four retain their order, including replacement 471950476 Official Local Jagoff Tee. Deleted 471744477 and unapproved 473417526 remain unavailable.
- Owner approved free US Standard shipping on orders of $60 or more on September 19. Eligibility uses the merchandise subtotal before promo discounts, tax and shipping. Applies to every currently authorized product, including mixed carts and separately packed hats.
- Checkout computes eligibility from provider-resolved unit amounts; browser price/subtotal/shipping flags cannot grant free shipping.
- Below $60, existing category rates remain unchanged. Fulfillment/transit estimates and order workflow are untouched.
- Shared announcement, cart drawer/cart-page progress, shipping policy/product disclosures and Google shipping threshold reflect the same rule.
- Google feed adds free_shipping_threshold(country:price_threshold)=US:60.00 USD, and qualifying single variants receive zero shipping cost. No Google attestation or new offer publication.
- This supersedes the earlier no-free-shipping recommendation by explicit owner direction. Detailed margin caveat and production evidence belong in private ops.

## Production Verification

- Deployed code: `967b937`; Cloudflare Worker version `8fc2d0b9-0757-44bc-b28b-7935c8395f12`; Next build `snTu8p3et5YLmc3nTAHJW`.
- 320 tests and production build passed. Live catalog is 18 products / 102 variants; all 17 pre-existing products deep-equal the baseline.
- Desktop product primary/gallery, collection, announcement, cart drawer and cart-page threshold transitions verified. Cart restored empty.
- Actual unpaid Stripe Checkout: one $30 tee plus $4.95 shipping = $34.95; two tees = $60 with free shipping; three tees = $90 with free shipping. No payment/customer data entered, payment completed, order created or fulfillment performed.
- Google existing source imported 72 updates / 0 new offers / no issues on September 19 at 2:24 PM Eastern. Existing reviewed products remain 13 groups / 72 offers; only shipping fields changed.
- Meta existing source imported 102 updated-or-added / 0 removed / 0 failed / 0 issues at 2:29 PM Eastern (last-updated time 2:30 PM). This is feed acceptance, not independent native-mobile Shop verification.
- Browser viewport override did not take effect in this session; mobile visual QA is not claimed. Desktop evidence and responsive CSS remain available.
- Provider internal title still displayed its original wording after an attempted rename; public storefront, checkout and feed names are canonical through the existing merchandising layer.
- No secrets, bindings, cron, Shop/Pixel configuration, Google approval set, product prices or artwork changed.
