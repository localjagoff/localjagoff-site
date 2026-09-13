import Head from 'next/head';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Gamepad2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import { CatalogStatus } from '../components/CatalogPage';
import useCatalog from '../lib/useCatalog';
import { getFeaturedProducts } from '../lib/featuredProducts';
import { CATEGORIES, inCategory } from '../lib/storefront.cjs';

const categoryImages = [
  '/images/products/localjagoffkeystonetee-2.jpg',
  '/images/products/Local-Jagoff-Keyverse-hoodie2.jpg',
  '/images/products/localjagoffhat003.jpg',
];
export default function Home() {
  const catalog = useCatalog();
  const hasSmallGoods = catalog.products.some(product => inCategory(product, 'stuff'));
  const featured = getFeaturedProducts(catalog.products);
  const selected = [429728777, 428851608, 428980566, 430964873].map(id => catalog.products.find(product => Number(product.id) === id)).filter(Boolean);
  return <div className="storefront">
    <Head>
      <title>Local Jagoff | Independent Pittsburgh Apparel</title>
      <meta name="description" content="Pittsburgh roots. An attitude that travels. Discover Local Jagoff graphic T-shirts, hoodies, hats and Stuff N'at." key="description" />
      <link rel="canonical" href="https://www.localjagoff.com" key="canonical" />
      <link rel="preload" as="image" href="/images/products/Local-Jagoff-Keyverse-hoodie1.jpg" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:'Local Jagoff',url:'https://www.localjagoff.com',publisher:{'@type':'Organization',name:'Local Jagoff',url:'https://www.localjagoff.com',email:'hello@localjagoff.com',contactPoint:{'@type':'ContactPoint',contactType:'customer support',email:'hello@localjagoff.com',url:'https://www.localjagoff.com/contact'}}})}} />
    </Head>
    <Navbar />
    <main id="main-content">
      <section className="brand-hero">
        <img className="brand-hero-image" src="/images/products/Local-Jagoff-Keyverse-hoodie1.jpg" alt="Local Jagoff Keystone hoodie with the gold 412 back print" width="1200" height="1200" fetchpriority="high" />
        <div className="brand-hero-copy store-container"><p className="store-eyebrow">Independent apparel / Pittsburgh, PA</p><h1>LOCAL<br />JAGOFF<span>.</span></h1><p className="hero-description">For the ones who get it.<br />And the ones who never left it behind.</p><Link className="store-button" href="/tees">Shop the collection <ArrowUpRight size={19} /></Link></div>
        <Link className="hero-product-credit" href="/product/428821578"><span>In focus / Steel City 412 Crest Zip Hoodie</span><ArrowUpRight size={18} /></Link>
      </section>
      <div className="brand-strip"><span>Pittsburgh roots.</span><span>Independent attitude.</span><span>Made to order.</span></div>
      <section className="store-section store-container" id="current-drop">
        <div className="store-section-heading"><div><p className="store-eyebrow">The current rotation</p><h2>Local essentials.</h2></div><Link className="text-link" href="/tees">Explore the collection <ArrowRight size={18} /></Link></div>
        <CatalogStatus {...catalog} />
        {!catalog.loading && !catalog.error && <div className="featured-products">{featured.map(product => <ProductCard key={product.id} product={product} />)}</div>}
      </section>
      <section className="category-band"><div className="store-container"><div className="store-section-heading"><div><p className="store-eyebrow">Find your uniform</p><h2>Everyday, your way.</h2></div><span className="section-aside">No occasion required.</span></div><div className="category-grid">{CATEGORIES.slice(0, 3).map((category, index) => <Link className="category-tile" key={category.key} href={category.href}><div><img src={categoryImages[index]} alt={category.label === 'T-Shirts' ? 'Black Local Jagoff Keystone T-shirt' : category.label === 'Hoodies' ? 'Black Local Jagoff zip hoodie' : 'Local Jagoff embroidered trucker hat'} width="600" height="600" loading="lazy" decoding="async" /></div><h3>{category.label}<ArrowUpRight size={23} /></h3></Link>)}</div></div></section>
      <section className="store-section store-container"><div className="store-section-heading"><div><p className="store-eyebrow">A few more good choices</p><h2>Wear your side of town.</h2></div><span className="section-aside">412. 724. Same attitude.</span></div><div className="selected-products">{selected.map(product => <ProductCard key={product.id} product={product} />)}</div></section>
      <section className="brand-story"><div className="store-container story-grid"><p className="store-eyebrow">A term of endearment.<br />Mostly.</p><div><h2>YOU CAN LEAVE THE CITY.<br /><span>THE CITY DOESN'T<br />LEAVE YOU.</span></h2><p>Local Jagoff is for the sarcastic, stubborn, proud local in all of us. Pittsburgh is where it starts. Where you take it is up to you.</p><Link className="text-link" href="/whats-a-jagoff">So, what's a jagoff? <ArrowUpRight size={19} /></Link></div></div></section>
      <section className="small-goods-feature store-container"><div><p className="store-eyebrow">Beyond the hanger</p><h2>Stuff N'at<span>.</span></h2><p>The little things that go everywhere with you.<br />Stickers, keychains, magnets. Same Local Jagoff attitude.</p><Link className="store-button button-outline" href="/stuff-nat">Explore Stuff N'at <ArrowUpRight size={19} /></Link></div><div className="small-goods-index"><span>{hasSmallGoods ? 'Small things. Same attitude.' : 'On the horizon'}</span><Link href="/stuff-nat">01 / Stickers <ArrowUpRight size={18} /></Link><Link href="/stuff-nat">02 / Keychains <ArrowUpRight size={18} /></Link><Link href="/stuff-nat">03 / Magnets & more <ArrowUpRight size={18} /></Link><p>{hasSmallGoods ? 'Explore the current small-goods selection.' : 'Nothing available yet. Good things take a minute.'}</p></div></section>
      <section className="off-clock"><div className="store-container off-clock-grid"><div><Gamepad2 size={30} strokeWidth={1.5} /><p className="store-eyebrow">Off the clock</p><h2>A little local nonsense.</h2><p>Put your reflexes where your mouth is.</p><div className="arcade-links"><Link href="/jagoff-jump">Jagoff Jump <ArrowUpRight size={17} /></Link><Link href="/yinzer-invaders">Yinzer Invaders <ArrowUpRight size={17} /></Link></div><Link className="text-link" href="/arcade">Enter the arcade <ArrowRight size={18} /></Link></div><div><p className="store-eyebrow">Keep it local</p><h2>Got something to say?</h2><p>A product question, an idea for the next drop, or a little constructive jagoffery. There's a real person on the other end.</p><Link className="text-link" href="/contact">Get in touch <ArrowRight size={18} /></Link><a className="text-link" href="https://www.facebook.com/profile.php?id=61588908282648" target="_blank" rel="noreferrer">Find Local Jagoff on Facebook <ArrowUpRight size={18} /></a></div></div></section>
    </main>
  </div>;
}
