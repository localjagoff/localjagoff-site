import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, X, ShoppingBag, Check } from 'lucide-react';
import { LAYERS, BEANIES, availableVariants, fitItems, mergeFit } from '../lib/matching-fit.cjs';
import { money } from '../lib/storefront.cjs';
import { shippingQuote } from '../lib/shipping-policy.cjs';
import { getTracker } from '../lib/meta-pixel.cjs';
import styles from '../styles/MatchingFit.module.css';

const photos = {
  475474242: '/images/products/475474242/front.jpg',
  475475243: '/images/products/475475243/front.jpg',
  475457459: '/images/matching-fit/crown-knit.png',
  475461765: '/images/matching-fit/crown-pom.png',
};
const names = { 475474242: 'Crown Original Hoodie', 475475243: 'Crown Original Sweatshirt', 475457459: 'Crown Knit Beanie', 475461765: 'Crown Pom-Pom Beanie' };
export default function MatchingFit({ products, loading, error, retry }) {
  const [open, setOpen] = useState(false);
  const [layerId, setLayerId] = useState(LAYERS[0]);
  const [beanieId, setBeanieId] = useState(BEANIES[0]);
  const [variantId, setVariantId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useRef(null);
  const trigger = useRef(null);
  const adding = useRef(false);
  const layer = products.find(p => Number(p.id) === layerId);
  const variants = availableVariants(layer);
  let items = [], total = 0, shipping = null;
  try {
    items = fitItems(products, layerId, variantId, beanieId);
    total = items.reduce((sum, item) => sum + Math.round(item.price * 100), 0);
    shipping = shippingQuote(items, total);
  } catch {}
  useEffect(() => {
    const openFromLink = () => {
      if (window.location.hash !== '#build-your-fit') return;
      setMessage('');
      setOpen(true);
      // Consume the action while retaining the section anchor and tracking query.
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#matching-fit`);
    };
    openFromLink();
    window.addEventListener('hashchange', openFromLink);
    return () => window.removeEventListener('hashchange', openFromLink);
  }, []);
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.current?.close(); document.body.style.overflow = previous; };
  }, [open]);
  function close() { if (!adding.current) { setOpen(false); trigger.current?.focus(); } }
  function chooseLayer(id) {
    const size = variants.find(v => String(v.id) === variantId)?.size;
    const next = availableVariants(products.find(p => Number(p.id) === id)).find(v => v.size === size);
    setLayerId(id); setVariantId(next ? String(next.id) : ''); setMessage('');
  }
  async function addPair() {
    if (adding.current || items.length !== 2) return;
    adding.current = true; setBusy(true); setMessage('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/api/get-products', { signal: controller.signal });
      if (!response.ok) throw Error('Cannot check availability right now. Please try again.');
      const catalog = await response.json();
      if (!Array.isArray(catalog)) throw Error('Cannot check availability right now. Please try again.');
      const current = fitItems(catalog, layerId, variantId, beanieId);
      if (current.some((item, index) => item.price !== items[index].price || item.variant_id !== items[index].variant_id)) {
        retry(); throw Error('The catalog has changed. Please review the updated selection and prices.');
      }
      let cart;
      try { cart = JSON.parse(localStorage.getItem('cart')); } catch { cart = []; }
      const withImages = current.map(item => ({ ...item, image: new URL(photos[item.id], window.location.origin).href }));
      const next = mergeFit(cart, withImages);
      localStorage.setItem('cart', JSON.stringify(next));
      // Close the chooser before opening the existing cart dialog.
      dialog.current?.close(); setOpen(false);
      window.dispatchEvent(new Event('cartUpdated'));
      try { getTracker()?.addToCart(current.map(item => ({ id: item.id, variant_id: item.variant_id, quantity: 1, unit_amount: Math.round(item.price * 100) }))); } catch {}
    } catch (e) { setMessage(e.name === 'AbortError' ? 'Availability check timed out. Please try again.' : e.message || 'Unable to add your fit. Please try again.'); }
    finally { clearTimeout(timeout); adding.current = false; setBusy(false); }
  }
  const photo = id => <img src={photos[id]} alt={`Black ${names[id]}`} width="650" height="650" loading="lazy" decoding="async" />;
  return <section id="matching-fit" className={styles.section} aria-labelledby="matching-fit-title">
    <div className="store-container">
      <div className={styles.heading}><p className="store-eyebrow">Local Jagoff / Cold weather n'at</p><h2 id="matching-fit-title">GET THE MATCHING FIT.</h2><p>Pick the Crown Original Hoodie or Sweatshirt. Top it off with a Crown Knit Beanie or Crown Pom-Pom Beanie.</p><strong>We cover the shipping.</strong></div>
      <div className={styles.products}><div className={styles.layers}>{LAYERS.map(id => <Link href={`/product/${id}`} key={id}>{photo(id)}<span>{names[id]}</span></Link>)}</div><div className={styles.hats}><p>Your crown. Your call.</p><div>{BEANIES.map(id => <Link href={`/product/${id}`} key={id}>{photo(id)}<span>{names[id]}</span></Link>)}</div></div></div>
      <div className={styles.action}><p>Your layer. Your beanie.<br />All Local Jagoff.</p><button ref={trigger} className="store-button" type="button" onClick={() => { setMessage(''); setOpen(true); }} aria-haspopup="dialog">Build your fit <ArrowRight size={20} aria-hidden="true" /></button></div>
    </div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="fit-dialog-title" onCancel={event => { event.preventDefault(); close(); }} onClose={() => setOpen(false)} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
      <div className={styles.dialogHeading}><div><p className="store-eyebrow">Get the matching fit</p><h2 id="fit-dialog-title">Make it yours.</h2></div><button type="button" className="icon-button" aria-label="Close matching fit" disabled={busy} onClick={close}><X size={24} /></button></div>
      {loading ? <p role="status">Loading sizes and prices...</p> : error ? <div role="alert"><p>Unable to load the current collection.</p><button type="button" className="store-button" onClick={retry}>Try again</button></div> : <>
        <fieldset className={styles.choices} disabled={busy}><legend>1. Choose your layer</legend><div>{LAYERS.map(id => {
          const product = products.find(p => Number(p.id) === id), choices = availableVariants(product);
          return <button type="button" key={id} aria-pressed={layerId === id} disabled={!choices.length} onClick={() => chooseLayer(id)}>{photo(id)}<span>{names[id]}</span><small>{choices.length ? `From ${money(Math.min(...choices.map(v => v.unit_amount)) / 100)}` : 'Currently unavailable'}</small>{layerId === id && <Check size={18} className={styles.check} aria-hidden="true" />}</button>;
        })}</div></fieldset>
        <label className={styles.sizeLabel} htmlFor="fit-size">2. {layerId === LAYERS[0] ? 'Hoodie' : 'Sweatshirt'} size / Black</label>
        <select id="fit-size" className={styles.size} disabled={busy || !variants.length} value={variantId} onChange={e => { setVariantId(e.target.value); setMessage(''); }}><option value="">Select your size</option>{variants.map(v => <option value={String(v.id)} key={v.id}>{v.size} - {money(v.unit_amount / 100)}</option>)}</select>
        <fieldset className={styles.choices} disabled={busy}><legend>3. Choose your beanie</legend><div>{BEANIES.map(id => {
          const product = products.find(p => Number(p.id) === id), variant = availableVariants(product).find(v => v.size === 'One size');
          return <button key={id} type="button" aria-pressed={beanieId === id} disabled={!variant} onClick={() => { setBeanieId(id); setMessage(''); }}>{photo(id)}<span>{names[id]}</span><small>{variant ? `One size / ${money(variant.unit_amount / 100)}` : 'Currently unavailable'}</small>{beanieId === id && <Check size={18} className={styles.check} aria-hidden="true" />}</button>;
        })}</div></fieldset>
        <p className={styles.separate}>Made to order. Apparel and beanies may arrive separately.</p>
        <div className={styles.summary}><div aria-live="polite"><span>Your matching fit</span><strong>{items.length ? money(total / 100) : 'Select a size'}</strong></div>{shipping && <p>US Standard Shipping: <strong>{shipping.eligible ? 'On us.' : money(shipping.amount / 100)}</strong></p>}<button className="store-button" type="button" disabled={busy || items.length !== 2} onClick={addPair}>{busy ? 'Checking your fit...' : 'Add both to cart'} <ShoppingBag size={19} aria-hidden="true" /></button><p className={styles.tax}>Taxes calculated at checkout.</p>{message && <p className={styles.error} role="alert">{message}</p>}</div>
      </>}
    </dialog>
  </section>;
}
