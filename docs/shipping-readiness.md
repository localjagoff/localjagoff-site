# Shipping Readiness - September 12, 2026

Deployment verified September 13, 02:29 UTC (September 12 Eastern).
Code c80e64cbfdf3c4f478598b75878ee3bedfc101a2, production Worker
c2aebf63-1726-4178-b87c-b5eeaecf16fe, build 7y_t-iPhqlfsCVqwKRRKV.
303 tests and 22 built-site smoke checks pass. Live product/policy/cart UI and
one unpaid hosted Stripe Checkout show the new disclosure. No customer/payment
details entered, no Pay action, cart restored empty.

Current catalog: 14 Printful-made apparel/accessory products, 78 variants.
No new merchandise, price, shipping-charge, availability or fulfillment changes.

## Evidence And Customer Wording

Authenticated Printful store 18032822 (Local Jagoff), Shipping settings:
fixed-rate Standard shipping; domestic US/Canada Flat Rate Standard is displayed
as 3-4 business days **after fulfillment**. Express/live-rate options are not
offered by this website checkout. The unchanged customer charge is $5.99 per
US order, not a claim that this equals the provider's cost.

Printful's current September 12 status table shows 2-5 business days for the
relevant in-house DTG, DTFlex and embroidery techniques. The same-day order,
weekends and holidays are excluded. Production and transit are separate;
stock, routing, international origin and carrier exceptions can extend them.
These are provider estimates, not guaranteed order-to-door promises.

Primary references:
- https://www.printful.com/recent-updates
- https://help.printful.com/hc/en-us/articles/360014007980-How-long-does-fulfillment-take
- https://help.printful.com/hc/en-us/articles/20559768364188-What-shipping-options-are-available
- https://help.printful.com/hc/en-us/articles/360017631360-What-s-the-estimated-delivery-time-and-how-is-it-calculated

The shared lib/shipping-policy.cjs wording is used by the public terms,
product shipping accordion, cart and Stripe Checkout shipping-address note.
The cart drawer links the policy and states the unchanged charge; llms.txt
reflects the same facts. Stripe's unsupported blanket 5-10 business-day
delivery_estimate is removed. No provider, payment or fulfillment contract changes.
Refund processing's separate 5-10 business-day bank estimate is not shipping
and remains unchanged.

## Remaining Operating Fact

Paid orders still create an unconfirmed Printful draft (confirm=false). Owner
review/confirmation/payment is required before provider production begins.
The approved reconciliation policy does not specify a maximum normal paid-draft
release time. That interval cannot be invented or omitted from Google's handling
time. Owner maximum turnaround has been requested; no automatic confirmation
was introduced. Current customer wording explicitly excludes order-review time
from the provider estimate.

Google's existing setting is $5.99, US/all products, 3-5 handling plus 4-5 transit
days, both Monday-Saturday, 2 PM Eastern cutoff. It was inspected, not saved or
replaced with an unsupported total. The owner-release interval and cutoff must
be resolved before finalizing order-to-carrier handling plus the verified
carrier estimate and Monday-Friday business-day calendars.
Google documentation: https://support.google.com/merchants/answer/14949917

## Future Stuff N'at

Not live and not a Google listing. Owner-fulfilled future Stuff N'at has its own
approved rule: 3-5 business days handling before shipment, plus carrier transit.
Do not apply it to current Printful items. Before any future mixed catalog
launch, add explicit fulfillment-profile assignment, corresponding Google
shipping labels/services and per-product disclosures. Mixed orders may ship
separately and must disclose that before checkout. No fake stock or inactive
shipping service is published as part of this preparation.

## Review Boundary

Feed and item health do not establish account policy compliance. Do not submit
the Misrepresentation attestation until shipping facts and actual owner business
representations are confirmed. Preserve the existing 14/78 projections, claimed
website, verified return policy, customer support and archived manual items.

Live read-only scripts/verify-shipping-public.cjs verifies 14 landing pages,
14 clean Google JPEGs and all 78 feed offers against current API and ProductGroup
prices/availability. Google and Meta feed hashes remain unchanged across release:
- Google: dabd3d01647a3fb83c7b8685a50df0f1682b283922143a56d7e35500099aa705
- Meta: 1ea1d429386c27d909e23fb400da6abc2cfcd4c638353f2868389778b39c6786

Merchant Center5794799922: source10728786854 still shows 78 updated, no file
issues, all attributes recognized. Comprehensive diagnostics show only account
Misrepresentation (78/78 blocked), with no item-level issues. Website remains
Verified/Claimed, contact hello@localjagoff.com and /contact intact; return
policy9310773509 remains Verified for78. All ten G-02857590 through G-02857599
manual products remain archived. No feed refresh was necessary because the
feed bytes did not change.

The exact review modal remains Before you request a review, unchecked
My account meets the policy requirements and disabled Request review. Up to
three reviews/cooldown warning displayed. No attestation or review submitted.
Not yet ready to recommend attestation until normal owner-release handling
and the resulting Google settings are truthfully completed.
