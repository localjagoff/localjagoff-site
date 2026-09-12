import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import useCatalog from '../lib/useCatalog';
import ProductCard from './ProductCard';

export default function RelatedProducts({ product }) {
  const { products, loading, error } = useCatalog();
  if (loading || error) return null;
  const related = products.filter(item => String(item.id) !== String(product.id)).sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category)).slice(0, 4);
  if (!related.length) return null;
  return <section className="product-related store-container"><div className="store-section-heading"><div><p className="store-eyebrow">Keep good company</p><h2>Also in the rotation.</h2></div><Link className="text-link" href="/tees">Keep browsing <ArrowRight size={18} /></Link></div><div className="selected-products">{related.map(item => <ProductCard product={item} key={item.id} />)}</div></section>;
}
