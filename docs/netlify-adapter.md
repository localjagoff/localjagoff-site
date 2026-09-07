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

The native function entries use `.js` in this CommonJS package so the Netlify v2
dependency tracer retains the Stripe and Neon dependencies. Forced `.mjs` output
in the verified Windows CLI build dropped those dependencies despite a green
build. Verify the final archives by extracting them outside the checkout and
loading their generated entries, then confirm deployed tick/worker outcome logs.
Changing `node_bundler` alone does not override the v2 dependency tracer.

An explicit `COMMERCE_ENV=preview` build sets `X-Robots-Tag` to
`noindex, nofollow, noarchive`. This is search exclusion, not access protection.
Production must be rebuilt with its own environment, never promoted from a
test-configured artifact without rebuilding.

## Verification Required Before Cutover

### CLI Artifact Boundary

Prefer the complete `netlify deploy` build lifecycle. When deliberately separating
build and upload, publish the adapter's static output, **never raw `.next`**:

```powershell
netlify build --context production
netlify deploy --no-build --dir .netlify/static --prod --site <isolated-review-site-id>
```

The adapter temporarily swaps its static output into the publish directory during
its build/deploy hooks, then restores the raw Next build after completion. A later
standalone `deploy --no-build` using the configured `.next` path can upload server
artifacts and omit the proper public paths. Build success does not detect this.
Before calling a deployment healthy, verify every referenced CSS/JS/image URL and
the site's file inventory: no `server/`, `standalone/`, cache, trace or environment
files may be published. Remove superseded malformed test deployments, not only
their branch alias. Preserve safe production rollback artifacts separately.

`scripts/verify-netlify-review.cjs` requires explicitly isolated database/mode/origin
environment variables. It verifies static assets and server-file exclusion, paused
checkout, bad Stripe signatures, durable contact/replay/rate/CSRF behavior, host IP
header replacement, synthetic Printful signatures and runner/review guards. It
removes only its own contact/outbox fixtures; sending remains disabled. Genuine
Stripe delivery, actual scheduler logs and email delivery are separate gates.

- Actual hosted Stripe TEST Checkout, authoritative pricing, return origin,
  genuine delivery, raw signature verification, tamper/replay/pause tests.
- Deployed Printful signed endpoint, provider/mail exclusions and read-only token.
- Durable contact/review jobs, database concurrency and authenticated scheduling.
- Owner-only safe Resend test and owner-confirmed inbox/authentication headers.
- Mobile/desktop journeys, catalog/feed parity, domain/TLS and rollback evidence.

Free commercial use and quotas must be checked against current account terms.
No paid upgrades, production secrets, DNS switch or production merge are implied
by a successful local adapter build.

## Owner-Only Delivery Probe

`owner-mail-verification` is a separately authenticated, disabled-by-default
verification function, not a customer-email bypass. It requires explicit
`OWNER_MAIL_VERIFICATION_ENABLED=true`, a matching `OWNER_MAIL_VERIFICATION_SITE_ID`,
application preview mode, paused checkout and normal customer email disabled.
The existing cron secret authenticates an empty POST. The recipient, sender,
Reply-To, subject and clearly labeled test message are fixed in code; no request
payload may choose mail content. The isolated database retains one deterministic
outbox job with normal claim/hash/quota/23-hour ambiguity protections.

Use it only after owner approval of the domain-restricted Resend sending key and
the fixed owner-only test. Provider acceptance is not proof of inbox delivery or
SPF/DKIM/DMARC results. Check provider delivery evidence and have the owner check
their mailbox; the agent must not access it. After the test, set the verification
flag false and redeploy. Never activate ordinary preview/customer sending to run
this probe, reset a sent job or change its idempotency key for a retry.

Official references: [Next.js](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/),
[function runtime environment](https://docs.netlify.com/build/functions/environment-variables/),
[scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/),
[background functions](https://docs.netlify.com/build/functions/background-functions/),
[connection-IP header](https://answers.netlify.com/t/upcoming-change-stripping-exposed-netlify-headers-from-function-and-proxy-requests/52665).
