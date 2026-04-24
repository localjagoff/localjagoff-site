import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../../components/Navbar";
import productImages from "../../lib/productImages";

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
};

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);

  const touchStartX = useRef(null);

  useEffect(() => {
    if (!id) return;

    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const found = Array.isArray(data)
          ? data.find((p) => String(p.id) === String(id))
          : null;

        if (!found) return;

        const imgs = productImages[found.id] || [found.thumbnail_url];

        setProduct({
          ...found,
          images: imgs,
        });

        setSelectedImage(imgs[0]);

        if (found.variants?.length) {
          setSelectedVariantId(found.variants[0].id);
        }
      });
  }, [id]);

  const images = useMemo(() => {
    if (!product) return ["/images/placeholder.jpg"];
    return product.images?.length
      ? product.images
      : [product.thumbnail_url || "/images/placeholder.jpg"];
  }, [product]);

  const selectedImageIndex = useMemo(() => {
    const index = images.findIndex((img) => img === selectedImage);
    return index >= 0 ? index : 0;
  }, [images, selectedImage]);

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

  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return null;

    return (
      product.variants.find((v) => String(v.id) === String(selectedVariantId)) ||
      product.variants[0]
    );
  }, [product, selectedVariantId]);

  const displayedPrice =
    selectedVariant?.price || product?.retail_price || "0.00";

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
        image: selectedImage,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
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
        <Navbar />
        <div className="loading">Loading...</div>

        <style jsx>{`
          .product-page {
            min-height: 100vh;
            background: #000;
            color: #fff;
          }

          .loading {
            padding: 24px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="product-page">
      <Navbar />

      <div className="product-layout">
        <section className="gallery-panel">
          <div
            className="main-image-wrap"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={selectedImage}
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
                className={selectedImage === img ? "thumb active" : "thumb"}
                onClick={() => setSelectedImage(img)}
              >
                <img src={img} alt={`${product.name} ${i + 1}`} />
              </button>
            ))}
          </div>
        </section>

        <section className="details-panel">
          <p className="eyebrow">{product.category?.toUpperCase() || "PRODUCT"}</p>
          <h1>{product.name}</h1>
          <p className="price">${displayedPrice}</p>

          <p className="description">
            {productDescriptions[product.id] || "Local Jagoff merch."}
          </p>

          {Array.isArray(product.variants) && product.variants.length > 0 && (
            <div className="field">
              <label htmlFor="variant-select">Size / Option</label>
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
            <label>Quantity</label>
            <div className="qty-row">
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="qty-value">{quantity}</span>
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQuantity((q) => q + 1)}
              >
                +
              </button>
            </div>
          </div>

          <button type="button" className="primary-btn" onClick={addToCart}>
            ADD TO CART, N’AT
          </button>

          <button type="button" className="secondary-btn" onClick={handleShare}>
            {copied ? "COPIED, JAGOFF" : "SHARE TO A JAGOFF"}
          </button>
        </section>
      </div>

      <style jsx>{`
        .product-page {
          min-height: 100vh;
          color: #fff;
          background:
            radial-gradient(circle at left center, rgba(255, 230, 0, 0.08), transparent 28%),
            radial-gradient(circle at right 18%, rgba(255, 255, 255, 0.04), transparent 20%),
            #000;
        }

        .product-layout {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 20px 40px;
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
          gap: 32px;
          align-items: start;
        }

        .gallery-panel,
        .details-panel {
          background:
            linear-gradient(180deg, rgba(255, 230, 0, 0.04), rgba(255, 230, 0, 0) 22%),
            rgba(17, 17, 17, 0.96);
          border: 1px solid #222;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
        }

        .main-image-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 14px;
          border: 1px solid #1d1d1d;
          background:
            radial-gradient(circle at top, rgba(255, 230, 0, 0.08), transparent 45%),
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
          object-fit: contain;
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
          display: flex;
          gap: 10px;
          margin-top: 12px;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .thumb {
          width: 72px;
          height: 72px;
          border-radius: 12px;
          border: 1px solid #333;
          background: #0d0d0d;
          padding: 4px;
          cursor: pointer;
          flex: 0 0 auto;
        }

        .thumb.active {
          border-color: #ffe600;
        }

        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .eyebrow {
          margin: 0 0 8px;
          color: #ffe600;
          font-size: 12px;
          letter-spacing: 1.5px;
          font-weight: 700;
        }

        h1 {
          margin: 0 0 10px;
          font-size: 34px;
          line-height: 1.1;
        }

        .price {
          font-size: 30px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 14px;
        }

        .description {
          color: #c9c9c9;
          line-height: 1.5;
          margin: 0 0 22px;
        }

        .field {
          margin-bottom: 18px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 700;
          color: #ddd;
        }

        select {
          width: 100%;
          padding: 14px 14px;
          border-radius: 12px;
          border: 1px solid #333;
          background: #0e0e0e;
          color: #fff;
          font-size: 15px;
          outline: none;
        }

        .qty-row {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #0e0e0e;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 6px;
        }

        .qty-btn {
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 10px;
          background: #1c1c1c;
          color: #fff;
          font-size: 20px;
          cursor: pointer;
        }

        .qty-value {
          min-width: 28px;
          text-align: center;
          font-weight: 700;
        }

        .primary-btn {
          width: 100%;
          border: none;
          border-radius: 14px;
          background: linear-gradient(180deg, #fff27a 0%, #ffe600 100%);
          color: #000;
          font-weight: 800;
          font-size: 15px;
          padding: 16px 18px;
          cursor: pointer;
          letter-spacing: 0.5px;
          box-shadow: 0 10px 24px rgba(255, 230, 0, 0.18);
          margin-bottom: 10px;
        }

        .secondary-btn {
          width: 100%;
          border: 1px solid #333;
          border-radius: 14px;
          background: #111;
          color: #fff;
          font-weight: 800;
          font-size: 15px;
          padding: 16px 18px;
          cursor: pointer;
          letter-spacing: 0.5px;
        }

        @media (max-width: 900px) {
          .product-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .product-layout {
            padding: 20px 14px 28px;
            gap: 18px;
          }

          h1 {
            font-size: 28px;
          }

          .price {
            font-size: 26px;
          }

          .thumb {
            width: 64px;
            height: 64px;
          }

          .gallery-arrow {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
