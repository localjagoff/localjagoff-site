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
        if (data.variants && data.variants.length > 0) {
          setSelectedVariant(data.variants[0]);
        }
      })
      .catch(err => console.error('Error loading product:', err));
  }, [id]);

  const handleBuy = async () => {
    if (!selectedVariant) return;

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId: selectedVariant.id })
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    }
  };

  if (!product) {
    return (
      <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '40px' }}>
        Loading product...
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '40px' }}>
      <h1>{product.name}</h1>

      {product.thumbnail_url && (
        <img
          src={product.thumbnail_url}
          alt={product.name}
          style={{ maxWidth: '400px', marginBottom: '20px' }}
        />
      )}

      <h2>${selectedVariant?.price || product.retail_price}</h2>

      {product.variants && (
        <select
          value={selectedVariant?.id}
          onChange={(e) => {
            const variant = product.variants.find(v => v.id == e.target.value);
            setSelectedVariant(variant);
          }}
          style={{ marginBottom: '20px' }}
        >
          {product.variants.map(variant => (
            <option key={variant.id} value={variant.id}>
              {variant.name} - ${variant.price}
            </option>
          ))}
        </select>
      )}

      <br />

      <button
        onClick={handleBuy}
        style={{
          backgroundColor: 'yellow',
          color: '#000',
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
