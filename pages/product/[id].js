import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";

const productImages = {
  428982889: ["/images/products/localjagoffkeystonetee.jpg"],
  428980566: ["/images/products/localjagoffhatvr2.jpg"],
  428851907: ["/images/products/localjagoffhat.jpg"],
  428851698: ["/images/products/tee-keystone.jpg"],
  428851608: ["/images/products/tee-steel.jpg"],
  428851513: ["/images/products/local-jagoff-sideways-tee.png"],
  428821578: ["/images/products/hoodie2.jpg"],
  428550417: ["/images/products/tee-certified.jpg"],
  428983169: ["/images/products/local-jagoff-412-hoodie.jpg"],
  429208592: ["/images/products/localjagoff-keystone-hoodie01.jpg"],
};

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");

  useEffect(() => {
    if (!id) return;

    fetch(`/api/get-product?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);

        const imgs =
          productImages[data.id] || [data.thumbnail_url];

        setSelectedImage(imgs[0]);

        if (data.variants?.length) {
          setSelectedVariantId(data.variants[0].variant_id);
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
        (v) => String(v.variant_id) === String(selectedVariantId)
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

          <h2>
            $
            {selectedVariant?.retail_price ||
              product?.retail_price ||
              "0.00"}
          </h2>

          <select
            value={selectedVariantId}
            onChange={(e) => setSelectedVariantId(e.target.value)}
          >
            {product.variants.map((v) => (
              <option key={v.variant_id} value={v.variant_id}>
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
