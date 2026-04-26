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
    "Classic keystone design representing Pittsburgh pride. Premium feel, built for everyday wear.",
  428851608:
    "Steel City front and back print. Bold, clean, and built to stand out.",
  428851513:
    "Sideways 412 design with a cleaner, different look that still hits hard.",
  428550417:
    "Certified Jagoff tee. Straight to the point, no explanation needed.",
  428821578:
    "Warm, comfortable hoodie with Pittsburgh roots. Perfect for cold days n’at.",
  428851907:
    "Trucker cap with a clean, bold logo. Lightweight and built for everyday wear.",
  428983169:
    "Keystone 412 hoodie. Heavy, clean, and built for Pittsburgh weather.",
  428982889:
    "Keystone tee with straight Pittsburgh attitude. Clean look, everyday wear.",
  428980566:
    "Structured trucker hat with Local Jagoff branding. Simple and solid.",
  429208592:
    "Local Jagoff 412 hoodie with a clean keystone look and everyday fit.",
  429536493:
    "412 tee with Pittsburgh attitude. Clean, bold, and made for local jagoffs.",
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
  const shareImage = absoluteImageUrl(selectedImage || fallbackImage);
  const shareUrl = `${SITE_URL}/product/${productId}`;

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
          <meta property="og:url" content={shareUrl} key="og:url" />
          <meta property="og:type" content="product" key="og:type" />
          <meta
            name="twitter:card"
            content="summary_large_image"
            key="twitter:card"
          />
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
            background: #000;
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
        <meta property="og:url" content={shareUrl} key="og:url" />
        <meta property="og:type" content="product" key="og:type" />
        <meta
          name="twitter:card"
          content="summary_large_image"
          key="twitter:card"
        />
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

            <p className="description">
              {productDescriptions[product.id] || "Local Jagoff merch."}
            </p>
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
            {copied ? "COPIED, JAGOFF" : "SHARE TO A JAGOFF"}
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
          background:
            radial-gradient(circle at left center, rgba(255, 230, 0, 0.08), transparent 28%),
            radial-gradient(circle at right 18%, rgba(255, 255, 255, 0.04), transparent 20%),
            #000;
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
          transition:
            background 0.15s ease,
            transform 0.15s ease,
            border-color 0.15s ease;
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
          transition:
            border-color 0.15s ease,
            transform 0.15s ease,
            opacity 0.15s ease;
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
          margin: 16px 0 14px;
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

        .description {
          color: #cfcfcf;
          line-height: 1.55;
          margin: 0;
          font-size: 15px;
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
          transition:
            background 0.15s ease,
            color 0.15s ease;
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
          transition:
            transform 0.15s ease,
            filter 0.15s ease,
            box-shadow 0.15s ease;
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
          transition:
            border-color 0.15s ease,
            color 0.15s ease,
            background 0.15s ease;
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
