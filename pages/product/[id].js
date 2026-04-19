import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState("");

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

    // 🔥 CRITICAL EVENT
    window.dispatchEvent(new Event("cartUpdated"));

    // 🔥 FEEDBACK
    alert("Added to cart");
  };

  if (!product) return <div style={{ padding: 20 }}>Loading...</div>;

  const images = productImages[product.id] || [product.thumbnail_url];

  return (
    <div className="product-page">
      <Navbar />

      <div className="product-container">
        {/* IMAGE */}
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

        {/* DETAILS */}
        <div className="product-details">
          <h1>{product.name}</h1>
          <p className="price">${product.retail_price}</p>

          <div className="qty">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              −
            </button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>

          <button className="btn" onClick={addToCart}>
            ADD TO CART
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
          margin: 10px 0 20px;
        }

        .qty {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        /* MOBILE */
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
