export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      const res = await fetch(`/api/get-product?id=${id}`);
      const data = await res.json();

      if (data && data.variants) {
        setProduct(data);
        setSelectedVariant(data.variants[0]);
      }
    };

    fetchProduct();
  }, [id]);

  if (!product || !selectedVariant) {
    return (
      <div style={{ background: "black", color: "white", padding: "40px" }}>
        Loading jagoff product...
      </div>
    );
  }

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
        onClick={async () => {
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
          }
        }}
        style={{ background: "yellow", padding: "10px" }}
      >
        BUY NOW
      </button>
    </div>
  );
}
