# Commerce Security Maintenance

Use `npm ci`, `npm test`, `npm run build`, `npm run test:smoke`, and `npm audit`
before a coordinated checkout/webhook release. Never promote the temporary
preview verification endpoint; it is intentionally absent from the final source.

## Framework Baseline

Next.js 15.5.25 is the supported maintenance-line upgrade from 14.2.35. This is a
Pages Router application using React 18, which this version supports. There are
no App Router Server Components/Actions, custom server, external rewrites, i18n
middleware routes, or public image optimizer. The 15.x App Router async-request
codemods therefore have no applicable source transformation here.

PostCSS is pinned through an override to 8.5.28. Although this application does
not accept customer CSS or source maps, the patched parser avoids retaining the
older vulnerable transitive dependency. Review the override during future Next
upgrades. Do not use `npm audit fix --force` without reviewing the resulting diff.

## Defense in Depth

- Server-authoritative product/variant/quantity/price and controlled return origin.
- Shared fail-closed catalog, schema, checkout and Meta sellability policy.
- Raw-body Stripe signatures with a 1 MiB body limit.
- TEST events return before Printful, email or order-state access.
- Store-unique external IDs, explicit `confirm=false&update_existing=false`,
  readback/retry recovery and persistent Stripe order linkage.
- Retired order/store/product diagnostic routes return only 404.
- Generic provider error responses, sanitized operational event/session logs.
- Optional order email uses a stable Resend idempotency key in addition to its
  persistent sent marker. Resend retains keys for 24 hours; unresolved longer
  persistence failures still require owner reconciliation.
- Keep Vercel protection enabled and official automation credentials private.

Vercel's platform limits are not a per-customer checkout abuse policy. Monitor
checkout request volume, 429/503 responses and provider cost. Do not add an
in-memory counter and describe it as a durable distributed rate limiter.

References:
- https://nextjs.org/support-policy
- https://nextjs.org/docs/app/guides/upgrading/version-15
- https://github.com/vercel/next.js/security/advisories
- https://github.com/postcss/postcss/security/advisories
- https://resend.com/docs/dashboard/emails/idempotency-keys
