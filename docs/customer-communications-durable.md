# Durable Customer Communications

Implemented on `fix/customer-communications`; **not activated in Production**. Provider-delivery and deployment gates remain in the private operations record. Do not merge merely because unit tests pass.

## Architecture

- Human support/replies: `hello@localjagoff.com`. Automated mail uses existing Resend, never hosted-mailbox SMTP.
- Orders sender: `Local Jagoff Orders <orders@localjagoff.com>`. Contact sender: `Local Jagoff Website <orders@localjagoff.com>`. Customer-mail reply-to is hello; contact reply-to is the validated visitor. Contact recipient is fixed to hello.
- Neon stores orders, immutable hashed outbox payloads, leases/sent state, event identities, contact deduplication/rate buckets, private review invitations and moderated reviews.
- Production and Preview databases are separate. Preview persists synthetic tests but never sends mail or reconciles Printful.
- Additive migration: `scripts/migrate-communications.cjs`, gated by `COMMUNICATIONS_MIGRATION_ALLOWED=true`. Connection values stay in secure runtime memory, never files or logs.

## Lifecycle

Verified successful Stripe payment persists a receipt job before Printful access. Stripe line subtotals, discount, shipping, tax and total must reconcile. Browser arrival at `/success` is not payment evidence. Stripe TEST exits before storage, email or fulfillment.

Paid -> Printful draft -> owner review -> owner manually confirms/pays is unchanged. No notification function confirms/pays a draft. Outstanding v2 sessions and hardened legacy reconciliation remain supported. Known historical sent receipts are skipped. Linked historical receipts with uncertain send status are held for owner reconciliation, not automatically resent.

Signed `/api/printful-events` checks raw HMAC, store/order identity, type and age, then freshly retrieves Stripe paid/refund/dispute state and Printful order, every order-item page and every shipment page using **GET only**. Unique outbox keys suppress duplicate sends. Genuine provider delivery and schema compatibility still require live verification; synthetic HMAC tests are not that evidence.

| State | Behavior |
| --- | --- |
| `inprocess` | One processing notice; never infer from draft/pending. |
| Each shipped package | Package-specific carrier/tracking/contents/ETA; never imply the whole order shipped. |
| Actual delivery | Store provider `delivered_at` when supplied. |
| Review due | Seven days after the last package delivery; otherwise latest trustworthy ETA-window end plus 12-hour timezone buffer and seven days. |
| Refund/dispute/unpaid/canceled/failed/returned/unresolved | Suppress review; replacements, missing pages/units and uncertain dates fail closed. |

Processing/shipment notices attempt immediate delivery, bounded to five per reconciliation. Catch-up handles extras. Review eligibility is rechecked immediately before mail.

## Owner Paid-Order Alerts

The paid callback first persists an owner-only snapshot and one `owner/{reference}` job addressed only to `hello@localjagoff.com`, independently of the customer receipt. It includes reference/session, customer name, Stripe paid total/status, product IDs/names/quantities and shipping destination. Missing facts are explicitly marked for owner inspection, never invented. The legacy receipt sender also uses hello as Reply-To.

The initial job is a HIGH PRIORITY paid/draft-unverified warning due after five minutes. This survives a function crash before Printful returns. Successful linkage atomically turns an unattempted pending warning into the normal paid-order notification and makes it immediately due. Failure accelerates the warning. Both paths try immediate delivery; durable catch-up remains necessary.

Once a job has been claimed for sending or attempted, its payload/key are never rewritten. If fulfillment recovers after that warning has entered delivery, one separate `owner-recovery/{reference}` notice is allowed. Replays cannot duplicate the original or recovery job, including the two different subscribed Stripe completion-event types. TEST/unpaid/wrong-store sessions cannot invoke owner notification storage or sending. Historical already-sent receipts are not mass-backfilled.

Owner alerts have queue priority over ordinary receipts/contact/reviews, but share the existing 80-attempt daily safety budget. New snapshots are removed after 30 days for resolved orders without outstanding jobs. Unresolved/held orders retain their reconciliation context. Raw names, addresses and payloads never go in logs.

**Activation gate:** a five-minute due time is not a delivery guarantee. The current Vercel daily runner is insufficient for timely crash recovery; verify a frequent bounded runner on the replacement host before activation. Database or email-provider outages still require manual reconciliation. Never bypass the outbox to send a second untracked alert. Owner is primary, no backup assigned, acknowledge within four business hours of detection and resolve/escalate within one business day.

## Queue And Scheduler

Atomic `FOR UPDATE SKIP LOCKED` claims use five-minute leases. Canonical JSON hashes survive JSONB key ordering. Immutable payloads reuse deterministic Resend keys. Sent jobs are never claimed; persistence failure after provider acceptance retains the lease/key for safe replay.

`/api/communications/run` requires exact Bearer `CRON_SECRET` authorization plus Production and email-enable flags. `vercel.json` schedules a daily 08:00 UTC catch-up; Preview does not activate production cron. The queue permits 80 provider attempts/day, prioritizes owner alerts then receipts/support over reviews, and defers rather than purchasing overage.

**Limit:** Resend retains idempotency for only 24 hours. Unresolved sends are held after 23 hours from first attempt. A daily scheduler cannot guarantee an automatic retry inside that window. Inspect pending/held jobs every business day; invoke the authenticated runner sooner for transient failures. Never reset timestamps, change a key or blindly resend an ambiguous job. No exactly-once guarantee is claimed beyond the provider window.

## Contact And Reviews

Contact API: 20 KB cap, bounded allowlisted fields, exact origin/content type, HMAC challenge (2-second minimum, one-hour expiry), honeypot, atomic single-use challenge/request deduplication. Durable limits: global 30/day, IP 3/10 minutes, email 5/day. IP identifiers are keyed hashes. Trust Vercel's client header only on Vercel, not ordinary forwarded headers. Accepted means queued, not inbox delivery. Preview visibly says it does not deliver.

Review invitations: purchase-bound, opaque, 90-day expiry, URL fragment removed immediately and sent only in POST body. Analytics/referrers are disabled. One rating/optional review per purchased product. Suppressed/expired links fail closed. Public output exposes approved name/rating/text/date only, never email, address, order ID or invitation. Durable IP/global rate limits also apply.

Moderation at `/admin/reviews` uses existing server-side Basic authentication and independent API authentication plus same-origin writes. Approve honest reviews of any rating; reject abuse, personal information or unrelated content. No fake reviews or rewriting customer words.

Retention: completed/suppressed payloads and contact request records 30 days; rate buckets two days. Inactive resolved order email/invitation data is minimized after 180 days when no job/invitation remains outstanding. Held/unresolved records require owner follow-up. Public reviews and deduplication markers remain until an appropriate support request. Provider/mailbox retention is separate.

## Verification And Rollout

Server-only configuration: `DATABASE_URL`, `COMMUNICATIONS_ENABLED`, `COMMUNICATIONS_SECRET` (random 32+ characters), `CUSTOMER_EMAIL_ENABLED`, `RESEND_API_KEY`, `CRON_SECRET`, `PRINTFUL_WEBHOOK_SECRET`, `PRINTFUL_WEBHOOK_PUBLIC_KEY`; existing Stripe/Printful/admin scopes remain intact. Never use `NEXT_PUBLIC_` for these secrets.

- 98 automated tests cover original commerce, paid callbacks, owner alerts, signatures, Preview exclusion, split shipments, suppression, queue/retry integrity, contact abuse, review privacy and independent authentication.
- `scripts/verify-communications-db.cjs`: real isolated Review DB concurrency, duplicate receipt/contact/owner jobs, crash-deadline warning, immutable attempted owner payload, one recovery notice, rate and moderation tests. Synthetic records are cleaned. Requires Preview plus `COMMUNICATIONS_TEST_DATABASE=true`.
- `scripts/verify-communications-preview.cjs`: official protected Vercel transport, credentials in memory/stdin only; deployed contact/rate/CSRF, synthetic HMAC, scheduler exclusion, empty public reviews. No email or Printful access.
- Build, built-server smoke, dependency audit and mobile QA are required. Exact Preview results belong in the private handoff.

Before activation: resolve hosting entitlement, migrate Production schema, prove owner-inbox receipt/authentication, configure/verify genuine Printful deliveries, observe scheduler execution, and reconcile uncertain old receipts. Do not fall back to the old mail path after new receipts have sent: preserve the durable handler/outbox and coordinated paused-pair recovery. Never restore an old webhook alone.

## References

- [Resend idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Printful v2 contracts](https://developers.printful.com/docs/v2-beta/)
- [Vercel client headers](https://vercel.com/docs/headers/request-headers)
- [Vercel Cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)
