// Provider estimates verified September 12, 2026. These are not an order-to-door SLA.
const PRINTFUL_US = Object.freeze({
  reviewMin: 0, reviewMax: 2, handlingMin: 2, handlingMax: 7,
  fulfillmentMin: 2, fulfillmentMax: 5,
  transitMin: 3, transitMax: 4,
});
// US Standard selling-online rates checked September 13, 2026 against the
// provider table and store 18032822's fixed-rate Standard configuration.
const SHIPPING_RATE_VERSION = 'us-standard-free60-2026-09-19';
const FREE_SHIPPING_MINIMUM_CENTS = 6000;
const FREE_SHIPPING_CALLOUT = 'Free US Standard shipping on orders $60+';
const STANDARD_RATES = Object.freeze({
  tees: Object.freeze({ first: 495, additional: 220, group: 'apparel' }),
  hoodies: Object.freeze({ first: 879, additional: 250, group: 'apparel' }),
  hats: Object.freeze({ first: 469, additional: 200, group: 'structured-hats' }),
});
// Explicit fulfillment routing: never infer a shipping class from client names
// or apply this provider's rates to future self-fulfilled Stuff N'at products.
const SHIPPING_PRODUCTS = Object.freeze({
  473808622: 'tees', 473808088: 'tees',
  473689891: 'tees',
  471744647: 'tees', 471744585: 'tees', 471950476: 'tees', 471744283: 'tees',
  430964873: 'tees', 429821634: 'tees', 429728777: 'tees', 429536493: 'tees',
  428982889: 'tees', 428851698: 'tees', 428851608: 'tees', 428851513: 'tees',
  429208592: 'hoodies', 428983169: 'hoodies', 428821578: 'hoodies',
  428980566: 'hats', 428851907: 'hats',
});

function standardShippingCents(items) {
  if (!Array.isArray(items) || items.length > 100) throw new Error('Shipping unavailable');
  const groups = new Map();
  for (const item of items) {
    const id = Number(item?.id), quantity = Number(item?.quantity);
    const rate = STANDARD_RATES[SHIPPING_PRODUCTS[id]];
    if (!Number.isSafeInteger(id) || !rate || !Number.isSafeInteger(quantity) ||
        quantity < 1 || quantity > 99) throw new Error('Shipping unavailable');
    const group = groups.get(rate.group) || { additional: 0, first: 0, baseAdditional: 0 };
    group.additional += rate.additional * quantity;
    // Combined apparel uses the highest first-item rate, then every remaining
    // item's own additional rate. Structured hats start a separate shipment.
    if (rate.first > group.first) {
      group.first = rate.first;
      group.baseAdditional = rate.additional;
    }
    groups.set(rate.group, group);
  }
  return [...groups.values()].reduce((sum, g) => sum + g.first + g.additional - g.baseAdditional, 0);
}

// Checkout must pass the subtotal of provider-resolved unit_amount values, never
// a client-submitted total. Cart callers use this only for an estimate.
function shippingQuote(items, subtotalCents) {
  const standard = standardShippingCents(items);
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0 ||
      (items.length > 0 && subtotalCents === 0) || (items.length === 0 && subtotalCents !== 0)) {
    throw new Error('Shipping unavailable');
  }
  const eligible = items.length > 0 && subtotalCents >= FREE_SHIPPING_MINIMUM_CENTS;
  return { amount: eligible ? 0 : standard, eligible,
    remaining: Math.max(0, FREE_SHIPPING_MINIMUM_CENTS - subtotalCents) };
}

const SHIPPING_CHARGE = "Free US Standard shipping on merchandise subtotals of $60 or more, before promo discounts, tax and shipping. Below $60, shipping is calculated from the items and quantities in your cart with no added shipping markup. Hats ship separately from apparel, at no extra charge on qualifying orders. The shipping charge is shown before payment.";
const PRINTFUL_DELIVERY = "Our current apparel and accessories are made to order for Local Jagoff. We review and release normal paid orders to production within 2 business days. After release, production is currently estimated at 2-5 business days, plus 3-4 business days for domestic US Standard carrier delivery. Combined handling before shipment is estimated at 2-7 business days, followed by carrier transit.";
const DELIVERY_NOTE = "Business days are Monday-Friday, excluding holidays. The production estimate starts on the next business day after release and already includes time in the production queue. Google delivery estimates use a 2 PM Eastern cutoff and may add a business day for later orders. These are estimates, not guaranteed arrival dates; stock, fulfillment location and carrier delays can affect delivery. Items routed from another country can take longer. Tracking is sent when your order ships.";
const CHECKOUT_DELIVERY = "Made to order for Local Jagoff. Normal paid orders are reviewed and released within 2 business days. After release: estimated 2-5 business days production (2-7 business days combined handling), then 3-4 business days domestic US Standard transit. Monday-Friday, excluding holidays. Routing or carrier delays may take longer. No guaranteed arrival date.";

module.exports = { PRINTFUL_US, SHIPPING_CHARGE, PRINTFUL_DELIVERY, DELIVERY_NOTE, CHECKOUT_DELIVERY,
  SHIPPING_RATE_VERSION, STANDARD_RATES, SHIPPING_PRODUCTS, standardShippingCents,
  FREE_SHIPPING_MINIMUM_CENTS, FREE_SHIPPING_CALLOUT, shippingQuote };
