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

  if (!product) return <div>Loading...</div>;

  const handleBuy = async () => {
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ size, qty: 1 })
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>{product.sync_product.name}</h1>

      <img src={product.sync_product.thumbnail_url} width="300" />

      <div>
        <select onChange={(e) => setSize(e.target.value)}>
          {product.sync_variants.map(v => (
            <option key={v.id} value={v.name.split('/').pop().trim()}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      <button onClick={handleBuy}>Buy Now</button>
    </div>
  );
}
