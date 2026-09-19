import { Truck } from 'lucide-react';
import { FREE_SHIPPING_MINIMUM_CENTS, shippingQuote } from '../lib/shipping-policy.cjs';

export default function FreeShippingProgress({ items, subtotal }) {
  let quote;
  try { quote = shippingQuote(items, Math.round(subtotal * 100)); } catch { return null; }
  return <section className="free-shipping-progress" aria-label="Free shipping progress">
    <p role="status" aria-live="polite"><Truck size={18} aria-hidden="true" />
      <strong>{quote.eligible ? 'You unlocked free US Standard shipping.' :
        `You're $${(quote.remaining / 100).toFixed(2)} away from free US Standard shipping.`}</strong></p>
    <progress max={FREE_SHIPPING_MINIMUM_CENTS} value={Math.min(Math.round(subtotal * 100), FREE_SHIPPING_MINIMUM_CENTS)}
      aria-label="Merchandise subtotal toward free shipping" />
    <small>$60 merchandise subtotal before promo discounts and tax. Final pricing verified at checkout.</small>
  </section>;
}
