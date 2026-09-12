# Google Listings And Arcade Release

September 12, 2026. This release preserves the September storefront and commerce contracts.

## Production

- Google feed/image code: 459511ec756b999fad92c92d2515d99bbd4d7538.
- Arcade/contact/shipping disclosure code: e441f87fefedcf75d33edb16c182389e481b659a.
- Current Cloudflare Worker version: ddaf5af3-a29b-4258-9ef1-e3cfd9d5f057.
- Build ID: XsOJUBGF-naFFAPWUamhn.
- Canonical origin: https://www.localjagoff.com.
- Earlier Google-only deployment: 788fbb13-58be-41c2-bffd-39cefffce46c.
- No commerce endpoint, executor, snapshot, provider credential, binding, production flag, cron, DNS or fulfillment behavior changed.

## Google Projection

The existing /feeds/products.tsv remains the one authoritative Google endpoint, derived from the curated snapshot. lib/google-listing-policy.cjs adds reviewed apparel attributes and clean main-image paths only inside googleTsv. Storefront/Meta/OpenAI image projections and all offer IDs, variant links, prices and stock remain unchanged.

The 14 public/images/google files are original Basic/front Printful mockups of the actual approved products, downloaded from the existing product UI. Product designs were not regenerated. The Google main image no longer relies on a promotional border/logo/URL overlay. See Google's [image requirements](https://support.google.com/merchants/answer/6324350?hl=en).

The reviewed product table uses adult, male for the actual men's base tees, and unisex for the actual unisex hoodies/caps. Custom Local Jagoff products without assigned GTIN/MPN use identifier_exists=no; blank-garment identifiers are not borrowed. Unknown unreviewed products fail closed in this projection rather than receiving guessed attributes. Maintain this table when approving future catalog additions. See [identifier guidance](https://support.google.com/merchants/answer/6324478?hl=en).

Feed ingestion success is not Google account-policy approval. The remaining Merchant Center owner attestation and exact account/source evidence are in the private operations record, not represented as a code fix.

## Two-Game Arcade

Public offerings are /jagoff-jump and /yinzer-invaders, reached through /arcade and the existing homepage/footer. Four retired routes use reversible temporary redirects to /arcade and are removed from discovery. Exact prior implementations remain in legacy/arcade and Git history.

Phaser 3.90.0 is pinned and dynamically loaded only on the game routes. Its Arcade Physics handles collisions. All scene art is local, custom SVG designed for these games.

- Jagoff Jump: four-frame runner, scrolling city/bridge, chair/cone obstacles, collectible crowns, buffered jumping, elapsed-time difficulty with physically clearable capped spacing, distance/collectible score.
- Yinzer Invaders: keystone ship, advancing formations, waves, three shields, hit invulnerability, escalating capped difficulty, separate gold player and coral enemy projectiles.
- Shared ready/play/pause/game-over/restart states; guarded browser-local personal best; muted-by-default optional Web Audio accents; keyboard and large touch controls.
- Pointer cancellation/capture cleanup, keyboard Tab escape, blur/hidden-page pause, reduced-motion behavior and labelled controls.
- No score API, account, leaderboard, commerce calls or recurring network activity. Bounded bullet/particle pools and offscreen cleanup. Idle loops sleep; route teardown wakes a sleeping loop for Phaser's deferred destroy, removes handlers and closes audio.

Canvas gameplay is not a screen-reader-equivalent game; surrounding navigation, controls and status have accessible labels. Physical iPhone hardware testing and long-session soak testing remain separate follow-ups.

## Existing Contact Form

The established /contact form was inspected and tested before editing. Only scoped presentation/copy/navigation changed: gold/black styling, game-feedback context and an arcade return link. Backend, required-field validation, signed challenge, origin/body checks, honeypot, rate limits, deduplication and durable email queue are unchanged. Shared review-page styles are not globally recolored.

One owner-authorized contact QA message was accepted with the live "Message received" state before this presentation-only release. This proves acceptance/queueing, not independent provider delivery or inbox receipt. Final mobile validation was checked without sending a duplicate message.

Terms now state the existing US-only $5.99 shipping charge and made-to-order status from the checkout contract; no rate or return rights were changed.

## Verification

- Clean Cloudflare production build passed.
- 301 automated tests passed; 22 built storefront smoke checks passed.
- Live desktop and mobile-size browser checks: two-game landing, actual canvas rendering, keyboard jump/fire/pause, touch jump and drag-to-move/fire, score, game-over/restart and local best.
- Local responsive checks included 390 and 320 pixel viewports; production mobile check used a 390x844 override (375 pixel content width after scrollbar). No horizontal overflow or broken game assets observed. One canvas per game. No runtime console errors observed.
- Homepage, collections (9 tees / 3 hoodies / 2 hats), product image/sizes, cart and actual unpaid Stripe handoff passed.
- Live Keystone Tee 2XL: $32 merchandise + $5.99 shipping = $37.99 hosted checkout. No customer/payment details entered, Pay not used; returned to the site and restored empty cart.
- Live /api/get-products exactly matches pre-release prices, variants and availability: 14 products / 78 variants.
- Google TSV and Meta CSV return HTTP 200, 14 groups / 78 offers; all Meta offers in stock.
- git diff --check passed. npm audit --omit=dev reports zero vulnerabilities. Three existing dev-chain high advisories remain under Wrangler/Miniflare/nested Sharp; hosting-tool upgrades were deliberately not bundled into this release.

No purchase, Printful order/draft/fulfillment, ads, social publication or spend occurred. One owner-only contact QA submission occurred; no customer order email was generated.

## Operator Handoff

Full private evidence: facebook-creator/commerce/google_arcade_release_2026-09-12.md in localjagoff/facebook-creator-ops.

Do not treat a healthy feed as free-listing eligibility, or a browser-size test as physical-iPhone verification. Keep the separate Meta Page-identity mobile Shop case open; this release does not change its configuration.
