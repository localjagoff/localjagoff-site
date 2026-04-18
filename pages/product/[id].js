import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/get-product?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        if (data.variants && data.variants.length > 0) {
          setSelectedVariant(data.variants[0]);
        }
      });
  }, [id]);

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    cart.push({
      id: product.id,
      name: product.name,
      price: selectedVariant.retail_price,
      variantId: selectedVariant.variant_id,
      size: selectedVariant.name,
    });

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
        name: `${product.name} (${selectedVariant.name})`,
        price: selectedVariant.retail_price,
        variantId: selectedVariant.variant_id,
      }),
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  if (!product) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.container}>
      {/* BACK BUTTON */}
      <button style={styles.back} onClick={() => router.push("/")}>
        ← Back to Shop
      </button>

      <div style={styles.wrapper}>
        {/* IMAGE */}
        <div style={styles.imageContainer}>
          <img
            src={product.thumbnail_url}
            alt={product.name}
            style={styles.image}
          />
        </div>

        {/* DETAILS */}
        <div style={styles.details}>
          <h1 style={styles.title}>{product.name}</h1>

          <p style={styles.price}>
            ${selectedVariant?.retail_price || "0.00"}
          </p>

          {/* SIZE SELECT */}
          <select
            style={styles.select}
            onChange={(e) =>
              setSelectedVariant(product.variants[e.target.value])
            }
          >
            {product.variants?.map((variant, index) => (
              <option key={index} value={index}>
                {variant.name} - ${variant.retail_price}
              </option>
            ))}
          </select>

          {/* DESCRIPTION (CUSTOMIZE THESE) */}
          <p style={styles.description}>
            {getDescription(product.name)}
          </p>

          {/* BUTTONS */}
          <div style={styles.buttonGroup}>
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

/* 🔥 CUSTOM DESCRIPTIONS */
function getDescription(name) {
  if (name.includes("Hoodie")) {
    return "Heavyweight comfort. Built for cold Pittsburgh nights. Clean look, jagoff attitude.";
  }

  if (name.includes("T-Shirt")) {
    return "Soft, breathable, and ready for everyday nonsense. Wear it proud.";
  }

  return "Premium quality gear built for jagoffs everywhere.";
}

const styles = {
  container: {
    backgroundColor: "#000",
    color: "#fff",
    minHeight: "100vh",
    padding: "20px",
  },

  back: {
    marginBottom: "20px",
    background: "none",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },

  wrapper: {
    display: "flex",
    flexWrap: "wrap",
    gap: "40px",
  },

  imageContainer: {
    flex: "1",
    minWidth: "300px",
  },

  image: {
    width: "100%",
  },

  details: {
    flex: "1",
    minWidth: "300px",
  },

  title: {
    fontSize: "32px",
    marginBottom: "10px",
  },

  price: {
    fontSize: "24px",
    marginBottom: "15px",
  },

  select: {
    padding: "10px",
    marginBottom: "20px",
    width: "100%",
  },

  description: {
    color: "#aaa",
    marginBottom: "20px",
  },

  buttonGroup: {
    display: "flex",
    gap: "10px",
  },

  cart: {
    flex: 1,
    padding: "12px",
    backgroundColor: "#333",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },

  buy: {
    flex: 1,
    padding: "12px",
    backgroundColor: "yellow",
    color: "#000",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
  },

  loading: {
    backgroundColor: "#000",
    color: "#fff",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
