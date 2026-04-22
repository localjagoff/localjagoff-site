import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
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
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);

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

  // ✅ SHARE FUNCTION (added back)
  const handleShare = () => {
    if (!product) return;

    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: "Check this out n’at 👀",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
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
          <div className="main-image-wrap">
            <img src={selectedImage} className="main-image" />
          </div>

          <div className="thumb-row">
            {images.map((img, i) => (
              <button
                key={i}
                className={selectedImage === img ? "thumb active" : "thumb"}
                onClick={() => setSelectedImage(img)}
              >
                <img src={img} />
              </button>
            ))}
          </div>
        </section>

        <section className="details-panel">
          <h1>{product.name}</h1>
          <p className="price">${displayedPrice}</p>

          <select
            value={selectedVariantId}
            onChange={(e) => setSelectedVariantId(e.target.value)}
          >
            {product.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} - ${v.retail_price}
              </option>
            ))}
          </select>

          <div style={{ marginTop: "15px" }}>
            <button className="primary-btn" onClick={addToCart}>
              ADD TO CART, N’AT
            </button>
          </div>

          {/* ✅ SHARE BUTTON */}
          <div style={{ marginTop: "10px" }}>
            <button className="secondary-btn" onClick={handleShare}>
              🔗 SHARE THIS TO A JAGOFF
            </button>
            {copied && <p style={{ fontSize: "12px" }}>Copied!</p>}
          </div>
        </section>
      </div>

      <style jsx>{`
        .secondary-btn {
          width: 100%;
          border: 1px solid #333;
          border-radius: 12px;
          background: #111;
          color: #fff;
          padding: 14px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
