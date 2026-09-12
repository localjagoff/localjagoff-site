# Local Jagoff Website Measurement

Dataset/Pixel `2603757676747952` is owned by the Local Jagoff business portfolio and associated with the existing Local Jagoff Website Catalog. The older personal-ad-account Pixel is not used. No Conversions API, new credentials, automatic advanced matching or automatic events are enabled by this implementation.

## Browser Events

`lib/meta-pixel.cjs` loads Meta's standard browser library only after explicit optional-cookie consent, on the canonical production origin and a small public storefront route allowlist. GPC and DNT override consent. Unknown query parameters, fragments, private review/admin/contact and transferred-cart routes do not emit events. This conservative exclusion can reduce referral attribution; it avoids sending private URL data. Automatic configuration is disabled in code and detailed automatic page collection is disabled in Events Manager. No noscript beacon bypasses consent.

- PageView: once per eligible browser route visit. Meta's built-in history PageView is disabled (`fbq.disablePushState`) so it cannot duplicate the explicit router event. Consent commands run only when consent actually changes.
- ViewContent: once per current product/variant view, including consent granted while viewing.
- AddToCart: actual quantity added, excluding the cart's quantity cap.
- InitiateCheckout: only after successful hosted-session creation, using the returned server-resolved product prices. Value is merchandise subtotal before shipping, tax or later promotional changes. No action events are replayed from before consent.
- Purchase: only from `/success`, after the read-only receipt endpoint independently verifies a live, complete, paid Stripe payment session with matching store, v2 metadata and merchandise subtotal. Value is Stripe's final paid total, including applicable shipping/tax and discounts.

Content IDs match catalog variants: `lj_<product_id>_<variant_id>`. No names, addresses, email, phone, payment details or raw Checkout Session IDs are passed as event parameters. A query/fragment-bearing referrer also suppresses loading/tracking unless it passes the same public URL allowlist, preventing private link tokens from entering the SDK's automatic referrer field. Meta still receives normal browser/network information when its script connects, as disclosed by the privacy notice. Client blockers or declined consent mean events may not arrive; do not equate a browser queue call with Events Manager receipt.

## Paid Receipt Boundary

Consent at checkout permits a signed 24-hour, Secure/HttpOnly/SameSite=Lax cookie scoped only to `/api/checkout-receipt`. It contains the session capability and timestamp, authenticated with a domain-separated HMAC using the existing Stripe secret. It is not readable by Meta's script, logged by this code, returned in the browser URL or placed in localStorage. A later checkout without consent clears it. Key rotation invalidates old receipts without affecting payment or fulfillment.

The receipt POST requires the canonical same origin and a valid unexpired signature before making exactly one Stripe retrieval. Preview, test keys, missing/altered cookies, wrong origin, unpaid sessions and inconsistent metadata fail closed. It never creates a payment, contacts Printful, mutates orders, sends email or signals the communications scheduler. The new route uses the existing bounded commerce executor.

Browser Purchase uses a SHA-256-derived event ID and a bounded localStorage deduplication list. This is best-effort browser measurement, not a durable financial ledger or guaranteed delivery. Cookies cover the most recent consented Checkout in that browser; parallel checkouts, missing returns, expired cookies, cleared storage or blocked tracking can cause missing measurement. Replayed recent receipts do not enqueue another Purchase in the same browser. Outstanding older checkout sessions remain usable but do not gain this measurement cookie retroactively. Never manufacture a live Purchase or make a real payment merely to test this configuration.

## Verification

September 12, 2026: the existing manual-install wizard was completed with advanced matching OFF. The correctly owned source's Overview lists Meta Pixel and PageView, ViewContent, AddToCart and InitiateCheckout as Active, in addition to prior Processed Test Events. The storefront redesign adds only the four public category routes to the eligibility allowlist. No new source, credential or Purchase event was created.

`tests/meta-pixel.test.cjs` covers consent, GPC/DNT, private route exclusions, correct source and catalog IDs, duplicates, receipt authentication, expiry, paid status, store/mode/amount checks and sanitized output. Commerce tests retain authoritative prices, pause-before-provider behavior and unchanged success/cancel URLs. Executor tests prove a successful receipt cannot wake email/fulfillment. Actual live event receipt must additionally be checked in Events Manager Test Events; fixture success alone is not that evidence.

Official references: [Meta Pixel](https://developers.facebook.com/docs/meta-pixel/), [Stripe session retrieval](https://docs.stripe.com/api/checkout/sessions/retrieve), [Meta Business Tools Terms](https://business.facebook.com/legal/technology_terms).
