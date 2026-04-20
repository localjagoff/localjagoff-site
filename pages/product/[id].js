import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

const productImages = {
  428983169: ["/images/products/local-jagoff-412-hoodie.jpg", "/images/products/hoodie2.jpg"],
  428982889: ["/images/products/localjagoffkeystonetee.jpg"],
  428980566: ["/images/products/localjagoffhatvr2.jpg"],
  428851907: ["/images/products/localjagoffhat.jpg"],
  428851698: ["/images/products/tee-keystone.jpg"],
  428851608: ["/images/products/tee-steel.jpg"],
  428851513: ["/images/products/local-jagoff-sideways-tee.png"],
  428821578: ["/images/products/local-jagoff-412-hoodie.jpg"],
  428550417: ["/images/products/tee-certified.jpg"],
};

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!id) return;

    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const found = data.find((p) => String(p.id) === String(id));
        setProduct(found);
      });
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const imgs = productImages[product.id] || [product.thumbnail_url];
    setSelectedImage(imgs[0]);
  }, [product]);

  if (!product) return <div style={{ padding: 20 }}>Loading...</div>;

  const images = productImages[product.id] || [product.thumbnail_url];

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

  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh" }}>
      <Navbar />

      <div style={{ display: "flex", gap: "40px", padding: "40px", flexWrap: "wrap" }}>
        {/* IMAGE */}
        <div style={{ flex: 1 }}>
          <img src={selectedImage} style={{ width: "100%", objectFit: "contain" }} />

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                onClick={() => setSelectedImage(img)}
                style={{
                  width: "70px",
                  cursor: "pointer",
                  border: selectedImage === img ? "2px solid yellow" : "1px solid #333",
                }}
              />
            ))}
          </div>
        </div>

        {/* DETAILS */}
        <div style={{ flex: 1 }}>
          <h1>{product.name}</h1>
          <p>${product.retail_price}</p>

          <div style={{ display: "flex", gap: "10px", margin: "20px 0" }}>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>

          <button onClick={addToCart} style={{ padding: "15px", background: "yellow", border: "none" }}>
            ADD TO CART
          </button>
        </div>
      </div>
    </div>
  );
}
