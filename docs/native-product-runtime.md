# Native Product Runtime

`NATIVE_PRODUCT_ENABLED=true` selects a small Cloudflare renderer for exact product HTML and current-build Next data routes. It requires the environment-scoped D1 catalog configuration. The renderer uses the existing Product page, App, Document, global CSS and styled-jsx components; it is not a second product design or catalog. The original Next client scripts hydrate the same page props and retain navigation, variant selection and cart behavior.

The Cloudflare build compiles those components with Next's SWC transform and bundles them with React's browser server renderer. It reads the current build ID and manifest, emits the existing scripts/styles, safely escapes hydration JSON and retains canonical ProductGroup metadata. Vercel-only Analytics is excluded from Cloudflare builds. A pure unavailable-state render warms component initialization at startup without provider/database access or a synthetic published product.

A single D1 JSON query retrieves only the requested approved product. Snapshot age and policy checks remain authoritative for display; missing products return 404, unavailable snapshots return 503 with no offers and Retry-After. Responses are no-store; Preview keeps noindex. There is no provider fallback. Explicit invalid/repeated variants remain unselected rather than silently selecting another size. Checkout separately resolves provider-authoritative prices.

## Verification and Maintenance

Run the Cloudflare build before generated-artifact tests, never concurrently. The renderer requires the pinned Next/React/OpenNext contracts already guarded by the prewarm build. Dependency upgrades need renewed HTML, style-hash, head metadata, script availability, escaping, SSR/client-navigation and real-browser hydration checks. This custom integration is a maintenance obligation, not a permanent framework compatibility guarantee.

Tests in `cloudflare-product.test.cjs` cover layout/head/schema/scripts, safe hydration, current build data routes, variants, HEAD, methods, missing/expired data and scope. Hosted desktop/mobile QA must additionally exercise gallery thumbnails, quantity, local cart, invalid variants and category-to-product client navigation without console hydration errors or missing media.

Disabling the flag restores the older Next product route, which has previously exceeded Free CPU. It is a functional troubleshooting fallback, not a capacity-certified production rollback. Production rollback remains the coordinated retained-host procedure.
