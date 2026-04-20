import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Link from "next/link";

const productImages = {
  428980566: ["/images/products/localjagoffhatvr2.jpg"],
  428851907: ["/images/products/localjagoffhat.jpg"],
};

export default function HatsPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []));
  }, []);

  const hats = products.filter((p) => p.category === "hats");

  return (
    <div style={{ background: "#000", minHeight: "100vh" }}>
      <Navbar />

      <div style={{ padding: "20px" }}>
        <Link href="/">← Back</Link>
        <h1>Hats</h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px" }}>
          {hats.map((p) => (
            <Link key={p.id} href={`/product/${p.id}`}>
              <div>
                <img src={productImages[p.id]?.[0] || "/images/placeholder.jpg"} style={{ width: "100%" }} />
                <p>{p.name}</p>
                <p>${p.retail_price}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
