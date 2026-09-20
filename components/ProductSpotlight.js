import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { money } from '../lib/storefront.cjs';
import { imagesForVariant } from '../lib/variant-images.cjs';

export default function ProductSpotlight({ products }) {
  if (!products.length) return null;
  return <section className="store-section store-container" id="spotlight" aria-labelledby="spotlight-title">
    <div className="store-section-heading">
      <div><p className="store-eyebrow">Just landed / Front &amp; back prints</p><h2 id="spotlight-title">In the spotlight.</h2></div>
      <p className="section-aside">Small up front. Big on the back.</p>
    </div>
    <div className="spotlight-grid">{products.map(product => {
      const color = Number(product.id) === 473808088 ? 'White' : 'Black';
      const images = imagesForVariant(product, { color });
      const variant = product.variants.find(v => v.color === color);
      return (
      <article className="spotlight-product" key={product.id}>
        <Link className="spotlight-link" href={'/product/' + product.id + (variant ? '?variant=' + variant.id : '')}>
          <div className="spotlight-images">
            <figure><img src={images[1]} alt={product.name + ', ' + color + ' back print'} width="880" height="880" loading="lazy" decoding="async" /><figcaption>Back</figcaption></figure>
            <figure><img src={images[0]} alt={product.name + ', ' + color + ' chest print'} width="880" height="880" loading="lazy" decoding="async" /><figcaption>Front</figcaption></figure>
          </div>
          <div className="spotlight-meta"><div><h3>{product.name}</h3><p>Black &amp; White <span>/</span> S-3XL <span>/</span> From {money(product.retail_price)}</p></div><ArrowUpRight size={24} aria-hidden="true" /></div>
        </Link>
      </article>);})}</div>
  </section>;
}
