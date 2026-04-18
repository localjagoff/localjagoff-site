import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [size, setSize] = useState('M');

  useEffect(() => {
    if (!id) return;

    fetch(`/api/get-product?id=${id}`)
      .then(res => res.json())
      .then(data => setProduct(data));
  }, [id]);

  if (!product) return <p style={{ padding: 20 }}>Loading...</p>;

  return (
    <div style={{ padding: 40, color: 'white', background: '#000', minHeight: '100vh' }}>
      
      <h1>{product.name}</h1>

      <img
        src={product.thumbnail_url}
        style={{ width: 300, marginBottom: 20 }}
      />

      <h2>${product.retail_price}</h2>

      {/* SIZE SELECTOR */}
      <div style={{ margin: '20px 0' }}>
        <label>Size:</label>
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          style={{ marginLeft: 10 }}
        >
          <option>S</option>
          <option>M</option>
          <option>L</option>
          <option>XL</option>
          <option>XXL</option>
        </select>
      </div>

      {/* BUY BUTTON */}
      <button
        onClick={async () => {
          const res = await fetch('/api/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: product.id,
              size,
              price: product.retail_price
            })
          });

          const data = await res.json();
          window.location.href = data.url;
        }}
        style={{
          padding: '12px 24px',
          background: 'yellow',
          color: 'black',
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
