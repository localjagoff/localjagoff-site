import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";

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

    const existing = cart.find(
      (item) => item.variantId === selectedVariant.variant_id
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: selectedVariant.retail_price,
        variantId: selectedVariant.variant_id,
        size: selectedVariant.name,
        quantity: 1,
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
            quantity: 1,
          },
        ],
      }),
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  if (!product || !selectedVariant)
    return (
      <div style={styles.loading}>
        <Navbar />
        Loading...
      </div>
    );

  return (
    <div style={styles.container}>
      <Navbar />

      <button style={styles.back} onClick={() => router.push("/")}>
        ← Back to Shop
      </button>

      <div style={styles.wrapper}>
        <div style={styles.imageContainer}>
          <img
            src={product.thumbnail_url}
            alt={product.name}
            style={styles.image}
          />
        </div>

        <div style={styles.details}>
          <h1 style={styles.title}>{product.name}</h1>

          <p style={styles.price}>${selectedVariant.retail_price}</p>

          <select
            style={styles.select}
            onChange={(e) =>
              setSelectedVariant(product.variants[e.target.value])
            }
          >
            {product.variants.map((variant, index) => (
              <option key={index} value={index}>
                {variant.name} - ${variant.retail_price}
              </option>
            ))}
          </select>

          <p style={styles.description}>
            Premium quality gear built for jagoffs everywhere.
          </p>

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
    flex: 1,
    minWidth: "300px",
  },
  image: {
    width: "100%",
  },
  details: {
    flex: 1,
    minWidth: "300px",
  },
  title: {
    fontSize: "32px",
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
  },
  buy: {
    flex: 1,
    padding: "12px",
    backgroundColor: "yellow",
    color: "#000",
    fontWeight: "bold",
    border: "none",
  },
  loading: {
    backgroundColor: "#000",
    color: "#fff",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
  },
};
