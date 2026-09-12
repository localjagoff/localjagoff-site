import Head from "next/head";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Minus, Plus, Share2, ZoomIn, X } from "lucide-react";
import { CATEGORIES, displayName, money, inCategory } from "../../lib/storefront.cjs";
import RelatedProducts from "../../components/RelatedProducts";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../../components/Navbar";
import ProductReviews from "../../components/ProductReviews";
import { getTracker } from "../../lib/meta-pixel.cjs";
import { getProductImages } from "../../lib/getProductImages";
import { productJsonLd as buildProductJsonLd } from "../../lib/discovery.cjs";

const SITE_URL = "https://www.localjagoff.com";

function getVariantLabel(productName, variantName) {
  if (!variantName) return "Default";

  const cleanProductName = (productName || "").trim();
  const cleanVariantName = variantName.trim();

  if (
    cleanProductName &&
    cleanVariantName.toLowerCase().startsWith(cleanProductName.toLowerCase())
  ) {
    const remainder = cleanVariantName.slice(cleanProductName.length).trim();

    if (remainder.startsWith("/")) {
      return remainder.slice(1).trim();
    }

    if (remainder) {
      return remainder;
    }
  }

  return cleanVariantName;
}

const productDescriptions = {
  428851698:
    "Straight Pittsburgh energy. Clean keystone, no extra nonsense.",
  428851608:
    "Front and back print that actually hits. Not subtle. Not supposed to be.",
  428851513:
    "Different angle, same attitude. 412 sideways but still loud.",
  428550417:
    "You know exactly what this means. No explanation needed.",
  428821578:
    "Warm hoodie. Cold attitude. Perfect for when Pittsburgh does its thing.",
  428851907:
    "Throw it on and go. Clean, simple, does the job.",
  428983169:
    "Heavy hoodie, built right. Not that thin, cheap stuff.",
  428982889:
    "Keystone look, no filler. Just straight Pittsburgh.",
  428980566:
    "Solid hat. No gimmicks. Just wear it.",
  429208592:
    "Another one that hits. Keystone, 412, done right.",
  429536493:
    "Basic? Yeah. Boring? Not even close.",
  430964873:
    "724 pride with Local Jagoff attitude. Western PA knows what this one means.",
};

const productSeoDescriptions = {
  428851698:
    "Shop the Local Jagoff Keystone 412 Tee, a Pittsburgh jagoff shirt with black and gold attitude, Western PA pride, and clean keystone energy.",
  428851608:
    "Shop the Local Jagoff Steel City Front and Back Tee, a Pittsburgh jagoff shirt made for yinzer attitude, black and gold pride, and Western PA streetwear.",
  428851513:
    "Shop the Local Jagoff 412 Sideways Tee, a Pittsburgh jagoff shirt with 412 pride, yinzer humor, and black and gold local attitude.",
  428550417:
    "Shop the Certified Jagoff T-Shirt from Local Jagoff, a Pittsburgh attitude tee made for yinzers, Western PA locals, and jagoffs who get it.",
  428821578:
    "Shop the Pittsburgh Local Jagoff Keystone Hoodie, a black and gold hoodie built for Pittsburgh weather, Western PA pride, and yinzer attitude.",
  428851907:
    "Shop the Local Jagoff Trucker Cap, a Pittsburgh hat made for black and gold locals, Western PA jagoffs, and everyday yinzer attitude.",
  428983169:
    "Shop the Local Jagoff Keystone 412 Hoodie, a Pittsburgh hoodie with 412 pride, black and gold energy, and Western PA streetwear attitude.",
  428982889:
    "Shop the Local Jagoff Keystone Tee, a Pittsburgh jagoff shirt with clean keystone style, black and gold attitude, and Western PA pride.",
  428980566:
    "Shop the Local Jagoff Trucker Hat, a Pittsburgh cap made for black and gold pride, Western PA locals, and jagoff attitude.",
  429208592:
    "Shop the Local Jagoff Keystone Hoodie, a Pittsburgh hoodie made for black and gold streetwear, yinzer attitude, and Western PA pride.",
  429536493:
    "Shop the Local Jagoff 412 Tee, a Pittsburgh jagoff shirt built for 412 pride, black and gold attitude, and Western PA locals.",
  430964873:
    "Shop the Local Jagoff Keystone 724 Tee, a Pittsburgh-area jagoff shirt with 724 pride, Western PA attitude, and black and gold local energy.",
};

const productFallbackNames = {
  428851698: "Local Jagoff Keystone 412 Tee",
  428851608: "Local Jagoff Steel City Front and Back Tee",
  428851513: "Local Jagoff 412 Sideways Tee",
  428550417: "Certified Jagoff T-Shirt",
  428821578: "Pittsburgh Local Jagoff Keystone Hoodie",
  428851907: "Local Jagoff Trucker Cap",
  428983169: "Local Jagoff Keystone 412 Hoodie",
  428982889: "Local Jagoff Keystone Tee",
  428980566: "Local Jagoff Trucker Hat",
  429208592: "Local Jagoff Keystone Hoodie",
  429536493: "Local Jagoff 412 Tee",
  430964873: "Local Jagoff Keystone 724 Tee",
};

const productSignals = {};

function absoluteImageUrl(path) {
  if (!path) return `${SITE_URL}/images/social-share.jpg`;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${SITE_URL}${path}`;
  return `${SITE_URL}/${path}`;
}

function getProductSeoDescription(productId, productName, category) {
  if (productSeoDescriptions[productId]) {
    return productSeoDescriptions[productId];
  }

  const cleanName =
    productName && productName !== "Local Jagoff" ? productName : "Local Jagoff gear";

  if (category === "tees") {
    return `Shop ${cleanName} from Local Jagoff, a Pittsburgh jagoff shirt made for yinzer attitude, black and gold pride, and Western PA locals.`;
  }

  if (category === "hoodies") {
    return `Shop ${cleanName} from Local Jagoff, a Pittsburgh hoodie made for black and gold streetwear, yinzer attitude, and Western PA locals.`;
  }

  if (category === "hats") {
    return `Shop ${cleanName} from Local Jagoff, Pittsburgh headwear made for black and gold pride, Western PA locals, and jagoff attitude.`;
  }

  return `Shop ${cleanName} from Local Jagoff, Pittsburgh clothing and gear made for yinzers, jagoffs, black and gold pride, and Western PA attitude.`;
}

function ProductMeta({ shareTitle, shareDescription, shareImage, shareUrl, productJsonLd }) {
  const fullTitle = `${shareTitle} | Local Jagoff`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={shareDescription} key="description" />
      <link rel="canonical" href={shareUrl} key="canonical" />

      <meta property="og:title" content={fullTitle} key="og:title" />
      <meta property="og:description" content={shareDescription} key="og:description" />
      <meta property="og:image" content={shareImage} key="og:image" />
      <meta property="og:image:secure_url" content={shareImage} key="og:image:secure_url" />
      <meta property="og:image:type" content="image/jpeg" key="og:image:type" />
      <meta property="og:image:width" content="1200" key="og:image:width" />
      <meta property="og:image:height" content="1200" key="og:image:height" />
      <meta property="og:image:alt" content={`${shareTitle} product photo`} key="og:image:alt" />
      <meta property="og:url" content={shareUrl} key="og:url" />
      <meta property="og:type" content="website" key="og:type" />
      <meta property="og:site_name" content="Local Jagoff" key="og:site_name" />
      <meta property="og:locale" content="en_US" key="og:locale" />

      <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
      <meta name="twitter:title" content={fullTitle} key="twitter:title" />
      <meta name="twitter:description" content={shareDescription} key="twitter:description" />
      <meta name="twitter:image" content={shareImage} key="twitter:image" />
      <meta name="twitter:image:alt" content={`${shareTitle} product photo`} key="twitter:image:alt" />

      {productJsonLd && <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
        key="product-jsonld"
      />}
    </Head>
  );
}

export default function ProductPage({ initialProductId, initialProduct, initialVariantId, unavailable }) {
  const router = useRouter();
  const { id } = router.query;

  const productId = String(id || initialProductId || "");

  const [product, setProduct] = useState(initialProduct);
  const [selectedImage, setSelectedImage] = useState(initialProduct?.images?.[0] || "");
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);

  const touchStartX = useRef(null);
  const zoomTrigger = useRef(null);
  const zoomClose = useRef(null);

  const fallbackProductForImages = {
    id: productId,
    thumbnail_url: "/images/social-share.jpg",
  };

  const fallbackImage =
    getProductImages(fallbackProductForImages)[0] || "/images/social-share.jpg";

  const shareTitle =
    product?.name || productFallbackNames[productId] || "Local Jagoff";
  const shareDescription = getProductSeoDescription(
    productId,
    shareTitle,
    product?.category
  );
  const shareUrl = `${SITE_URL}/product/${productId}`;
  const productSignal = productSignals[productId];

  useEffect(() => {
    setProduct(initialProduct);
    setSelectedImage(initialProduct?.images?.[0] || "");
    setSelectedVariantId(initialVariantId);
    setQuantity(1);
  }, [initialProduct, initialVariantId]);

  useEffect(() => {
    if (!imageZoomOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    zoomClose.current?.focus();
    const handleEscape = (event) => {
      if (event.key === "Escape") setImageZoomOpen(false);
      if (event.key === "Tab") { event.preventDefault(); zoomClose.current?.focus(); }
    };
    document.addEventListener("keydown", handleEscape);
    return () => { document.removeEventListener("keydown", handleEscape); document.body.style.overflow = previousOverflow; zoomTrigger.current?.focus(); };
  }, [imageZoomOpen]);

  const images = useMemo(() => {
    if (!product) return [fallbackImage];

    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images;
    }

    return getProductImages(product);
  }, [product, fallbackImage]);

  const shareImage = absoluteImageUrl(images[0] || fallbackImage);

  const selectedImageIndex = useMemo(() => {
    const index = images.findIndex((img) => img === selectedImage);
    return index >= 0 ? index : 0;
  }, [images, selectedImage]);

  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return null;

    return (
      product.variants.find((v) => String(v.id) === String(selectedVariantId)) || null
    );
  }, [product, selectedVariantId]);

  const displayedPrice =
    selectedVariant?.price || product?.retail_price || "0.00";

  const productJsonLd = buildProductJsonLd(product);

  useEffect(() => {
    if (!product || !selectedVariant) return;
    return getTracker()?.observeProduct({ id: product.id, variant_id: selectedVariant.id,
      quantity: 1, unit_amount: Math.round(Number(displayedPrice) * 100) });
  }, [product?.id, selectedVariant?.id, displayedPrice]);

  const variantLabel = selectedVariant
    ? getVariantLabel(product?.name, selectedVariant.name)
    : "";

  const goToImage = (index) => {
    if (!images.length) return;
    const safeIndex = (index + images.length) % images.length;
    setSelectedImage(images[safeIndex]);
  };

  const nextImage = () => {
    goToImage(selectedImageIndex + 1);
  };

  const prevImage = () => {
    goToImage(selectedImageIndex - 1);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;

    const diff = touchStartX.current - e.changedTouches[0].clientX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextImage();
      } else {
        prevImage();
      }
    }

    touchStartX.current = null;
  };

  const addToCart = () => {
    if (!product || !selectedVariant) return;

    let cart;
    try { cart = JSON.parse(localStorage.getItem("cart")); } catch { cart = []; }
    if (!Array.isArray(cart)) cart = [];

    const existing = cart.find(
      (item) =>
        String(item.id) === String(product.id) &&
        String(item.variant_id || "") === String(selectedVariant?.id || "")
    );

    const addedQuantity = existing ? Math.max(0, Math.min(quantity, 99 - (Number(existing.quantity) || 0))) : quantity;
    if (existing) {
      existing.quantity = Math.min(99, (Number(existing.quantity) || 0) + quantity);
    } else {
      cart.push({
        id: product.id,
        variant_id: selectedVariant ? selectedVariant.id : null,
        variant_name: selectedVariant
          ? getVariantLabel(product.name, selectedVariant.name)
          : null,
        name: product.name,
        price: displayedPrice,
        quantity,
        image:
          (selectedImage || images[0]) &&
          (selectedImage || images[0]).startsWith("http")
            ? selectedImage || images[0]
            : `${window.location.origin}${selectedImage || images[0]}`,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    if (addedQuantity > 0) getTracker()?.addToCart([{ id: product.id, variant_id: selectedVariant.id,
      quantity: addedQuantity, unit_amount: Math.round(Number(displayedPrice) * 100) }]);

    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const openImageZoom = () => {
    if (typeof window === "undefined") return;

    setImageZoomOpen(true);
  };

  const handleShare = async () => {
    if (!product) return;

    const shareData = {
      title: product.name,
      text: "Check this out, jagoff.",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // do nothing
        }
      }
    }
  };

  if (!product) {
    return (
      <div className="product-page">
        <ProductMeta
          shareTitle={shareTitle}
          shareDescription={shareDescription}
          shareImage={shareImage}
          shareUrl={shareUrl}
          productJsonLd={productJsonLd}
        />

        <Navbar />

        <main id="main-content" className="loading-wrap">
          <div className="loading-card">
            <p className="loading-kicker">LOCAL JAGOFF</p>
            <h1>{unavailable ? "Temporarily unavailable" : "Product unavailable"}</h1>
            <p>Please check back soon. No purchase has been made.</p>
          </div>
        </main>


      </div>
    );
  }

  return (
    <div className="product-page">
      <ProductMeta
        shareTitle={shareTitle}
        shareDescription={shareDescription}
        shareImage={shareImage}
        shareUrl={shareUrl}
        productJsonLd={productJsonLd}
      />

      <Navbar />

      <nav className="product-breadcrumb store-container" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href={CATEGORIES.find(category => inCategory(product, category.key))?.href || '/stuff-nat'}>{CATEGORIES.find(category => inCategory(product, category.key))?.label || "Stuff N'at"}</Link><span>/</span><span>{displayName(product.name)}</span></nav>
      <main id="main-content" className="product-layout">
        <section className="gallery-panel">
          <div className="badge-row">
            <span className="badge">PITTSBURGH ATTITUDE</span>
            <span className="badge muted-badge">MADE TO ORDER</span>
          </div>

          <div
            className="main-image-wrap"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={selectedImage || images[0]}
              alt={product.name}
              className="main-image"
              width="900"
              height="900"
              fetchpriority="high"
            />

            <button ref={zoomTrigger} className="icon-button zoom-trigger" type="button" aria-label="Enlarge product image" onClick={openImageZoom}><ZoomIn size={20} /></button>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-arrow gallery-arrow-left"
                  onClick={prevImage}
                  aria-label="Previous image"
                >
                  <ArrowLeft size={20} />
                </button>

                <button
                  type="button"
                  className="gallery-arrow gallery-arrow-right"
                  onClick={nextImage}
                  aria-label="Next image"
                >
                  <ArrowRight size={20} />
                </button>
              </>
            )}
          </div>

          <div className="thumb-row">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                className={`thumb-button ${selectedImageIndex === i ? "active" : ""}`}
                onClick={() => setSelectedImage(img)}
                aria-label={`View product image ${i + 1}`}
                aria-pressed={selectedImageIndex === i}
              >
                <img src={img} alt={`${product.name} thumbnail ${i + 1}`} />
              </button>
            ))}
          </div>
        </section>

        <section className="info-panel">
          <p className="eyebrow">Local Jagoff Gear</p>
          {productSignal && <p className="product-signal">{productSignal}</p>}
          <h1>{displayName(product.name)}</h1>

          <p className="price" aria-live="polite">{money(displayedPrice)}</p>

          <p className="description">
            {productDescriptions[productId] ||
              "Local gear with Pittsburgh attitude. If you get it, you get it."}
          </p>

          {product.variants?.length > 0 && <>
            <div className="variant-label">
              <span>Size / Style{selectedVariant?.color ? ` / ${selectedVariant.color}` : ''}</span>
              {product.variants.length > 12 && <select aria-label="Size / Style" value={selectedVariantId} onChange={event => setSelectedVariantId(event.target.value)}>
                {!selectedVariant && <option value="">Select an available size / style</option>}
                {product.variants.map(variant => <option key={variant.id} value={variant.id}>{getVariantLabel(product.name, variant.name)}</option>)}
              </select>}
            </div>
            {product.variants.length <= 12 && <div className="variant-pills" role="group" aria-label="Available sizes and styles">
              {product.variants.map(variant => <button key={variant.id} type="button" aria-pressed={String(selectedVariantId) === String(variant.id)} onClick={() => setSelectedVariantId(String(variant.id))}>{getVariantLabel(product.name, variant.name)}</button>)}
            </div>}
          </>}

          <div className="qty-row">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              <Minus size={18} />
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              aria-label="Increase quantity"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="button-row">
            <button type="button" className="add-button" disabled={!selectedVariant} onClick={addToCart}>
              {added ? "Added to cart" : "Add to Cart"} <ArrowRight size={18} />
            </button>
            <button type="button" className="share-button" title={copied ? "Link copied" : "Share product"} aria-label={copied ? "Link copied" : "Share product"} onClick={handleShare}>
              <Share2 size={19} />
            </button>
          </div>

          <div className="trust-box">
            <p>{product.category === 'hats' ? 'Embroidered when ordered.' : 'Printed when ordered.'} Shipped direct. No mall-rack nonsense.</p>
            <p>Questions? <a href="mailto:hello@localjagoff.com">hello@localjagoff.com</a></p>
          </div>
          <div className="product-details">
            <details><summary>Shipping & made-to-order</summary><p>Your piece is made after you order. Shipping and taxes are calculated at secure checkout. You'll receive tracking when it ships.</p></details>
            <details><summary>Returns & support</summary><p>Made-to-order items are eligible for returns only when damaged, defective, incorrect or misprinted. Contact us within 14 days of delivery. <Link href="/terms">Read the full policy</Link>.</p></details>
          </div>
          <ProductReviews productId={product.id} />
        </section>
      </main>

      <RelatedProducts product={product} />

      {imageZoomOpen && (
        <div className="image-zoom-backdrop" role="dialog" aria-modal="true" aria-label="Product image preview" onClick={() => setImageZoomOpen(false)}>
          <button
            type="button"
            ref={zoomClose} className="image-zoom-close"
            autoFocus
            onClick={(e) => {
              e.stopPropagation();
              setImageZoomOpen(false);
            }}
            aria-label="Close image preview"
          >
            <X size={28} />
          </button>
          <img
            src={selectedImage || images[0]}
            alt={product.name}
            className="image-zoom-img"
          />
        </div>
      )}


    </div>
  );
}

export async function getServerSideProps(context) {
  const { loadProduct } = require("../../lib/catalog.cjs");
  const id = String(context.params?.id || "");
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return { notFound: true };
  context.res.setHeader("Cache-Control", "no-store");
  let product;
  try {
    product = await loadProduct(id, { apiKey: process.env.PRINTFUL_API_KEY });
  } catch {
    context.res.statusCode = 503;
    return { props: { initialProductId: id, initialProduct: null, initialVariantId: "", unavailable: true } };
  }
  if (!product) return { notFound: true };
  const requestedVariant = context.query.variant;
  // A stale/invalid Meta variant must not silently select a different item.
  const variant = requestedVariant === undefined ? product.variants[0] :
    product.variants.find(v => String(v.id) === requestedVariant);
  return {
    props: {
      initialProductId: id, initialProduct: product, initialVariantId: variant?.id || "", unavailable: false,
    },
  };
}
