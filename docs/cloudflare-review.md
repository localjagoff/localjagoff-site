# Cloudflare Review Runtime

This is a review implementation, not production capacity certification. Keep the production host unchanged until the private operational gates pass.

## Build and Isolation

Run `npm run build:cloudflare` with `COMMERCE_ENV=preview`. The pinned OpenNext build is followed by an explicit public static-route export and a tested startup preloading patch. Dependency upgrades must pass the patch guards and real workerd startup tests before deployment.

`wrangler.jsonc` targets review only. Checkout is paused and normal communications/customer email are disabled by default. Install credentials only through the provider secret store; never place credentials in Wrangler configuration, command arguments, logs, Git, or browser screenshots. Stripe review credentials must be TEST-only. Printful review tokens must not grant order creation or fulfillment access.

Vercel Git auto-deployment is disabled for `fix/cloudflare-platform` only. This preserves the existing production branch and rollback deployment while preventing review checkpoints from creating unrelated Vercel builds.

Public static pages use Workers Assets without invoking the server where eligible. Sensitive or personalized routes must never enter that static allowlist. Dynamic routes and errors retain Preview noindex protection. Robots directives do not replace authentication.

## Bounded Execution

Every API or scheduled invocation shares an AsyncLocalStorage fetch budget capped at 32. Nested calls inherit it. Redirects are rejected rather than silently consuming uncounted requests. Runtime correctness and subrequest counts do not establish compliance with the separate Free CPU limit; measure cold and warm hosted requests after relevant changes.

The API adapter reuses the existing commerce, contact, review and signature handlers. Raw signed bodies remain byte-preserving. Checkout pause is enforced before provider access. Public catalog snapshots may be reused for 60 seconds; incomplete or failed upstream reads must not become successful partial feeds.

## Scheduled Communications

Native timers separate due-message work, slower active-order fallback, and cleanup. Persisted next-due dates and lifecycle completion prevent repeated scans of completed orders. Customer communications require explicit production identity plus both communications and email flags. Printful remains draft-only, with separate manual owner confirmation/payment.

Temporary review helpers require an expiring window, exact review identity, paused checkout and authentication. Their fixed commands expose sanitized evidence only. Close their windows after verification and remove bootstrap-only code/credentials when no longer needed. Never deploy an enabled review helper to production.

## Legacy Host Compatibility

Rollback means restoring the exact retained old Vercel deployment, with the coordinated checkout/v2-webhook pair and its original runtime. It does not mean deploying this Cloudflare review branch to Vercel or Netlify.

This branch's retained Vercel cron route and Netlify worker use the runner's default `fast` mode. That mode only claims event reconciliation after due mail; it does not process due `fallback` orders or run cleanup. Running this branch on either legacy host requires explicit fallback and cleanup scheduling first. Cloudflare's native schedules already select `fast`, `fallback` and `cleanup` explicitly and are unaffected. Legacy scheduler behavior is unchanged by the transactional-mail fixes.

## Verification

Run the focused `cloudflare-*`, invocation-budget and worker-communications tests, then the critical commerce regression. Confirm hosted TEST checkout, authoritative pricing, Preview return URLs, genuine signed Stripe delivery, invalid signatures, no test fulfillment/email, native scheduler behavior and actual CPU/subrequest counts. Signed synthetic Printful fixtures do not replace genuine provider transport evidence; document the distinction and first-real-order observation requirement.

Production cutover requires a complete DNS/mail/verification inventory and a coordinated checkout/webhook rollback preserving outstanding sessions. Never roll back only the webhook or only checkout.
