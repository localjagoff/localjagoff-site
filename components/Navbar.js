import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, X, ShoppingBag, Plus, Minus, ArrowRight, Trash2 } from 'lucide-react';
import { startCheckout } from '../lib/checkout';
import { CATEGORIES, money } from '../lib/storefront.cjs';
import { SHIPPING_CHARGE } from '../lib/shipping-policy.cjs';

function readCart() {
  try { const value = JSON.parse(localStorage.getItem('cart')); return Array.isArray(value) ? value : []; } catch { return []; }
}
export default function Navbar({ checkoutCoupon = null }) {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const drawer = useRef(null);
  const menuButton = useRef(null);
  const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const total = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  useEffect(() => {
    setCart(readCart());
    const update = event => { setCart(readCart()); if (!event.detail?.silent) setOpen(true); };
    const storage = () => setCart(readCart());
    window.addEventListener('cartUpdated', update);
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener('cartUpdated', update); window.removeEventListener('storage', storage); };
  }, []);
  useEffect(() => {
    if (open && drawer.current && !drawer.current.open) drawer.current.showModal();
    if (!open && drawer.current?.open) drawer.current.close();
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  useEffect(() => { setMenuOpen(false); setOpen(false); }, [router.asPath]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const escape = event => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [menuOpen]);
  function updateCart(next) {
    localStorage.setItem('cart', JSON.stringify(next));
    setCart(next);
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { silent: true } }));
  }
  function changeQuantity(index, delta) {
    updateCart(cart.map((item, position) => position === index ? { ...item, quantity: Math.min(99, Number(item.quantity) + delta) } : item).filter(item => item.quantity > 0));
  }
  async function checkout() {
    if (checking) return;
    setChecking(true);
    try { await startCheckout(cart, checkoutCoupon); } finally { setChecking(false); }
  }
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="store-nav">
      <div className="store-nav-inner store-container">
        <button ref={menuButton} className="icon-button nav-menu-button" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
        <Link href="/" className="wordmark" aria-label="Local Jagoff home">LOCAL JAGOFF<span className="brand-period">.</span></Link>
        <nav className="store-desktop-nav" aria-label="Main navigation">{CATEGORIES.map(category => <Link key={category.key} href={category.href} aria-current={router.pathname === category.href ? 'page' : undefined}>{category.label}</Link>)}</nav>
        <button className="icon-button bag-trigger" type="button" aria-label={`Open cart, ${totalItems} items`} onClick={() => setOpen(true)}><ShoppingBag size={22} /><span>{totalItems}</span></button>
      </div>
      {menuOpen && <nav className="store-mobile-nav" id="mobile-navigation" aria-label="Mobile navigation">{CATEGORIES.map(category => <Link key={category.key} href={category.href} onClick={() => setMenuOpen(false)}>{category.label}<ArrowRight size={20} /></Link>)}<Link href="/whats-a-jagoff">The story</Link><Link href="/arcade">The arcade</Link><Link href="/contact">Contact & support</Link></nav>}
    </header>
    <dialog ref={drawer} className="cart-dialog" aria-labelledby="cart-dialog-title" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={event => { if (event.target === drawer.current) { const rect = drawer.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right) setOpen(false); } }}>
      <div className="bag-heading"><div><p className="store-eyebrow">Good choices.</p><h2 id="cart-dialog-title">Your cart <span>({totalItems})</span></h2></div><button type="button" className="icon-button" aria-label="Close cart" onClick={() => setOpen(false)}><X size={24} /></button></div>
      {cart.length ? <><div className="bag-items">{cart.map((item, index) => <article className="bag-item" key={`${item.id}-${item.variant_id}`}>
        <Link href={`/product/${item.id}`} onClick={() => setOpen(false)}><img src={item.image || '/placeholder.jpg'} alt={item.name} width="100" height="100" /></Link>
        <div><Link className="bag-item-name" href={`/product/${item.id}`} onClick={() => setOpen(false)}>{item.name}</Link><p>{item.variant_name}</p><strong>{money(Number(item.price) * item.quantity)}</strong><div className="bag-controls"><div className="quantity-control"><button type="button" aria-label={`Decrease quantity of ${item.name}`} onClick={() => changeQuantity(index, -1)}><Minus size={15} /></button><span>{item.quantity}</span><button type="button" aria-label={`Increase quantity of ${item.name}`} disabled={item.quantity >= 99} onClick={() => changeQuantity(index, 1)}><Plus size={15} /></button></div><button className="icon-button" title="Remove item" type="button" aria-label={`Remove ${item.name}`} onClick={() => updateCart(cart.filter((_, i) => i !== index))}><Trash2 size={18} /></button></div></div>
      </article>)}</div><div className="bag-summary"><div><span>Subtotal</span><strong>{money(total)}</strong></div><p>{SHIPPING_CHARGE} <Link href="/terms#shipping" onClick={() => setOpen(false)}>Made-to-order delivery details</Link>.</p><button className="store-button" disabled={checking} onClick={checkout}>{checking ? 'Opening secure checkout' : 'Checkout'}<ArrowRight size={18} /></button><Link className="text-link" href="/cart" onClick={() => setOpen(false)}>View cart details <ArrowRight size={17} /></Link></div></> : <div className="bag-empty"><ShoppingBag size={38} strokeWidth={1} /><h3>Room for something good.</h3><p>Your cart is empty.</p><Link className="store-button" href="/tees" onClick={() => setOpen(false)}>Explore the collection <ArrowRight size={18} /></Link></div>}
    </dialog>
  </>;
}
