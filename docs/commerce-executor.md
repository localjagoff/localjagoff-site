# Free Commerce Executor

The ordinary Cloudflare Worker forwards checkout, signed webhook requests and bounded communications ticks to one private SQLite-backed Durable Object, `CommerceExecutor`. Existing Neon order/outbox state and D1 wake hints remain authoritative. This is an execution boundary, not a second fulfillment engine. No customer state is cached in the object, and it creates no alarms or sockets.

Checkout reuses the existing handler with an explicit request-time environment and the same one-megabyte Next body limit. Paused ingress rejects before the object binding or any provider access. Checkout never signals the communications queue. The default handler remains available for the retained legacy runtime; no shared process environment is modified by a request.

The binding uses one fixed object name. RPC accepts only enumerated scheduler modes or fixed, short-lived review capacity cases; callers cannot supply environments, credentials, recipients or provider URLs. Missing bindings fail closed. Raw request bytes and provider signature verification remain unchanged. Existing live-payment checks, v2 compatibility, Neon leases, idempotency keys and manual Printful DRAFT approval still apply.

Worker and executor each enforce the application's 32-subrequest ceiling. The ordinary Free Worker has a 10 ms CPU limit; the executor has the documented default 30-second CPU allowance. SQLite-backed Durable Objects are available on Free. No paid plan is enabled.

## Capacity Assumptions

Free allowances include 100,000 object requests/day and 13,000 GB-s/day. A conservative planning case of 313 scheduled invocations/day plus 100 commerce requests/day, each active for 30 seconds at 0.128 GB, is 1,585.92 GB-s/day, about 12.2% of the duration allowance. This is a planning bound, not measured billing or a wall-time guarantee. Slow providers and outstanding timeout timers can extend active duration; inspect actual duration as traffic grows. Fixed object naming prevents unbounded per-request object creation.

Account quotas are shared. Remove obsolete review scheduling during cutover rather than running duplicate production/review schedules. Free exhaustion can fail operations; it is not permission to enable paid overages. This executor does not remove the separate Neon compute/storage budget, 80-email-attempt daily cap, backlog risk or owner's reconciliation responsibility.

Review measurements distinguish parent Worker CPU from executor CPU, and real database/D1 requests from simulated provider calls. Synthetic fixtures cannot establish genuine provider transport. Retained genuine transport evidence and focused signature tests complement the capacity results.

Sources: [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/), [object lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).
