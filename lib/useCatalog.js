import { useEffect, useState } from 'react';
import { getProductImages, getProductThumbnail } from './getProductImages';

export default function useCatalog() {
  const [state, setState] = useState({ products: [], loading: true, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setState(previous => ({ ...previous, loading: true, error: false }));
    fetch('/api/get-products', { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => {
        if (!Array.isArray(data)) throw new Error('Catalog unavailable');
        if (active) setState({ products: data.map(product => ({ ...product, images: getProductImages(product), thumbnail_url: getProductThumbnail(product) })), loading: false, error: false });
      })
      .catch(() => { if (active) setState(previous => ({ ...previous, loading: false, error: true })); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);
  return { ...state, retry: () => setAttempt(value => value + 1) };
}
