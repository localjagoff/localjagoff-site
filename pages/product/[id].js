import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/get-product?id=${id}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        if (data.variants?.length > 0) {
          setSelectedVariant(data.variants[0].id);
        }
      });
  }, [id]);

  if (!product) return <p>Loading jagoff merch...</p>;

  return (
    <div style={{ padding: 40, color: 'white' }}>
      <h1>{product.name}</h1>

      <img
        src={product.thumbnail_url}
        style={{ width: 300 }}
      />

      <br /><br />

      <select
        onChange={(e) => setSelectedVariant(e.target.value)}
        value={selectedVariant || ''}
      >
        {product.variants.map(v => (
          <option key={v.id} value={v.id}>
            {v.size} - ${v.price}
          </option>
        ))}
      </select>

      <br /><br />

      <button
        onClick={async () => {
          const res = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variantId: selectedVariant }),
          });

          const data = await res.json();
          window.location.href = data.url;
        }}
        style={{
          background: 'yellow',
          padding: '12px 24px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        BUY NOW
      </button>
    </div>
  );
}
