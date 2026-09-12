import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CATEGORIES } from '../lib/storefront.cjs';

export default function StoreFooter() {
  return <footer className="store-footer">
    <div className="store-container footer-top">
      <div className="footer-identity"><Link className="wordmark" href="/">LOCAL JAGOFF<span className="brand-period">.</span></Link><p>Pittsburgh roots.<br />An attitude that travels.</p><a className="text-link" href="mailto:hello@localjagoff.com">hello@localjagoff.com <ArrowUpRight size={16} /></a></div>
      <div><h2>Shop</h2>{CATEGORIES.map(category => <Link key={category.key} href={category.href}>{category.label}</Link>)}</div>
      <div><h2>Local business</h2><Link href="/whats-a-jagoff">What's a Jagoff?</Link><Link href="/arcade">The arcade</Link><Link href="/contact">Contact & support</Link></div>
      <div><h2>The particulars</h2><Link href="/terms">Shipping & returns</Link><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms & conditions</Link><span className="footer-note">Secure checkout via Stripe.</span></div>
    </div>
    <div className="store-container footer-bottom"><span>© {new Date().getFullYear()} Local Jagoff</span><span>412 / 724 / Wherever you call home.</span><span>USD / United States</span></div>
  </footer>;
}
