import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import Navbar from './Navbar';
import ProductCard from './ProductCard';
import useCatalog from '../lib/useCatalog';
import { CATEGORIES, SMALL_GOODS, inCategory, inSmallCategory, sortCatalog } from '../lib/storefront.cjs';

export function CatalogStatus({ loading, error, retry }) {
  if (error) return <div className="catalog-status" role="alert"><h2>The shop is taking a moment.</h2><p>We couldn't load the collection. Please try again.</p><button className="store-button" onClick={retry}>Try again <ArrowRight size={18} /></button></div>;
  if (loading) return <div className="catalog-skeleton" role="status" aria-label="Loading collection">{[1, 2, 3].map(n => <div key={n} />)}<span className="sr-only">Loading collection</span></div>;
  return null;
}

export default function CatalogPage({ category }) {
  const catalog = useCatalog();
  const [sort, setSort] = useState('curated');
  const [sub, setSub] = useState('All');
  const current = CATEGORIES.find(item => item.key === category);
  const products = sortCatalog(catalog.products.filter(product => inCategory(product, category) && (category !== 'stuff' || inSmallCategory(product, sub))), sort);
  return <div className="storefront category-store">
    <Head><title>{`${current.label} | Local Jagoff`}</title><meta name="description" content={`${current.description} Shop Local Jagoff apparel and small goods.`} key="description" /><link rel="canonical" href={`https://www.localjagoff.com${current.href}`} key="canonical" /></Head>
    <Navbar />
    <main id="main-content">
      <header className="collection-heading store-container"><p className="store-eyebrow"><Link href="/">Local Jagoff</Link> / The collection</p><h1>{current.label}<span className="brand-period">.</span></h1><p>{current.description}</p></header>
      <nav className="category-tabs store-container" aria-label="Shop categories">{CATEGORIES.map(item => <Link key={item.key} href={item.href} aria-current={item.key === category ? 'page' : undefined}>{item.label}</Link>)}</nav>
      <section className="store-container collection-content" aria-label={current.label}>
        {category === 'stuff' && <div className="small-goods-filters" aria-label="Small goods categories">{['All', ...SMALL_GOODS].map(item => <button key={item} type="button" aria-pressed={item === sub} onClick={() => setSub(item)}>{item}</button>)}</div>}
        <div className="collection-toolbar"><span aria-live="polite">{catalog.loading ? 'Loading collection' : `${products.length} ${products.length === 1 ? 'style' : 'styles'}`}</span><label><SlidersHorizontal size={16} /> <span className="sr-only">Sort products</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="curated">Featured order</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name: A to Z</option></select></label></div>
        <CatalogStatus {...catalog} />
        {!catalog.loading && !catalog.error && (products.length ? <div className="shop-grid">{products.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="small-goods-empty"><span className="store-eyebrow">{sub === 'All' ? 'Not on the shelf. Yet.' : sub}</span><h2>Good things.<br />Small packages.</h2><p>{category === 'stuff' ? "Stickers, keychains, magnets and the other things that don't belong on a hanger. Nothing available in this collection yet." : 'No products are available in this collection right now.'}</p><Link className="store-button" href="/tees">Shop the T-Shirts <ArrowRight size={18} /></Link><Link className="text-link" href="/contact">Got something in mind? Get in touch <ArrowRight size={17} /></Link></div>)}
      </section>
      <div className="collection-service store-container"><span>Made to order.</span><span>Shipping calculated at checkout.</span><Link href="/contact">Questions? Talk to us <ArrowRight size={16} /></Link></div>
    </main>
  </div>;
}
