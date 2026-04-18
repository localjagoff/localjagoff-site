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
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        if (data.variants?.length > 0) {
          setSelectedVariant(data.variants[0]);
        }
      });
  }, [id]);

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    const existing = cart.find(
      (item) => item.variantId === selectedVariant.variant_id
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: selectedVariant.retail_price,
        variantId: selectedVariant.variant_id,
        size: selectedVariant.name,
        quantity,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    alert("Added to cart");
  };

  const buyNow = async () => {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            name: product.name,
            price: selectedVariant.retail_price,
            variantId: selectedVariant.variant_id,
            size: selectedVariant.name,
            quantity,
          },
        ],
      }),
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  if (!product || !selectedVariant) {
    return (
      <div style={styles.loading}>
        <Navbar />
        Loading...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Navbar />

      <button style={styles.back} onClick={() => router.push("/")}>
        ← Back to Shop
      </button>

      <div style={styles.wrapper}>
        <img
          src={product.thumbnail_url}
          style={styles.image}
        />

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

          {/* 🔥 QUANTITY */}
          <div style={styles.qty}>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>

          <p style={{ color: "#aaa" }}>
            Premium quality gear built for jagoffs everywhere.
          </p>

          <div style={styles.buttons}>
            <button style={styles.cart} onClick={addToCart}>
              ADD TO CART
            </button>

            <button style={styles.buy} onClick={buyNow}>
              BUY NOW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { background: "#000", color: "#fff", minHeight: "100vh", padding: "20px" },
  wrapper: { display: "flex", gap: "40px", flexWrap: "wrap" },
  image: { width: "500px", maxWidth: "100%" },
  details: { flex: 1, minWidth: "300px" },
  select: { padding: "10px", margin: "20px 0", width: "100%" },
  qty: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
  },
  buttons: { display: "flex", gap: "10px" },
  cart: { flex: 1, padding: "12px", background: "#333", color: "#fff", border: "none" },
  buy: { flex: 1, padding: "12px", background: "yellow", color: "#000", border: "none", fontWeight: "bold" },
  back: { marginBottom: "20px", background: "none", color: "#fff", border: "none" },
  loading: { background: "#000", color: "#fff", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" },
};
