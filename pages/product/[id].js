import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import Head from "next/head";

const productImages = {
  428983169: [
    "/images/products/local-jagoff-412-hoodie.jpg",
    "/images/products/hoodie2.jpg",
  ],
  428982889: ["/images/products/localjagoffkeystonetee.jpg"],
  428980566: ["/images/products/localjagoffhatvr2.jpg"],
  428851907: ["/images/products/localjagoffhat.jpg"],
  428851698: ["/images/products/tee-keystone.jpg"],
  428851608: ["/images/products/tee-steel.jpg"],
  428851513: ["/images/products/local-jagoff-sideways-tee.png"],
  428821578: ["/images/products/local-jagoff-412-hoodie.jpg"],
  428550417: ["/images/products/tee-certified.jpg"],
};

const productDescriptions = {
  428851698:
    "Classic keystone design representing Pittsburgh pride. Premium feel, built for everyday wear.",
  428851608:
    "Steel City front and back print. Bold, clean, and made to stand out wherever you go.",
  428851513:
    "Sideways 412 design with a unique look. Simple, different, and unmistakably Pittsburgh.",
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
};

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
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setProduct(null);
          return;
        }

        const found = data.find((p) => String(p.id) === String(id));
        setProduct(found || null);
      })
      .catch(() => setProduct(null));
  }, [id]);

  const images = useMemo(() => {
    if (!product) return ["/images/placeholder.jpg"];
    return productImages[product.id] || [product.thumbnail_url || "/images/placeholder.jpg"];
  }, [product]);

  useEffect(() => {
    if (!product) return;

    setSelectedImage(images[0]);

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      setSelectedVariantId(String(product.variants[0].id));
    } else {
      setSelectedVariantId("");
    }
  }, [product, images]);

  const selectedVariant = useMemo(() => {
    if (!product || !Array.isArray(product.variants) || product.variants.length === 0) {
      return null;
    }

    return (
      product.variants.find((v) => String(v.id) === String(selectedVariantId)) ||
      product.variants[0]
    );
  }, [product, selectedVariantId]);

  const displayedPrice = selectedVariant?.price || product?.retail_price || "0.00";

  const addToCart = () => {
    if (!product) return;

    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const variantKey = selectedVariant ? String(selectedVariant.id) : `product-${product.id}`;

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
        cart_key: `${product.id}-${variantKey}`,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

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
      <div style={{ background: "#000", color: "#fff", minHeight: "100vh" }}>
        <Navbar />
        <div style={{ padding: 20 }}>Loading...</div>
      </div>
    );
  }

  const fullImageUrl = `https://www.localjagoff.com${selectedImage}`;

  return (
    <div className="product-page">
      <Head>
        <title>{product.name} | Local Jagoff</title>
        <meta property="og:title" content={product.name} />
        <meta
          property="og:description"
          content={productDescriptions[product.id] || "Local Jagoff merch."}
        />
        <meta property="og:image" content={fullImageUrl} />
        <meta
          property="og:url"
          content={`https://www.localjagoff.com/product/${product.id}`}
        />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <Navbar />

      <div className="product-container">
        <div className="product-gallery">
          <img src={selectedImage} className="main-image" alt={product.name} />

          <div className="thumb-row">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`${product.name} ${i + 1}`}
                className={selectedImage === img ? "thumb active" : "thumb"}
                onClick={() => setSelectedImage(img)}
              />
            ))}
          </div>
        </div>

        <div className="product-details">
          <h1>{product.name}</h1>
          <p className="price">${displayedPrice}</p>

          <p className="description">
            {productDescriptions[product.id] || "Local Jagoff merch."}
          </p>

          {Array.isArray(product.variants) && product.variants.length > 0 && (
            <div className="variant-wrap">
              <label htmlFor="variant-select" className="variant-label">
                Size / Option
              </label>
              <select
                id="variant-select"
                className="variant-select"
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
              >
                {product.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {getVariantLabel(product.name, variant.name)} - ${variant.price}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="qty">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              −
            </button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>

          <button className="btn add-btn" onClick={addToCart}>
            🛒 ADD TO CART, N’AT
          </button>

          <button
            className={`btn share-btn ${copied ? "copied" : ""}`}
            onClick={handleShare}
          >
            {copied ? "COPIED, N’AT" : "🔗 SHARE THIS TO A JAGOFF"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .product-page {
          background: #000;
          color: #fff;
          min-height: 100vh;
        }

        .product-container {
          display: flex;
          gap: 40px;
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .product-gallery {
          flex: 1;
        }

        .main-image {
          width: 100%;
          background: #000;
          object-fit: contain;
          border: 1px solid #222;
        }

        .thumb-row {
          display: flex;
          gap: 10px;
          margin-top: 10px;
          overflow-x: auto;
        }

        .thumb {
          width: 70px;
          height: 70px;
          object-fit: contain;
          background: #000;
          cursor: pointer;
          border: 1px solid #333;
        }

        .thumb.active {
          border: 2px solid #ffe600;
        }

        .product-details {
          flex: 1;
        }

        .price {
          margin: 10px 0 10px;
          font-size: 28px;
          font-weight: bold;
        }

        .description {
          margin-bottom: 20px;
          color: #ccc;
          line-height: 1.4;
        }

        .variant-wrap {
          margin-bottom: 20px;
        }

        .variant-label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
        }

        .variant-select {
          width: 100%;
          padding: 12px;
          background: #111;
          color: #fff;
          border: 1px solid #333;
          font-size: 16px;
        }

        .qty {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 20px;
        }

        .qty button {
          width: 42px;
          height: 42px;
          background: #111;
          color: #fff;
          border: 1px solid #333;
          cursor: pointer;
          font-size: 20px;
        }

        .btn {
          width: 100%;
          padding: 15px;
          font-weight: bold;
          border: none;
          cursor: pointer;
        }

        .add-btn {
          background: #ffe600;
          color: #000;
        }

        .share-btn {
          margin-top: 10px;
          background: #111;
          color: #fff;
          border: 1px solid #333;
          transition: transform 0.1s ease;
        }

        .share-btn:active {
          transform: scale(0.97);
        }

        .share-btn.copied {
          border-color: #ffe600;
        }

        @media (max-width: 768px) {
          .product-container {
            flex-direction: column;
            gap: 20px;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
