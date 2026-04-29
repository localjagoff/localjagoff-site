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
};

const productSignals = {
  // Hoodie example:
  "428821578": "⚡ Moving fast",

  // T-shirt example:
  "428982889": "People keep grabbing this one.",
};

function absoluteImageUrl(path) {
  if (!path) return `${SITE_URL}/images/banner.jpg`;
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path}`;
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

  const touchStartX = useRef(null);

  const fallbackProductForImages = {
    id: productId,
    thumbnail_url: "/images/banner.jpg",
  };

  const fallbackImage =
    getProductImages(fallbackProductForImages)[0] || "/images/banner.jpg";

  const shareTitle =
    product?.name || productFallbackNames[productId] || "Local Jagoff";
  const shareDescription =
    productDescriptions[productId] || "Certified nonsense. Pittsburgh attitude.";
  const shareUrl = `${SITE_URL}/product/${productId}`;
  const productSignal = productSignals[productId];

  useEffect(() => {
    if (!id) return;

    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const found = Array.isArray(data)
          ? data.find((p) => String(p.id) === String(id))
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
  }, [id]);

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
        image: selectedImage || images[0],
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));

    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
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
        <Head>
          <title>{shareTitle} | Local Jagoff</title>
          <meta name="description" content={shareDescription} key="description" />
          <meta property="og:title" content={shareTitle} key="og:title" />
          <meta
            property="og:description"
            content={shareDescription}
            key="og:description"
          />
          <meta property="og:image" content={shareImage} key="og:image" />
          <meta property="og:image:secure_url" content={shareImage} key="og:image:secure_url" />
          <meta property="og:image:width" content="1200" key="og:image:width" />
          <meta property="og:image:height" content="1200" key="og:image:height" />
          <meta property="og:url" content={shareUrl} key="og:url" />
          <meta property="og:type" content="product" key="og:type" />
          <meta
            name="twitter:card"
            content="summary_large_image"
            key="twitter:card"
          />
          <meta name="twitter:title" content={shareTitle} key="twitter:title" />
          <meta name="twitter:description" content={shareDescription} key="twitter:description" />
          <meta name="twitter:image" content={shareImage} key="twitter:image" />
        </Head>

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
      <Head>
        <title>{shareTitle} | Local Jagoff</title>
        <meta name="description" content={shareDescription} key="description" />
        <meta property="og:title" content={shareTitle} key="og:title" />
        <meta
          property="og:description"
          content={shareDescription}
          key="og:description"
        />
        <meta property="og:image" content={shareImage} key="og:image" />
        <meta property="og:image:secure_url" content={shareImage} key="og:image:secure_url" />
        <meta property="og:image:width" content="1200" key="og:image:width" />
        <meta property="og:image:height" content="1200" key="og:image:height" />
        <meta property="og:url" content={shareUrl} key="og:url" />
        <meta property="og:type" content="product" key="og:type" />
        <meta
          name="twitter:card"
          content="summary_large_image"
          key="twitter:card"
        />
        <meta name="twitter:title" content={shareTitle} key="twitter:title" />
        <meta name="twitter:description" content={shareDescription} key="twitter:description" />
        <meta name="twitter:image" content={shareImage} key="twitter:image" />
      </Head>

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
                className={(selectedImage || images[0]) === img ? "thumb active" : "thumb"}
                onClick={() => setSelectedImage(img)}
                aria-label={`View image ${i + 1}`}
              >
                <img src={img} alt={`${product.name} ${i + 1}`} />
              </button>
            ))}
          </div>
        </section>

        <section className="details-panel">
          <div className="details-top">
            <p className="eyebrow">{product.category?.toUpperCase() || "PRODUCT"}</p>
            <h1>{product.name}</h1>

            <div className="price-row">
              <p className="price">${displayedPrice}</p>
              {variantLabel && <span className="selected-pill">{variantLabel}</span>}
            </div>

            {productSignal && (
              <div className="product-signal">
                <span className="signal-dot" />
                <span>{productSignal}</span>
              </div>
            )}

            {product?.category === "tees" ? (
              <div className="premium-tee-description">
                <p className="premium-lead">Not your average throwaway tee.</p>

                <p className="premium-copy">
                  This is a premium, soft-washed shirt made from 100% combed
                  ring-spun cotton — meaning it actually feels good the second
                  you put it on and holds up after real wear.
                </p>

                <p className="premium-punch">
                  No stiff fabric. No cheap prints. No weird fit.
                </p>

                <ul className="premium-list">
                  <li>Ultra-soft feel with a smooth finish</li>
                  <li>Durable print that won’t crack after a couple washes</li>
                  <li>True-to-size fit — not boxy, not slim nonsense</li>
                  <li>
                    Midweight 5.5 oz fabric — not thin, not heavy, right where
                    it should be
                  </li>
                  <li>Side-seamed construction for a better shape</li>
                </ul>

                <p className="premium-copy">
                  Built for everyday wear — not just one good photo.
                </p>

                <p className="premium-tagline">
                  Tested by jagoffs. Approved by jagoffs.
                </p>
              </div>
            ) : (
              <p className="description">
                {productDescriptions[product.id] || "Local Jagoff merch."}
              </p>
            )}
          </div>

          <div className="divider" />

          {Array.isArray(product.variants) && product.variants.length > 0 && (
            <div className="field">
              <div className="label-row">
                <label htmlFor="variant-select">Size / Option</label>
                <span>{product.variants.length} options</span>
              </div>

              <select
                id="variant-select"
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {getVariantLabel(product.name, v.name)} - ${v.price}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <div className="label-row">
              <label>Quantity</label>
              <span>Ready when yinz are</span>
            </div>

            <div className="purchase-row">
              <div className="qty-row">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="qty-value">{quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <div className="mini-total">
                <span>Item total</span>
                <strong>${(Number(displayedPrice) * quantity).toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <button type="button" className="primary-btn" onClick={addToCart}>
            {added ? "ADDED TO CART, N’AT" : "ADD TO CART, N’AT"}
          </button>

          <button type="button" className="secondary-btn" onClick={handleShare}>
            {copied ? "COPIED, JAGOFF" : "SEND THIS TO A JAGOFF"}
          </button>

          <div className="trust-box">
            <div>
              <strong>NO CORPORATE BULLSH*T</strong>
              <span>This ain’t mass-produced garbage.</span>
            </div>
            <div>
              <strong>MADE WHEN YOU ORDER</strong>
              <span>Fresh print. No dusty warehouse junk.</span>
            </div>
            <div>
              <strong>PITTSBURGH APPROVED</strong>
              <span>Tested by jagoffs. Approved by jagoffs.</span>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        .product-page {
          min-height: 100vh;
          color: #fff;
          background: transparent;
          overflow-x: hidden;
        }

        .product-layout {
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
          padding: 34px 20px 46px;
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.92fr);
          gap: 32px;
          align-items: start;
        }

        .gallery-panel,
        .details-panel {
          width: 100%;
          min-width: 0;
          background:
            linear-gradient(180deg, rgba(255, 230, 0, 0.045), rgba(255, 230, 0, 0) 24%),
            rgba(17, 17, 17, 0.96);
          border: 1px solid #242424;
          border-radius: 22px;
          padding: 18px;
          box-shadow: 0 16px 34px rgba(0, 0, 0, 0.34);
        }

        .details-panel {
          position: sticky;
          top: 92px;
          padding: 24px;
        }

        .badge-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(255, 230, 0, 0.45);
          border-radius: 999px;
          padding: 7px 10px;
          color: #ffe600;
          background: rgba(255, 230, 0, 0.06);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .muted-badge {
          color: #d9d9d9;
          border-color: #333;
          background: rgba(255, 255, 255, 0.035);
        }

        .main-image-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 18px;
          border: 1px solid #1f1f1f;
          background:
            radial-gradient(circle at top, rgba(255, 230, 0, 0.09), transparent 45%),
            #0b0b0b;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          touch-action: pan-y;
        }

        .main-image {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          object-position: center;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
        }

        .gallery-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 56px;
          border: 1px solid rgba(255, 230, 0, 0.35);
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.58);
          color: #ffe600;
          font-size: 44px;
          line-height: 1;
          cursor: pointer;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-bottom: 6px;
        }

        .gallery-arrow:hover {
          background: rgba(0, 0, 0, 0.82);
          border-color: #ffe600;
        }

        .gallery-arrow-left {
          left: 12px;
        }

        .gallery-arrow-right {
          right: 12px;
        }

        .thumb-row {
          width: 100%;
          max-width: 100%;
          display: flex;
          gap: 10px;
          margin-top: 12px;
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 2px;
          -webkit-overflow-scrolling: touch;
        }

        .thumb {
          width: 74px;
          height: 74px;
          min-width: 74px;
          border-radius: 14px;
          border: 1px solid #333;
          background: #0d0d0d;
          padding: 4px;
          cursor: pointer;
          flex: 0 0 auto;
          opacity: 0.78;
        }

        .thumb:hover {
          opacity: 1;
          transform: translateY(-1px);
        }

        .thumb.active {
          border-color: #ffe600;
          opacity: 1;
        }

        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          border-radius: 10px;
        }

        .details-top {
          margin-bottom: 18px;
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #ffe600;
          font-size: 12px;
          letter-spacing: 1.6px;
          font-weight: 900;
        }

        h1 {
          margin: 0;
          font-size: 38px;
          line-height: 1.05;
          word-break: normal;
          overflow-wrap: anywhere;
          letter-spacing: 1px;
        }

        .price-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin: 16px 0 10px;
        }

        .price {
          font-size: 34px;
          font-weight: 900;
          color: #fff;
          margin: 0;
          line-height: 1;
        }

        .selected-pill {
          display: inline-flex;
          border: 1px solid #333;
          border-radius: 999px;
          padding: 7px 10px;
          color: #d8d8d8;
          background: rgba(255, 255, 255, 0.04);
          font-size: 12px;
          font-weight: 800;
        }

        .product-signal {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 16px;
          padding: 9px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 230, 0, 0.35);
          background:
            radial-gradient(circle at left center, rgba(255, 230, 0, 0.16), transparent 58%),
            rgba(255, 255, 255, 0.035);
          color: #ffe600;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.2px;
          box-shadow: 0 10px 22px rgba(255, 230, 0, 0.08);
        }

        .signal-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ffe600;
          box-shadow: 0 0 14px rgba(255, 230, 0, 0.75);
          flex: 0 0 auto;
        }

        .description {
          color: #cfcfcf;
          line-height: 1.55;
          margin: 0;
          font-size: 15px;
        }

        .premium-tee-description {
          margin-top: 16px;
          padding: 18px;
          border: 1px solid #252525;
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(255, 230, 0, 0.05), rgba(255, 230, 0, 0) 32%),
            rgba(255, 255, 255, 0.025);
        }

        .premium-lead {
          margin: 0 0 10px;
          color: #fff;
          font-size: 18px;
          font-weight: 900;
          line-height: 1.25;
        }

        .premium-copy {
          margin: 0 0 12px;
          color: #cfcfcf;
          font-size: 15px;
          line-height: 1.55;
        }

        .premium-punch {
          margin: 0 0 14px;
          color: #fff;
          font-size: 15px;
          font-weight: 900;
          line-height: 1.45;
        }

        .premium-list {
          display: grid;
          gap: 9px;
          margin: 14px 0 14px;
          padding: 0;
          list-style: none;
        }

        .premium-list li {
          position: relative;
          padding-left: 20px;
          color: #e7e7e7;
          font-size: 14px;
          line-height: 1.45;
        }

        .premium-list li::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0.62em;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #ffe600;
          box-shadow: 0 0 12px rgba(255, 230, 0, 0.45);
        }

        .premium-tagline {
          margin: 16px 0 0;
          color: #ffe600;
          font-size: 15px;
          font-weight: 900;
          line-height: 1.4;
        }

        .divider {
          height: 1px;
          background: linear-gradient(90deg, #2b2b2b, transparent);
          margin: 20px 0;
        }

        .field {
          margin-bottom: 18px;
        }

        .label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        label {
          display: block;
          margin: 0;
          font-size: 14px;
          font-weight: 900;
          color: #fff;
        }

        .label-row span {
          color: #999;
          font-size: 12px;
          font-weight: 700;
        }

        select {
          width: 100%;
          padding: 15px 14px;
          border-radius: 14px;
          border: 1px solid #333;
          background: #0e0e0e;
          color: #fff;
          font-size: 15px;
          outline: none;
        }

        select:focus {
          border-color: rgba(255, 230, 0, 0.65);
          box-shadow: 0 0 0 3px rgba(255, 230, 0, 0.1);
        }

        .purchase-row {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 12px;
          align-items: center;
        }

        .qty-row {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #0e0e0e;
          border: 1px solid #333;
          border-radius: 14px;
          padding: 6px;
        }

        .qty-btn {
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 11px;
          background: #1c1c1c;
          color: #fff;
          font-size: 20px;
          cursor: pointer;
        }

        .qty-btn:hover {
          background: #ffe600;
          color: #000;
        }

        .qty-value {
          min-width: 30px;
          text-align: center;
          font-weight: 900;
        }

        .mini-total {
          min-height: 54px;
          border: 1px solid #292929;
          background: rgba(255, 255, 255, 0.025);
          border-radius: 14px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .mini-total span {
          color: #999;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .mini-total strong {
          font-size: 18px;
        }

        .primary-btn {
          width: 100%;
          border: none;
          border-radius: 16px;
          background: linear-gradient(180deg, #fff27a 0%, #ffe600 100%);
          color: #000;
          font-weight: 900;
          font-size: 15px;
          padding: 17px 18px;
          cursor: pointer;
          letter-spacing: 0.7px;
          box-shadow: 0 12px 26px rgba(255, 230, 0, 0.2);
          margin-bottom: 10px;
        }

        .primary-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.03);
          box-shadow: 0 16px 30px rgba(255, 230, 0, 0.25);
        }

        .secondary-btn {
          width: 100%;
          border: 1px solid #333;
          border-radius: 16px;
          background: #111;
          color: #fff;
          font-weight: 900;
          font-size: 15px;
          padding: 16px 18px;
          cursor: pointer;
          letter-spacing: 0.5px;
        }

        .secondary-btn:hover {
          border-color: rgba(255, 230, 0, 0.45);
          color: #ffe600;
          background: rgba(255, 230, 0, 0.04);
        }

        .trust-box {
          display: grid;
          gap: 10px;
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid #242424;
        }

        .trust-box div {
          display: grid;
          gap: 2px;
          padding-left: 12px;
          border-left: 3px solid rgba(255, 230, 0, 0.55);
        }

        .trust-box strong {
          font-size: 13px;
          color: #fff;
        }

        .trust-box span {
          font-size: 13px;
          color: #aaa;
          line-height: 1.35;
        }

        @media (max-width: 980px) {
          .product-layout {
            grid-template-columns: 1fr;
          }

          .details-panel {
            position: static;
          }
        }

        @media (max-width: 768px) {
          .product-layout {
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 20px 14px 28px;
            gap: 18px;
            display: flex;
            flex-direction: column;
          }

          .gallery-panel,
          .details-panel {
            width: 100%;
            max-width: 100%;
            padding: 18px;
            margin: 0;
            box-sizing: border-box;
            border-radius: 20px;
          }

          .badge-row {
            margin-bottom: 10px;
          }

          .badge {
            font-size: 10px;
            padding: 6px 9px;
          }

          .main-image-wrap {
            width: 100%;
            max-width: 100%;
            aspect-ratio: 1 / 1;
            border-radius: 16px;
          }

          .main-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            object-position: center;
          }

          h1 {
            font-size: 31px;
            line-height: 1.08;
          }

          .price {
            font-size: 30px;
          }

          .description {
            font-size: 15px;
          }

          .product-signal {
            margin-bottom: 14px;
            font-size: 13px;
            padding: 9px 11px;
          }

          .purchase-row {
            grid-template-columns: 1fr;
          }

          .qty-row {
            width: 100%;
            justify-content: space-between;
          }

          .qty-btn {
            width: 46px;
            height: 42px;
          }

          .mini-total {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }

          .thumb {
            width: 64px;
            height: 64px;
            min-width: 64px;
          }

          .gallery-arrow {
            display: none;
          }

          .primary-btn,
          .secondary-btn {
            border-radius: 15px;
            padding: 16px;
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
