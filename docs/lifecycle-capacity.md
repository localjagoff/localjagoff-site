# Bounded Lifecycle Capacity

The scheduled runner retrieves one existing Checkout Session using Stripe's documented read-only endpoint with `expand[0]=payment_intent.latest_charge`. The pinned API version matches the installed Stripe SDK. Tests compare the parsed request URL, version and response; production identity, live-key mode, fixed host/path, timeout, response-size limit and zero retries remain enforced. Checkout creation and webhook signatures continue using their existing implementations.

Sources: [Retrieve a Checkout Session](https://docs.stripe.com/api/checkout/sessions/retrieve), [Expand responses](https://docs.stripe.com/expand).

Reconciliation reuses its claimed order row. Generation-checked SQL still rejects events arriving after the claim. Fresh review checks independently read the order and preserve the final 60-second generation/lease fence.

The generation-checked snapshot update also returns existing notification keys, avoiding a second read. Sender attempt preparation reserves daily quota and persists the first-attempt timestamp in one SQL statement after the lease/freshness fence. Ineligible reviews do not consume quota; quota rejection does not mark a provider attempt. Provider acceptance still precedes a separate durable finish, with the same idempotency key retained across uncertain persistence.

Cloudflare startup evaluates three pure synthetic email templates/hashes and the database driver's primitive/JSON/date/array parsers without environment access, clients, randomness or I/O; real invocation data are never cached by this initialization. Fresh review reads project only identity/suppression fields, not stored delivery history or owner/customer summaries. Reconciliation claims likewise exclude unused historical payloads.

Each reconciliation formats and inserts at most four processing/shipment notifications. Existing immutable outbox keys form a durable package cursor. If packages remain, the order stays incomplete and is scheduled as event work after 15 seconds, for the next fast timer. No package is discarded. A missing trustworthy delivery date raises one durable owner alert while remaining shipment batches continue, then moves to manual review. Existing mail quota and priority ordering still bound actual delivery; a very large order drains over multiple invocations, not instantly.

## Review Capacity Probe

`CLOUDFLARE_CAPACITY_VERIFY_UNTIL` is a separate, at-most-one-hour window restricted to the exact isolated review worker/origin, paused checkout, and disabled real communications/customer email. Authenticated fixed commands seed/run/read synthetic cases; no caller SQL, recipient, reference or provider URL is accepted.

The probe uses actual deployed store/queue/lifecycle logic against a dedicated `capacity_fixture_v7` schema in the review database. Every query transaction sets its schema explicitly, excluding public tables. Provider responses are fixed in-process fixtures, and mail transport is replaced with an exact `.invalid` recipient simulation. Real provider credentials never enter the runner. It cannot create, pay or modify a Stripe/Printful order or send email. Existing public-schema test deliveries and customer data are untouched.

Eight cases cover small/200-package reconciliation, native-timer processing, fresh review, retry, not-yet-due work, terminal/future exclusion and cleanup. A separate preparation request freezes only the large synthetic continuation so later cases stay independent. Full multi-batch completion and event races are covered with real-SQL tests. Fixture schemas persist for evidence; seeding never resets them. Close the window afterward. Never present these synthetic provider responses as genuine Stripe/Printful transport evidence.

Current measurements include the actual D1 wake read/refresh around the runner; setup, continuation freezing and status reads are separate requests. Earlier v1-v4 probes added two control queries without the D1 path and must not be treated as exact production timing. Transaction-scoped schema setup and synthetic response construction remain conservative test overhead. Log actual database subrequests separately from simulated Stripe/Printful/email calls; do not claim a simulated call is a genuine provider delivery. Native scheduling and bounded CPU evidence complement, rather than replace, the retained genuine provider and owner-only email gates. The 32-subrequest application cap and separate host CPU limit both apply.
