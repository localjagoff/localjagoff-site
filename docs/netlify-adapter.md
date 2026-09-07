# Netlify Commerce Adapter

The existing Next.js Pages Router UI and commerce handlers are preserved. This
adapter is a review candidate, not evidence of a completed production migration.

## Routing And Isolation

- `pages/api` wrappers preserve the existing checkout, webhook, catalog, feed and
  authenticated promo paths. Stripe webhook body parsing remains disabled.
- Stripe clients are initialized during a request, after checkout's pause guard.
  Missing secrets must not break the entire build or bypass a paused checkout.
- `SITE_ID` identifies the Netlify runtime. `COMMERCE_ENV=production` AND an exact
  `COMMERCE_PRODUCTION_SITE_ID` match are required for live fulfillment/mail.
  Without both, the site fails closed. Vercel continues using `VERCEL_ENV`.
- Netlify's `CONTEXT` is build-only; never fake `VERCEL_ENV=production` to migrate.
  Set `COMMERCE_ENV` through context-specific provider configuration. A production
  site's deploy-preview/branch contexts must explicitly stay `preview` and must
  not receive live credentials. Do not put live variables in all contexts.
- Use a separate TEST-only site, isolated database, Stripe TEST key, read-only
  product token and explicit `SITE_URL` before any production domain changes.
- Contact/reviews trust Netlify's connection-IP header, not client-provided
  `X-Forwarded-For`. Verify platform header replacement on the deployed candidate.

## Scheduled Work

`communications-tick` runs every five minutes (UTC), only on published deploys.
It dispatches an authenticated POST to the same site's background worker. The
worker checks the secret before storage/provider access and uses the existing
durable outbox, leases, replay protection, quotas and review eligibility checks.
The public Next API runner refuses long-running Netlify requests.

Background transport acknowledges `202` before executing the worker. That status
alone does NOT prove successful authentication, execution or sending. Check both
the tick and worker's sanitized outcome logs. Stripe and Printful webhooks remain
synchronous signature-verifying endpoints, not background acknowledgements.

The review site's published slot may be called `production` by Netlify so its
schedule can run; its application mode must nevertheless remain `preview` with
customer sending disabled. This is not the production store.

## Verification Required Before Cutover

- Actual hosted Stripe TEST Checkout, authoritative pricing, return origin,
  genuine delivery, raw signature verification, tamper/replay/pause tests.
- Deployed Printful signed endpoint, provider/mail exclusions and read-only token.
- Durable contact/review jobs, database concurrency and authenticated scheduling.
- Owner-only safe Resend test and owner-confirmed inbox/authentication headers.
- Mobile/desktop journeys, catalog/feed parity, domain/TLS and rollback evidence.

Free commercial use and quotas must be checked against current account terms.
No paid upgrades, production secrets, DNS switch or production merge are implied
by a successful local adapter build.

Official references: [Next.js](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/),
[function runtime environment](https://docs.netlify.com/build/functions/environment-variables/),
[scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/),
[background functions](https://docs.netlify.com/build/functions/background-functions/),
[connection-IP header](https://answers.netlify.com/t/upcoming-change-stripping-exposed-netlify-headers-from-function-and-proxy-requests/52665).
