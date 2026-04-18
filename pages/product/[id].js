import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/get-product?id=${id}`)
      .then(res => res.json())
      .then(data => setProduct(data));
  }, [id]);

  if (!product) {
    return <p style={{ padding: 20 }}>Loading jagoff product...</p>;
  }

  return (
    <div style={{ padding: 20, color: 'white', background: 'black', minHeight: '100vh' }}>
      
      {/* 🔥 PRODUCT NAME */}
      <h1>{product.name}</h1>

      {/* 🖼️ IMAGE */}
      {product.thumbnail_url && (
        <img
          src={product.thumbnail_url}
          alt={product.name}
          style={{ width: 300, marginBottom: 20 }}
        />
      )}

      {/* 💰 PRICE */}
      <h2>${product.retail_price}</h2>

      {/* 📏 SIZE */}
      <div style={{ marginTop: 10 }}>
        <label>Size: </label>
        <select>
          <option>M</option>
          <option>L</option>
          <option>XL</option>
        </select>
      </div>

      {/* 🟡 BUTTON */}
      <button
        style={{
          marginTop: 20,
          background: 'yellow',
          color: 'black',
          padding: '10px 20px',
          fontWeight: 'bold',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        BUY NOW
      </button>
    </div>
  );
}
