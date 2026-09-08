# Bounded Public Catalog Refresh

Cloudflare review uses a separate D1 database for public catalog data only. Customer, payment, review-invitation and email state stay in the existing communications database. The catalog must not keep that database awake with periodic reads.

`CATALOG_SNAPSHOT_ENABLED=true` and the `PUBLIC_CATALOG_DB` binding select this path. Initialize the fixed schema exported by `lib/catalog-snapshot.cjs` before enabling a new environment. An absent, expired or policy-mismatched snapshot returns 503; public requests never fall back to a full provider crawl.

The `1-56/5 * * * *` native schedule performs one approved-product GET and at most two D1 queries per step. A compare-and-swap version prevents concurrent/stale steps from advancing the cursor twice. Failed reads preserve the current snapshot and cursor. Only a complete owner-approved product cycle is published, in one atomic update; ignored/unavailable products are omitted. No orders, drafts, email or fulfillment are touched.

With 14 products the normal full cycle is approximately 70 minutes. The oldest source observation expires after 150 minutes, with at most an additional 60 seconds of existing in-isolate API caching. This is display/feed freshness, not payment authority: Checkout continues to resolve the requested variants and prices directly with Printful. New product IDs require the existing explicit curated approval and deployment. A policy change invalidates the old published snapshot immediately on read.

Normal catalog scheduling uses about 288 read-only provider calls and 576 single-row D1 queries per day. Include real storefront traffic and provider limits in the final capacity model. The customer communications scheduler's separate Neon compute allowance must also be checked; this catalog change does not certify that workload.

The catalog-only authenticated review bootstrap has its own short-lived `CLOUDFLARE_CATALOG_VERIFY_UNTIL` window. It cannot reopen the owner-email verification window or accept arbitrary SQL, recipients or product IDs. Close it after seeding. The native scheduler requires no publicly callable timer endpoint.

`node --test tests/catalog-snapshot.test.cjs` exercises the actual SQLite statements, atomic publication, races, removal, expiry, scope and fail-closed routing. `node scripts/profile-catalog.cjs` profiles local synthetic catalog workloads without provider credentials or network access. Local sampled CPU is not a substitute for hosted Cloudflare CPU measurements.
