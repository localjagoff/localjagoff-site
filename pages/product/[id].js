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

  // 🔥 MULTI IMAGE SUPPORT
  const productImages = {
    428851907: ["/images/products/trucker.png"],
    428851698: [
      "/images/products/tee-keystone.png",
      "/images/products/tee-keystone.png"
    ],
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
    window.dispatchEvent(new Event("cartUpdated"));
  };

  if (!product) return <div style={{ padding: 40 }}>Loading...</div>;

  const images = productImages[product.id] || [product.thumbnail_url];

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.container}>
        {/* 🔥 LEFT SIDE (THUMBNAILS + IMAGE) */}
        <div style={styles.gallery}>
          <div style={styles.thumbs}>
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                style={{
                  ...styles.thumb,
                  border:
                    selectedImage === img
                      ? "2px solid yellow"
                      : "1px solid #333",
                }}
                onClick={() => setSelectedImage(img)}
              />
            ))}
          </div>

          <div style={styles.mainImageWrap}>
            <img src={selectedImage} style={styles.mainImage} />
          </div>
        </div>

        {/* 🔥 RIGHT SIDE (DETAILS) */}
        <div style={styles.details}>
          <h1>{product.name}</h1>
          <h2>${product.retail_price}</h2>

          <div style={styles.qty}>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              −
            </button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>

          <button style={styles.cartBtn} onClick={addToCart}>
            ADD TO CART
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "#000",
    color: "#fff",
    minHeight: "100vh",
  },

  container: {
    display: "flex",
    gap: "40px",
    padding: "40px",
    maxWidth: "1200px",
    margin: "0 auto",
  },

  gallery: {
    display: "flex",
    gap: "15px",
  },

  thumbs: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  thumb: {
    width: "60px",
    cursor: "pointer",
  },

  mainImageWrap: {
    width: "400px",
  },

  mainImage: {
    width: "100%",
  },

  details: {
    flex: 1,
  },

  qty: {
    display: "flex",
    gap: "10px",
    margin: "20px 0",
  },

  cartBtn: {
    padding: "12px",
    background: "yellow",
    color: "#000",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
  },
};
