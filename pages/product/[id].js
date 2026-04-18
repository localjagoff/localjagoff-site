import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/get-product?id=${id}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        if (data.variants?.length) {
          setSelectedVariant(data.variants[0]);
        }
      });
  }, [id]);

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    // 🔥 UNIQUE KEY
    const key = `${product.id}-${selectedVariant.variant_id}`;

    const existing = cart.find(item => item.key === key);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        key, // 🔥 guarantees uniqueness
        productId: product.id,
        variantId: selectedVariant.variant_id,
        name: product.name,
        size: selectedVariant.name,
        price: selectedVariant.retail_price,
        quantity,
        image: product.thumbnail_url,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    // 🔥 trigger navbar update
    window.dispatchEvent(new Event("cartUpdated"));

    alert("Added to cart");
  };

  if (!product || !selectedVariant) return <div>Loading...</div>;

  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh" }}>
      <Navbar />

      <div style={styles.container}>
        <img src={product.thumbnail_url} style={styles.image} />

        <div style={styles.details}>
          <h1>{product.name}</h1>
          <h2>${selectedVariant.retail_price}</h2>

          <select
            style={styles.select}
            onChange={(e) =>
              setSelectedVariant(product.variants[e.target.value])
            }
          >
            {product.variants.map((v, i) => (
              <option key={i} value={i}>
                {v.name} - ${v.retail_price}
              </option>
            ))}
          </select>

          {/* 🔥 FIXED QTY UI */}
          <div style={styles.qty}>
            <button style={styles.qtyBtn} onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
            <span style={styles.qtyNum}>{quantity}</span>
            <button style={styles.qtyBtn} onClick={() => setQuantity(quantity + 1)}>+</button>
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
  select: { margin: "20px 0", padding: "10px", width: "100%" },

  qty: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
  },
  qtyBtn: {
    width: "40px",
    height: "40px",
    background: "#222",
    color: "#fff",
    border: "1px solid #333",
    cursor: "pointer",
  },
  qtyNum: {
    minWidth: "30px",
    textAlign: "center",
  },

  cart: {
    padding: "12px",
    background: "yellow",
    color: "#000",
    border: "none",
    fontWeight: "bold",
  },
};
