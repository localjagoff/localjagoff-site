import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";

const customImages = {
  428983169: "/images/products/local-jagoff-412-hoodie.jpg",
  428821578: "/images/products/hoodie2.jpg",
  428982889: "/images/products/localjagoffkeystonetee.jpg",
  428980566: "/images/products/localjagoffhatvr2.jpg",
  428851907: "/images/products/localjagoffhat.jpg",
  428851698: "/images/products/tee-keystone.jpg",
  428851608: "/images/products/tee-steel.jpg",
  428851513: "/images/products/local-jagoff-sideways-tee.png",
  428550417: "/images/products/tee-certified.jpg",
};

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/api/get-products")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setProducts([]);
          return;
        }

        const mapped = data.map((product) => ({
          ...product,
          thumbnail_url:
            customImages[product.id] || product.thumbnail_url || "",
        }));

        setProducts(mapped);
      })
      .catch(() => setProducts([]));
  }, []);

  const tees = products.filter((p) => p.category === "tees");
  const hoodies = products.filter((p) => p.category === "hoodies");
  const hats = products.filter((p) => p.category === "hats");

  return (
    <div className="container">
      <Navbar />

      {/* ✅ BANNER FIXED (ONLY ONE RENDERS) */}
      <div className="banner">
        <picture>
          <source
            media="(max-width: 768px)"
            srcSet="/images/banner-mobile.png"
          />
          <img src="/images/banner.png" alt="Local Jagoff Banner" />
        </picture>
      </div>

      <section>
        <h2>T-Shirts</h2>
        <div className="grid">
          {tees.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section>
        <h2>Hoodies</h2>
        <div className="grid">
          {hoodies.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section>
        <h2>Hats</h2>
        <div className="grid">
          {hats.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <style jsx>{`
        .container {
          background: #000;
          color: #fff;
          min-height: 100vh;
        }

        .banner {
          width: 100%;
        }

        .banner img {
          width: 100%;
          max-height: 500px; /* 🔥 adjust this number */
          object-fit: contain; /* shows full image */
          display: block;
          margin: 0 auto;
        }

        section {
          padding: 40px 20px;
        }

        h2 {
          margin-bottom: 20px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
        }
      `}</style>
    </div>
  );
}
