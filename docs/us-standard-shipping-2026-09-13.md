# US Standard Shipping - September 13, 2026

## Rate Model

The current 17 products / 96 variants use the provider's US selling-online
Standard rate table checked against authenticated store 18032822:

| Class | First item | Each additional item | Shipment group |
| --- | ---: | ---: | --- |
| Tees | $4.95 | $2.20 | Apparel |
| Hoodies / zip hoodies | $8.79 | $2.50 | Apparel |
| Structured trucker hats | $4.69 | $2.00 | Hats, separately |

Within apparel, use the highest first-item rate and each remaining item's own
additional-item rate. Add the separate hats charge. No shipping markup, blanket
discount, free-shipping threshold, product price or fulfillment behavior changed.

The shared integer-cent function in `lib/shipping-policy.cjs` powers cart,
mini-cart, server-authoritative Checkout, and Google single-offer shipping.
Checkout calculates only after resolving IDs, variants and prices from the
provider. Client price, category and shipping inputs cannot override the result.
New sessions record rate version `us-standard-2026-09-13`. Outstanding paid v2
sessions remain compatible with the existing webhook/manual draft workflow.

## Architecture And Limits

Stripe-hosted Checkout collects destination after session creation; dynamic
address-based shipping updates require embedded/custom Checkout. The provider's
Shipping Rates API needs recipient state/ZIP and variants. Rebuilding the flow
or adding an address form only to duplicate Stripe entry is not justified for
the current Standard flat-rate catalog. This is a verified category estimate,
not a claim of a destination-specific live quote.

Only explicit current product IDs are mapped. An unmapped future item fails
closed rather than accidentally receiving a provider rate. Future Stuff N'at
requires separate self-fulfilled routing, 3-5 business-day handling plus carrier
transit, and eventually EasyPost after account/API setup. Mixed suppliers need
separate shipment calculations; none are activated here.

Store settings showed a $0.40 US holiday surcharge from October 15 to January 17
without a year. It is not included in today's rates. Verify applicability/year
before October 15, and recheck the dated rate table when adding products or when
the provider changes prices. Destination tax, special delivery fees and routing
exceptions can differ from this model. Do not silently reinterpret tax as a
shipping markup.

## Listing Consistency

Google's approved set remains 13 groups / 72 offers; the four new tees remain
staged. Each offer specifies its single-item Standard shipping cost, existing
2-7 business-day handling and 3-4 transit, Monday-Friday, 2 PM Eastern cutoff.
Explicit delivery attributes are required because a product-level shipping
price overrides the account-level delivery configuration. The legacy $5.99
account policy is not the effective price for these overridden offers.

Customer terminology remains Standard Shipping. Delivery wording is unchanged.
Meta projection, stock, imagery, variants, Pixel and checkout payment mechanics
are unchanged.

## Verification

Run `npm test`, the production Cloudflare build, and
`node scripts/verify-shipping-public.cjs`. Then inspect actual unpaid hosted
Checkout for single/multiple tees and apparel/hat mixed carts. Do not enter
payment details or create any provider order for this verification.

Authenticated production costs, tax assumptions and threshold stress tests
belong in the private operations repository, not this public website repository.

## Primary References

- https://www.printful.com/shipping
- https://help.printful.com/hc/en-us/articles/20583931065372-How-do-I-calculate-shipping-costs-for-different-types-of-orders
- https://developers.printful.com/docs/
- https://docs.stripe.com/payments/checkout/custom-shipping-options
- https://support.google.com/merchants/answer/6324484
- https://support.google.com/merchants/answer/16072859
- https://support.google.com/merchants/answer/16072858
- https://support.google.com/merchants/answer/16543665
