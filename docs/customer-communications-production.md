# Customer Communications: Production

Production storefront and email automation run on the `localjagoff-production` Cloudflare Worker. Neon holds `comm_orders`, `comm_events`, `comm_outbox`, and purchase-bound review state. The Worker receives verified Stripe/Printful events and has frequent and hourly scheduled reconciliation. A Cloudflare D1 wake hint accelerates due work; Neon is the durable source of truth. Printful and Stripe reconciliation is read-only. All customer emails go through the durable outbox and Resend with deterministic idempotency keys, not direct one-off sends.

## Customer lifecycle

1. Verified payment queues an order confirmation. No customer-facing processing/production-status email is sent; obsolete queued processing notices remain suppressed.
2. A genuinely shipped package queues a package-specific tracking message.
3. Each package with provider `delivery_status=delivered` and a valid non-future `delivered_at` queues one `delivery/<reference>/<shipment-id>` message. Fulfilled, tracking, or ETA alone is insufficient. A partial shipment does not claim the whole order arrived.
4. Only after all purchased item quantities are covered by delivered packages and fresh eligibility checks pass may the final delivery message include a soft review link. Delivery and reminder reuse one purchase-bound invitation. Final actual delivery schedules the reminder four days later; the trustworthy ETA fallback also uses four days plus its existing timezone buffer. A submitted review atomically suppresses the pending reminder but leaves the invitation valid for other purchased products. The final send fence checks again for submitted reviews, payment problems, returns, and unresolved fulfillment.
5. The review success screen optionally links to the official Local Jagoff Facebook Page for every rating. It does not post a Recommendation. Social-media reuse consent is separate, optional, unchecked by default, and stored per review. The public reviews API omits it. The admin list marks pending consent separately; only approved consented reviews appear as `SOCIAL OK`. Moderation standards are independent of rating and consent.

All automated customer mail from `Local Jagoff Orders <orders@localjagoff.com>` gets `CUSTOMER_EMAIL_BCC`, falling back to `hello@localjagoff.com`. This covers confirmation, shipment, delivery, and review reminder. BCC is absent from customer-visible To/Cc. Owner alerts and contact submissions addressed to hello do not receive a duplicate BCC.

## Operating checks

- Check actual provider status, immutable event identity, and `comm_orders` reconciliation fields before repairing an order. `no_due_order` alone does not show whether a particular order was processed.
- Check `comm_outbox` key/status/attempts/provider ID before taking action. Never send directly through Resend or reset an ambiguous send; its idempotency window is finite.
- Check fresh Stripe payment/refund/dispute and all Printful item/shipment pages before a one-order repair. Do not mass-backfill historical delivery messages.
- Migrations are additive. Production `comm_outbox_kind_check` includes `delivery`; `comm_reviews.social_share_consent` is `boolean NOT NULL DEFAULT false`. Apply and verify database changes before deploying code that uses them.
- Verify both storefront and `/review` after deployment, along with the authenticated review-admin path, customer email configuration, and Worker version. A provider's `Delivered` email status means mail infrastructure accepted the message; it does not prove the customer read it.
