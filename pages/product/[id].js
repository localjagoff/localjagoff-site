import { useState } from "react";

export default function ProductPage({ product }) {
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants[0]
  );

  const handleBuy = async () => {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: product.name,
        price: selectedVariant.retail_price,
        variantId: selectedVariant.id,
      }),
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Checkout failed");
    }
  };

  return (
    <div style={{ background: "black", color: "white", padding: "40px" }}>
      <h1>{product.name}</h1>

      <img src={product.thumbnail_url} width="400" />

      <h2>${selectedVariant.retail_price}</h2>

      <select
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

      <br /><br />

      <button
        onClick={handleBuy}
        style={{ background: "yellow", padding: "10px" }}
      >
        BUY NOW
      </button>
    </div>
  );
}
