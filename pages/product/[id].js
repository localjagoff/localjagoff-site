import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../../components/Navbar";
import { getProductImages } from "../../lib/getProductImages";

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

const productSignals = {
  // Hoodie example:
  "428821578": "⚡ Moving fast",

  // T-shirt example:
  "428982889": "People keep grabbing this one.",
};

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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
        key="product-jsonld"
      />
    </Head>
  );
}

export default function ProductPage({ initialProductId }) {
  const router = useRouter();
  const { id } = router.query;

  const productId = String(id || initialProductId || "");

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);

  const touchStartX = useRef(null);

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
    if (!productId) return;

    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const found = Array.isArray(data)
          ? data.find((p) => String(p.id) === String(productId))
          : null;

        if (!found) return;

        const imgs = getProductImages(found);

        setProduct({
          ...found,
          images: imgs,
          thumbnail_url: imgs[0],
        });

        setSelectedImage(imgs[0]);

        if (found.variants?.length) {
          setSelectedVariantId(found.variants[0].id);
        }
      })
      .catch(() => setProduct(null));
  }, [productId]);

  useEffect(() => {
    if (!imageZoomOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setImageZoomOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
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
      product.variants.find((v) => String(v.id) === String(selectedVariantId)) ||
      product.variants[0]
    );
  }, [product, selectedVariantId]);

  const displayedPrice =
    selectedVariant?.price || product?.retail_price || "0.00";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: shareTitle,
    description: shareDescription,
    image: [shareImage],
    brand: {
      "@type": "Brand",
      name: "Local Jagoff",
    },
    url: shareUrl,
    ...(product
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: String(displayedPrice),
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            url: shareUrl,
            seller: {
              "@type": "Organization",
              name: "Local Jagoff",
            },
          },
        }
      : {}),
  };

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
    if (!product) return;

    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existing = cart.find(
      (item) =>
        String(item.id) === String(product.id) &&
        String(item.variant_id || "") === String(selectedVariant?.id || "")
    );

    if (existing) {
      existing.quantity += quantity;
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

    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const openImageZoom = () => {
    if (typeof window === "undefined") return;

    if (window.innerWidth <= 768) {
      setImageZoomOpen(true);
    }
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

        <main className="loading-wrap">
          <div className="loading-card">
            <p className="loading-kicker">LOCAL JAGOFF</p>
            <h1>Loading the goods...</h1>
          </div>
        </main>

        <style jsx>{`
          .product-page {
            min-height: 100vh;
            background: transparent;
            color: #fff;
          }
          

          .loading-wrap {
            padding: 24px;
          }

          .loading-card {
            max-width: 600px;
            margin: 0 auto;
            border: 1px solid #222;
            border-radius: 18px;
            padding: 24px;
            background: #111;
          }

          .loading-kicker {
            color: #ffe600;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 1.4px;
            margin: 0 0 8px;
          }

          h1 {
            margin: 0;
          }
        `}</style>
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

      <main className="product-layout">
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
              onClick={openImageZoom}
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-arrow gallery-arrow-left"
                  onClick={prevImage}
                  aria-label="Previous image"
                >
                  ‹
                </button>

                <button
                  type="button"
                  className="gallery-arrow gallery-arrow-right"
                  onClick={nextImage}
                  aria-label="Next image"
                >
                  ›
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
              >
                <img src={img} alt={`${product.name} thumbnail ${i + 1}`} />
              </button>
            ))}
          </div>
        </section>

        <section className="info-panel">
          <p className="eyebrow">Local Jagoff Gear</p>
          {productSignal && <p className="product-signal">{productSignal}</p>}
          <h1>{product.name}</h1>

          <p className="price">${displayedPrice}</p>

          <p className="description">
            {productDescriptions[productId] ||
              "Local gear with Pittsburgh attitude. If you get it, you get it."}
          </p>

          {product.variants?.length > 0 && (
            <label className="variant-label">
              Size / Style
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {getVariantLabel(product.name, v.name)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="qty-row">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <div className="button-row">
            <button type="button" className="add-button" onClick={addToCart}>
              {added ? "Added" : "Add to Cart"}
            </button>
            <button type="button" className="share-button" onClick={handleShare}>
              {copied ? "Copied" : "Share"}
            </button>
          </div>

          <div className="trust-box">
            <p>Printed when ordered. Shipped direct. No mall-rack nonsense.</p>
            <p>Questions? Hit up info@localjagoff.com.</p>
          </div>
        </section>
      </main>

      {imageZoomOpen && (
        <div className="image-zoom-backdrop" onClick={() => setImageZoomOpen(false)}>
          <button
            type="button"
            className="image-zoom-close"
            onClick={(e) => {
              e.stopPropagation();
              setImageZoomOpen(false);
            }}
            aria-label="Close image preview"
          >
            ×
          </button>
          <img
            src={selectedImage || images[0]}
            alt={product.name}
            className="image-zoom-img"
          />
        </div>
      )}

      <style jsx>{`
        .product-page {
          min-height: 100vh;
          background: transparent;
          color: #fff;
        }

        .product-layout {
          max-width: 1120px;
          margin: 0 auto;
          padding: 32px 18px 80px;
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
          gap: 28px;
          align-items: start;
        }

        .gallery-panel,
        .info-panel {
          border: 1px solid rgba(255, 230, 0, 0.18);
          border-radius: 26px;
          background: rgba(8, 8, 8, 0.82);
          box-shadow: 0 20px 80px rgba(0, 0, 0, 0.35);
          padding: 18px;
        }

        .badge-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(255, 230, 0, 0.45);
          border-radius: 999px;
          color: #ffe600;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1px;
          padding: 7px 10px;
          text-transform: uppercase;
          background: rgba(255, 230, 0, 0.08);
        }

        .muted-badge {
          color: #bbb;
          border-color: rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.05);
        }

        .main-image-wrap {
          position: relative;
          border-radius: 22px;
          overflow: hidden;
          background: #f7f7f7;
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .main-image {
          max-width: 100%;
          max-height: 100%;
          width: 100%;
          height: 100%;
          object-fit: contain;
          cursor: zoom-in;
        }

        .gallery-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          background: rgba(0, 0, 0, 0.72);
          color: #ffe600;
          font-size: 30px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        .gallery-arrow-left {
          left: 12px;
        }

        .gallery-arrow-right {
          right: 12px;
        }

        .thumb-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(76px, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .thumb-button {
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 14px;
          background: #111;
          padding: 6px;
          cursor: pointer;
          aspect-ratio: 1 / 1;
        }

        .thumb-button.active {
          border-color: #ffe600;
          box-shadow: 0 0 0 2px rgba(255, 230, 0, 0.16);
        }

        .thumb-button img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 10px;
          background: #f7f7f7;
        }

        .info-panel {
          position: sticky;
          top: 16px;
        }

        .eyebrow {
          color: #ffe600;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.6px;
          margin: 0 0 10px;
          text-transform: uppercase;
        }

        .product-signal {
          display: inline-flex;
          margin: 0 0 10px;
          padding: 7px 10px;
          border-radius: 999px;
          color: #ffe600;
          background: rgba(255, 230, 0, 0.08);
          border: 1px solid rgba(255, 230, 0, 0.28);
          font-size: 12px;
          font-weight: 900;
        }

        .info-panel h1 {
          font-size: clamp(32px, 4vw, 58px);
          line-height: 0.95;
          letter-spacing: 0.5px;
          margin: 0 0 14px;
          text-transform: uppercase;
        }

        .price {
          color: #ffe600;
          font-size: 26px;
          font-weight: 900;
          margin: 0 0 18px;
        }

        .description {
          color: #ddd;
          font-size: 16px;
          line-height: 1.55;
          margin: 0 0 20px;
        }

        .variant-label {
          display: grid;
          gap: 8px;
          color: #ffe600;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .variant-label select {
          width: 100%;
          border-radius: 14px;
          border: 1px solid #333;
          background: #050505;
          color: #fff;
          padding: 13px 14px;
          font-size: 15px;
        }

        .qty-row {
          display: inline-grid;
          grid-template-columns: 44px 52px 44px;
          align-items: center;
          border: 1px solid #333;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 18px;
          background: #050505;
        }

        .qty-row button {
          width: 44px;
          height: 44px;
          border: 0;
          background: #111;
          color: #ffe600;
          font-size: 22px;
          cursor: pointer;
        }

        .qty-row span {
          text-align: center;
          font-weight: 900;
        }

        .button-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          margin-bottom: 18px;
        }

        .add-button,
        .share-button {
          border: 0;
          border-radius: 16px;
          font-weight: 900;
          font-size: 15px;
          cursor: pointer;
          padding: 15px 18px;
          text-transform: uppercase;
        }

        .add-button {
          background: #ffe600;
          color: #000;
        }

        .share-button {
          background: #1a1a1a;
          color: #fff;
          border: 1px solid #333;
        }

        .trust-box {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          padding: 14px;
          color: #cfcfcf;
          font-size: 13px;
          line-height: 1.45;
        }

        .trust-box p {
          margin: 0;
        }

        .trust-box p + p {
          margin-top: 8px;
        }

        .image-zoom-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .image-zoom-img {
          max-width: 100%;
          max-height: 86vh;
          object-fit: contain;
          border-radius: 18px;
          background: #f7f7f7;
        }

        .image-zoom-close {
          position: fixed;
          top: 18px;
          right: 18px;
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: #111;
          color: #ffe600;
          font-size: 30px;
          line-height: 1;
          cursor: pointer;
          z-index: 10000;
        }

        @media (max-width: 860px) {
          .product-layout {
            grid-template-columns: 1fr;
          }

          .info-panel {
            position: static;
          }
        }

        @media (max-width: 560px) {
          .product-layout {
            padding: 18px 12px 60px;
          }

          .gallery-panel,
          .info-panel {
            border-radius: 20px;
            padding: 14px;
          }

          .button-row {
            grid-template-columns: 1fr;
          }

          .share-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export async function getServerSideProps(context) {
  return {
    props: {
      initialProductId: String(context.params?.id || ""),
    },
  };
}
