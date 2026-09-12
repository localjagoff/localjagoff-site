import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { displayName, money } from '../lib/storefront.cjs';

export default function ProductCard({ product }) {
  const images = product.images?.length ? product.images : [product.thumbnail_url || '/placeholder.jpg'];
  const prices = product.variants?.map(variant => Number(variant.price)).filter(Number.isFinite) || [];
  const varies = new Set(prices).size > 1;
  return <article className="shop-product">
    <Link className="product-card-link" href={`/product/${product.id}`} aria-label={`${product.name}, ${varies ? 'from ' : ''}${money(product.retail_price)}`}>
      <div className="product-card-media">
        <img className="product-card-primary" src={images[0]} alt={product.name} loading="lazy" decoding="async" width="600" height="600" />
        {images[1] && <img className="product-card-secondary" src={images[1]} alt="" loading="lazy" decoding="async" width="600" height="600" />}
        <span className="product-card-arrow" aria-hidden="true"><ArrowUpRight size={20} /></span>
      </div>
      <div className="product-card-meta"><h3>{displayName(product.name)}</h3><p>{varies && <span>From </span>}{money(product.retail_price)}</p></div>
      <p className="product-card-detail">{product.category === 'hats' ? 'Embroidered headwear' : product.category === 'hoodies' ? 'Made-to-order layer' : ['tees', '724'].includes(product.category) ? 'Made-to-order graphic tee' : 'Small goods'}</p>
    </Link>
  </article>;
}
