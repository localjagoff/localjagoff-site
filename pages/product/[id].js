import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [related, setRelated] = useState([]);

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

    // 🔥 fetch other products for "related"
    fetch("/api/get-products")
      .then(res => res.json())
      .then(data => setRelated(data));
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
        image: product.thumbnail_url, // ✅ FIXED
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    alert("Added to cart");
  };

  if (!product || !selectedVariant) return <div>Loading...</div>;

  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh" }}>
      <Navbar />

      <div style={styles.container}>
        {/* PRODUCT */}
        <div style={styles.top}>
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

            {/* QTY */}
            <div style={styles.qty}>
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>

            <div style={styles.buttons}>
              <button style={styles.cart} onClick={addToCart}>
                ADD TO CART
              </button>
            </div>
          </div>
        </div>

        {/* 🔥 RELATED PRODUCTS */}
        <div style={styles.relatedSection}>
          <h2>You May Also Like</h2>

          <div style={styles.grid}>
            {related
              .filter((p) => p.id !== product.id)
              .slice(0, 4)
              .map((item) => (
                <div
                  key={item.id}
                  style={styles.card}
                  onClick={() => router.push(`/product/${item.id}`)}
                >
                  <img src={item.thumbnail_url} style={styles.cardImg} />
                  <p>{item.name}</p>
                  <p>${item.retail_price}</p>
                </div>
              ))}
          </div>
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
  },
  top: {
    display: "flex",
    gap: "40px",
    flexWrap: "wrap",
  },
  image: {
    width: "400px",
    maxWidth: "100%",
  },
  details: {
    flex: 1,
  },
  select: {
    margin: "20px 0",
    padding: "10px",
    width: "100%",
  },
  qty: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  buttons: {
    display: "flex",
    gap: "10px",
  },
  cart: {
    padding: "12px",
    background: "#333",
    color: "#fff",
    border: "none",
  },

  // RELATED
  relatedSection: {
    marginTop: "60px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
    gap: "20px",
    marginTop: "20px",
  },
  card: {
    background: "#111",
    padding: "10px",
    cursor: "pointer",
  },
  cardImg: {
    width: "100%",
  },
};
