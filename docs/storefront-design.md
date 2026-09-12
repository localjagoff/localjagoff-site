# Storefront Design

The later [Google listings and two-game arcade release](google-arcade-release.md) records the current September 12 production version and supersedes only the arcade/contact presentation and Google-specific feed imagery described below.

The September 12, 2026 redesign is a frontend replacement around the existing commerce contracts, not a checkout or catalog rewrite.

## Structure

- Homepage: approved hoodie imagery, current featured products, category browsing, selected products, brand story, small goods, community/arcade and footer.
- Shared merchandise navigation: T-Shirts (/tees, including 724), Hoodies (/hoodies), Hats (/hats), Stuff N'at (/stuff-nat).
- lib/storefront.cjs owns display-only category/filter/sort/price formatting helpers. It never sets authoritative provider prices.
- New products still require the existing curated approval process. Approved small-goods records can use category/subcategory/name matching; an empty category never invents products.
- Product pages preserve server props, original variant IDs/prices, cart events, reviews and checkout helper. Related products reuse the public snapshot.
- Native dialog cart and image-preview focus containment provide keyboard access. Existing touch-swipe handlers remain in the gallery. Responsive rules use explicit breakpoints, stable image dimensions and reduced-motion support.
- Site footer links established Contact, legal, story and arcade routes without duplicating their forms or games.

## Verified Release

Frontend commit fd2c78d032e4adef1329359144c98f5d10b530e5; production Worker f0738898-530d-45e0-a9e8-d42141ae4c97; build fRDc0dUHNoAbJvJ3q4eLR.

294 automated tests and 18 built smoke checks passed. Production desktop/mobile visual QA covered home/categories, product galleries/sizes, cart, actual unpaid Stripe handoff, Contact availability/required fields and retained routes. The QA cart was restored empty. No payment, fulfillment or email was created.

Live catalog remains 14 products / 78 variants (9 tees, 3 hoodies, 2 hats). Both catalog feeds retain 14 groups / 78 rows; the sorted id|price|availability SHA256 matches the pre-deployment baseline: 245757971F23C8A7CFE9A9D824E5150994CFCD72993C1F3E9C7D41D183695534. No backend, provider configuration, cron, stock-policy or price changes.

Full operator evidence and limits are in the private creator-ops repository, facebook-creator/commerce/storefront_redesign_2026-09-12.md. Native iPhone swipe behavior is not claimed hardware-tested. Existing imagery contains some baked-in marketing overlays; a consistent future photography set remains an opportunity, not an invented product replacement.
