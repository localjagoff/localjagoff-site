import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import Head from "next/head";

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const found = data.find((p) => String(p.id) === String(id));
        setProduct(found);
      });
  }, [id]);

  const productImages = {
    428851907: ["/images/products/trucker.png"],
    428851698: ["/images/products/tee-keystone.png"],
    428851608: ["/images/products/tee-steel.png"],
    428851513: ["/images/products/tee-sideways.png"],
    428821578: ["/images/products/hoodie.png"],
    428550417: ["/images/products/tee-certified.png"],
  };

  const productDescriptions = {
    428851698: "Classic keystone design representing Pittsburgh pride. Premium feel, built for everyday wear.",
    428851608: "Steel City front and back print. Bold, clean, and made to stand out wherever you go.",
    428851513: "Sideways 412 design with a unique look. Simple, different, and unmistakably Pittsburgh.",
    428550417: "Certified Jagoff tee. Straight to the point, no explanation needed.",
    428821578: "Warm, comfortable hoodie with Pittsburgh roots. Perfect for cold days n’at.",
    428851907: "Trucker cap with a clean, bold logo. Lightweight and built for everyday wear.",
  };

  useEffect(() => {
    if (!product) return;
    const imgs = productImages[product.id] || [product.thumbnail_url];
    setSelectedImage(imgs[0]);
  }, [product]);

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.retail_price,
        quantity,
        image: selectedImage,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleShare = () => {
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

  if (!product) return <div style={{ padding: 20 }}>Loading...</div>;

  const images = productImages[product.id] || [product.thumbnail_url];
  const fullImageUrl = `https://www.localjagoff.com${selectedImage}`;

  return (
    <div className="product-page">
      <Head>
        <title>{product.name} | Local Jagoff</title>
        <meta property="og:title" content={product.name} />
        <meta
          property="og:description"
          content={productDescriptions[product.id]}
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
          <img src={selectedImage} className="main-image" />

          <div className="thumb-row">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                className={
                  selectedImage === img ? "thumb active" : "thumb"
                }
                onClick={() => setSelectedImage(img)}
              />
            ))}
          </div>
        </div>

        <div className="product-details">
          <h1>{product.name}</h1>
          <p className="price">${product.retail_price}</p>

          <p className="description">
            {productDescriptions[product.id]}
          </p>

          <div className="qty">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              −
            </button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>

          <button className="btn" onClick={addToCart}>
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
        }

        .thumb-row {
          display: flex;
          gap: 10px;
          margin-top: 10px;
          overflow-x: auto;
        }

        .thumb {
          width: 70px;
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
        }

        .description {
          margin-bottom: 20px;
          color: #ccc;
          line-height: 1.4;
        }

        .qty {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .share-btn {
          margin-top: 10px;
          background: #111;
          color: #fff;
          border: 1px solid #333;
          cursor: pointer;
          font-weight: bold;
          transition: transform 0.1s ease;
        }

        .share-btn:active {
          transform: scale(0.97);
        }

        .share-btn.copied {
          background: #1a1a1a;
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
