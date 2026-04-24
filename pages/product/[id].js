import { useRouter } from "next/router";
import { useEffect, useMemo, useState, useRef } from "react";
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

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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

        setSelectedImageIndex(0);

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

  const selectedImage = images[selectedImageIndex];

  const nextImage = () => {
    setSelectedImageIndex((i) => (i + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((i) =>
      i === 0 ? images.length - 1 : i - 1
    );
  };

  // 🔥 SWIPE HANDLING
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;

    const diff = touchStartX.current - e.changedTouches[0].clientX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) nextImage(); // swipe left
      else prevImage(); // swipe right
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

  if (!product) {
    return (
      <div className="product-page">
        <Navbar />
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="product-page">
      <Navbar />

      <div className="product-layout">
        <section className="gallery-panel">

          {/* 🔥 IMAGE + SWIPE */}
          <div
            className="main-image-wrap"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img src={selectedImage} className="main-image" />

            {/* 🔥 ARROWS */}
            {images.length > 1 && (
              <>
                <button className="arrow left" onClick={prevImage}>‹</button>
                <button className="arrow right" onClick={nextImage}>›</button>
              </>
            )}
          </div>

          {/* THUMBNAILS */}
          <div className="thumb-row">
            {images.map((img, i) => (
              <button
                key={i}
                className={selectedImageIndex === i ? "thumb active" : "thumb"}
                onClick={() => setSelectedImageIndex(i)}
              >
                <img src={img} />
              </button>
            ))}
          </div>
        </section>

        <section className="details-panel">
          <h1>{product.name}</h1>
          <p className="price">${displayedPrice}</p>

          {product.variants?.length > 0 && (
            <select
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
            >
              {product.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {getVariantLabel(product.name, v.name)} - ${v.price}
                </option>
              ))}
            </select>
          )}

          <button className="primary-btn" onClick={addToCart}>
            ADD TO CART, N’AT
          </button>
        </section>
      </div>

      <style jsx>{`
        .main-image-wrap {
          position: relative;
        }

        .arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0,0,0,0.6);
          border: none;
          color: #fff;
          font-size: 28px;
          padding: 10px;
          cursor: pointer;
          z-index: 10;
        }

        .left { left: 10px; }
        .right { right: 10px; }

        @media (max-width: 768px) {
          .arrow {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
