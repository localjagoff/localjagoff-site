import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!id) return;

    fetch("/api/get-products")
      .then(res => res.json())
      .then(data => {
        const found = data.find(p => String(p.id) === String(id));
        setProduct(found);
      });
  }, [id]);

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existing = cart.find(item => item.id === product.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.retail_price,
        quantity,
        image: product.thumbnail_url,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));

    alert("Added to cart");
  };

  if (!product) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh" }}>
      <Navbar />

      <div style={styles.container}>
        <img src={product.thumbnail_url} style={styles.image} />

        <div style={styles.details}>
          <h1>{product.name}</h1>
          <h2>${product.retail_price}</h2>

          <div style={styles.qty}>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>

          <button style={styles.cart} onClick={addToCart}>
            ADD TO CART
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "40px 20px",
    display: "flex",
    gap: "40px",
    flexWrap: "wrap",
  },
  image: { width: "400px", maxWidth: "100%" },
  details: { flex: 1 },
  qty: { display: "flex", gap: "10px", marginBottom: "20px" },
  cart: {
    padding: "12px",
    background: "yellow",
    color: "#000",
    border: "none",
    fontWeight: "bold",
  },
};
