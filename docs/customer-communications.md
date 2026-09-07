# Customer Communication Implementation Checkpoint

**Historical checkpoint at 580d088. Superseded by [the durable implementation](customer-communications-durable.md).** Keep the following as implementation history, not current status.

Status: **source-only foundation, not production ready**. Branch: `fix/customer-communications`.

This is not an active email queue, contact endpoint, review system, or scheduler. Do not merge this branch into production until the integration and deployed checks below are complete. Existing checkout, Stripe webhook, Printful draft handling, and live email behavior have not been changed.

## Implemented In Source

- Official human support inbox: `hello@localjagoff.com`, in the Contact page, footer, Organization structured data, product support copy, and legal contact links. Account-login identities are not part of this change.
- A responsive Contact layout using the existing navigation, typography, and brand image: dark canvas, white/gold hierarchy, visible direct email, labeled fields, topic-specific optional order reference, keyboard focus, bounded inputs, success/error states, and network timeouts.
- The form expects GET/POST `/api/contact`, which is **not implemented**. It disables sending and displays direct-email fallback when no challenge is available. Do not describe this as a working submission flow.
- Pure contact validation, same-origin checks, signed expiring minimum-age challenges, honeypot detection, and keyed IP-hash helpers. Actual server payload limits, durable rate limiting, single-use challenge consumption, and request deduplication still need integration.
- Branded HTML/plain-text paid-order, processing, package-shipment, and optional review-request templates. Receipt line subtotals and total breakdown must reconcile with paid USD Stripe data. Templates escape user/provider text and enforce authenticated sender/fixed contact recipient.
- Proposed sender: `Local Jagoff Orders <orders@localjagoff.com>`. Contact sender: `Local Jagoff Website <orders@localjagoff.com>`. Order reply-to is the human inbox; contact reply-to is the validated visitor address, never a spoofed From.
- A Resend send adapter with fixed endpoint, bounded timeout, deterministic idempotency header, sanitized errors, and explicit Production-only enablement. No live route calls it yet. It is not itself a durable outbox.
- Printful raw-body HMAC validation and event identity helpers. Retry count is excluded from the event identity. Actual signed provider deliveries, payload compatibility, durable replay suppression, and webhook configuration are unverified.
- Review-eligibility policy: fresh payment/fulfillment checks, whole-order shipment coverage, seven days after the last actual delivery, otherwise the latest trustworthy date-only ETA plus a conservative 12-hour timezone buffer and seven days. Unknown/problematic states fail closed. Replacement shipments require explicit owner reconciliation.

## Required Integration Before Rollout

1. Provision approved free durable storage without pulling credentials into files. Keep Production and test/Preview data isolated. Define bounded retention and customer deletion behavior.
2. Implement durable orders, packages, provider events, outbox, rate buckets, review invitations/submissions, and moderation records with unique constraints and atomic claims. Never depend on an in-memory timer.
3. Register paid-order confirmation from verified successful Stripe payment before Printful draft dependency. Preserve existing TEST early exclusion, outstanding-session compatibility, one-draft identity, and manual owner confirmation/payment.
4. Configure and verify real signed Printful events; reconcile authoritative provider state before notifying. `inprocess` means production has started; `pending` does not. Shipment mail is per package, not whole-order completion.
5. Add authenticated due-job execution, provider quota-aware retries, dead-letter/manual-review handling, and transactional claim/sent persistence. Resend retains idempotency keys only 24 hours. Ambiguous sends older than that require reconciliation, not a blind resend with a new key.
6. Add the bounded contact API with durable rate limits and fixed-recipient delivery. Prove successful receipt at the support inbox without creating a purchase.
7. Add a first-party product review page, purchase-bound opaque invitations, moderation queue, safe approved-only public output, and expiry/revocation. Keep emails, shipping addresses, order IDs, tokens, and internal moderation notes out of public output/logs.
8. Update privacy disclosures to match actual storage/retention and third-party processing once implemented. Correct success-page wording to reflect verified server payment state, not arrival at a URL.
9. Run isolated deployed tests, delivery/header verification, concurrent/restart/retry tests, and storefront/Meta checkout regression. Deploy the complete paired artifact only after the release gates pass.

## Verification At This Checkpoint

- `npm test`: 68 tests pass, including the original 40 commerce tests and 28 new template/policy/security helper tests.
- `npm run build`: passes.
- `npm run test:smoke`: 14 built-server checks pass.
- `npm audit --audit-level=low`: zero reported vulnerabilities.
- Browser inspection: desktop and 390/320-pixel mobile Contact layouts render without horizontal overflow; existing brand image loads; optional order reference appears for an order topic. Sending remains disabled because the route is absent.
- No deployed contact success/rate-limit test, actual new email send, durable retry/concurrency proof, Printful webhook delivery, moderation flow, or scheduler execution has occurred.

## Provider Contracts

- [Resend idempotency retention](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Printful v2 webhook/order/shipment documentation](https://developers.printful.com/docs/v2-beta/)

Private operational settings, approval gates, account observations, and the deployment decision belong in the private ops repository, not this public source repository.
