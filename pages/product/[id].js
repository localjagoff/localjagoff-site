import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState("");
  const [zoom, setZoom] = useState(false);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const found = data.find((p) => String(p.id) === String(id));
        setProduct(found);
      });
  }, [id]);

  // 🔥 MULTI IMAGE SETUP
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
        {/* 🔥 GALLERY */}
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

          <div
            style={styles.mainWrap}
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
            onClick={() => setModal(true)}
          >
            <img
              src={selectedImage}
              style={{
                ...styles.mainImage,
                transform: zoom ? "scale(1.2)" : "scale(1)",
              }}
            />
          </div>
        </div>

        {/* 🔥 DETAILS */}
        <div style={styles.details}>
          <h1 style={styles.title}>{product.name}</h1>
          <h2 style={styles.price}>${product.retail_price}</h2>

          {/* QTY */}
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

      {/* 🔥 MODAL */}
      {modal && (
        <div style={styles.modal} onClick={() => setModal(false)}>
          <img src={selectedImage} style={styles.modalImg} />
        </div>
      )}
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
  flexDirection: "column", // 🔥 STACK ON MOBILE
  gap: "30px",
  padding: "20px",
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
    width: "70px",
    cursor: "pointer",
  },

  mainWrap: {
    width: "450px",
    overflow: "hidden",
    cursor: "zoom-in",
  },

  mainImage: {
    width: "100%",
    transition: "transform 0.3s ease",
  },

  details: {
    flex: 1,
  },

  title: {
    fontSize: "32px",
    marginBottom: "10px",
  },

  price: {
    fontSize: "22px",
    marginBottom: "20px",
  },

  qty: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },

  cartBtn: {
    padding: "14px",
    background: "yellow",
    color: "#000",
    fontWeight: "bold",
    border: "none",
    cursor: "pointer",
  },

  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.9)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },

  modalImg: {
    maxWidth: "90%",
    maxHeight: "90%",
  },
};
