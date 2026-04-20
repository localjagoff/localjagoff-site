import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Link from "next/link";

const productImages = {
  428983169: ["/images/products/local-jagoff-412-hoodie.jpg", "/images/products/hoodie2.jpg"],
  428982889: ["/images/products/localjagoffkeystonetee.jpg"],
  428980566: ["/images/products/localjagoffhatvr2.jpg"],
  428851907: ["/images/products/localjagoffhat.jpg"],
  428851698: ["/images/products/tee-keystone.jpg"],
  428851608: ["/images/products/tee-steel.jpg"],
  428851513: ["/images/products/local-jagoff-sideways-tee.png"],
  428821578: ["/images/products/local-jagoff-412-hoodie.jpg"],
  428550417: ["/images/products/tee-certified.jpg"],
};

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, []);

  const getImage = (product) => {
    return (
      productImages[product.id]?.[0] ||
      product.thumbnail_url ||
      "/images/placeholder.jpg"
    );
  };

  const tees = products.filter((p) => p.category === "tees");
  const hoodies = products.filter((p) => p.category === "hoodies");
  const hats = products.filter((p) => p.category === "hats");

  return (
    <div style={{ background: "#000", color: "#fff" }}>
      <Navbar />

      {/* ✅ FIXED BANNER */}
      <picture>
        <source media="(max-width: 768px)" srcSet="/images/banner-mobile.png" />
        <img src="/images/banner.png" style={{ width: "100%", objectFit: "contain" }} />
      </picture>

      <Section title="T-Shirts" products={tees} getImage={getImage} link="/tees" />
      <Section title="Hoodies" products={hoodies} getImage={getImage} link="/hoodies" />
      <Section title="Hats" products={hats} getImage={getImage} link="/hats" />
    </div>
  );
}

function Section({ title, products, getImage, link }) {
  return (
    <div style={{ padding: "30px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>{title}</h2>
        <Link href={link}>View All →</Link>
      </div>

      <div style={{ display: "flex", gap: "15px", overflowX: "auto" }}>
        {products.map((p) => (
          <Link key={p.id} href={`/product/${p.id}`}>
            <div style={{ minWidth: "160px" }}>
              <img
                src={getImage(p)}
                style={{ width: "100%", height: "160px", objectFit: "contain", background: "#000" }}
              />
              <p>{p.name}</p>
              <p style={{ color: "#ccc" }}>${p.retail_price}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
