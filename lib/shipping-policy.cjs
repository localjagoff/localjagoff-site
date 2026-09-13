// Provider estimates verified September 12, 2026. These are not an order-to-door SLA.
const PRINTFUL_US = Object.freeze({
  reviewMin: 0, reviewMax: 2, handlingMin: 2, handlingMax: 7,
  fulfillmentMin: 2, fulfillmentMax: 5,
  transitMin: 3, transitMax: 4,
  shippingAmount: 599,
});
const SHIPPING_CHARGE = "US Standard shipping is $5.99 per order, shown before payment.";
const PRINTFUL_DELIVERY = "Our current apparel and accessories are made to order for Local Jagoff. We review and release normal paid orders to production within 2 business days. After release, production is currently estimated at 2-5 business days, plus 3-4 business days for domestic US Standard carrier delivery. Combined handling before shipment is estimated at 2-7 business days, followed by carrier transit.";
const DELIVERY_NOTE = "Business days are Monday-Friday, excluding holidays. The production estimate starts on the next business day after release and already includes time in the production queue. Google delivery estimates use a 2 PM Eastern cutoff and may add a business day for later orders. These are estimates, not guaranteed arrival dates; stock, fulfillment location and carrier delays can affect delivery. Items routed from another country can take longer. Tracking is sent when your order ships.";
const CHECKOUT_DELIVERY = "Made to order for Local Jagoff. Normal paid orders are reviewed and released within 2 business days. After release: estimated 2-5 business days production (2-7 business days combined handling), then 3-4 business days domestic US Standard transit. Monday-Friday, excluding holidays. Routing or carrier delays may take longer. No guaranteed arrival date.";

module.exports = { PRINTFUL_US, SHIPPING_CHARGE, PRINTFUL_DELIVERY, DELIVERY_NOTE, CHECKOUT_DELIVERY };
