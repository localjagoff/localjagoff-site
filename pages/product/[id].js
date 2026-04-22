import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";

// ✅ NEW IMPORT (centralized images)
import productImages from "../../lib/productImages";

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");

  useEffect(() => {
    if (!id) return;

    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        const found = data.find(
          (p) => String(p.id) === String(id)
        );

        if (!found) return;

        setProduct(found);

        const imgs =
          productImages[found.id] || [found.thumbnail_url];

        setSelectedImage(imgs[0]);

        if (found.variants?.length) {
          setSelectedVariantId(found.variants[0].id);
        }
      });
  }, [id]);

  const images = useMemo(() => {
    if (!product) return ["/images/placeholder.jpg"];

    return (
      productImages[product.id] || [
        product.thumbnail_url || "/images/placeholder.jpg",
      ]
    );
  }, [product]);

  const selectedVariant = useMemo(() => {
    if (!product?.variants) return null;

    return (
      product.variants.find(
        (v) => String(v.id) === String(selectedVariantId)
      ) || product.variants[0]
    );
  }, [product, selectedVariantId]);

  if (!product) {
    return (
      <div style={{ background: "#000", color: "#fff", minHeight: "100vh" }}>
        <Navbar />
        <div style={{ padding: 20 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh" }}>
      <Navbar />

      <div style={{ display: "flex", padding: 40, gap: 40 }}>
        {/* IMAGE */}
        <div>
          <img
            src={selectedImage}
            style={{ width: 400, background: "#111" }}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                onClick={() => setSelectedImage(img)}
                style={{
                  width: 60,
                  border:
                    selectedImage === img
                      ? "2px solid yellow"
                      : "1px solid #333",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>

        {/* DETAILS */}
        <div>
          <h1>{product.name}</h1>

          <h2>${product.retail_price}</h2>

          <select
            value={selectedVariantId}
            onChange={(e) => setSelectedVariantId(e.target.value)}
          >
            {product.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} - ${v.retail_price}
              </option>
            ))}
          </select>

          <br />
          <br />

          <button>Add to Cart</button>
        </div>
      </div>
    </div>
  );
}
