// Provider estimates verified September 12, 2026. These are not an order-to-door SLA.
const PRINTFUL_US = Object.freeze({
  fulfillmentMin: 2, fulfillmentMax: 5,
  transitMin: 3, transitMax: 4,
  shippingAmount: 599,
});
const SHIPPING_CHARGE = "US Standard shipping is $5.99 per order, shown before payment.";
const PRINTFUL_DELIVERY = "Our current apparel and accessories are made to order by Printful. Orders are reviewed before release to production. After release, Printful currently estimates 2-5 business days for production, plus 3-4 business days for domestic US Standard carrier delivery.";
const DELIVERY_NOTE = "Order-review time is additional to these provider estimates. Business days exclude weekends and holidays. These are estimates, not guaranteed arrival dates; stock, fulfillment location and carrier delays can affect delivery. Items routed from another country can take longer. Tracking is sent when your order ships.";
const CHECKOUT_DELIVERY = "Made to order by Printful. After order review and release: estimated 2-5 business days production, then 3-4 business days domestic US Standard transit. Review time is additional. Weekends/holidays excluded; routing or carrier delays may take longer. No guaranteed arrival date.";

module.exports = { PRINTFUL_US, SHIPPING_CHARGE, PRINTFUL_DELIVERY, DELIVERY_NOTE, CHECKOUT_DELIVERY };
