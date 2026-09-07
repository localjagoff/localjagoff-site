import {useEffect,useState} from 'react';
import {Star} from 'lucide-react';
export default function ProductReviews({productId}){
  const [reviews,setReviews]=useState(null);
  useEffect(()=>{
    const controller=new AbortController();
    fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])})
      .then(r=>r.ok?r.json():Promise.reject()).then(d=>setReviews(d.reviews)).catch(()=>{if(!controller.signal.aborted)setReviews(null);});
    return()=>controller.abort();
  },[productId]);
  if(!reviews?.length)return null;
  return <section className="product-reviews" aria-label="Customer reviews"><h2>CUSTOMER REVIEWS</h2>{reviews.map((r,i)=><article key={i}><div className="rating-line" aria-label={`${r.rating} out of 5`}>{[1,2,3,4,5].map(n=><Star key={n} size={16} aria-hidden="true" color="#ffe600" fill={n<=r.rating?'#ffe600':'none'}/>)}</div><strong>{r.display_name}</strong>{r.body&&<p>{r.body}</p>}</article>)}
    <style jsx>{`.product-reviews{border-top:1px solid #333;margin-top:24px;padding-top:24px}.product-reviews h2{font-size:22px}.product-reviews article{padding:16px 0;border-bottom:1px solid #333;overflow-wrap:anywhere}.rating-line{display:flex;gap:4px;margin-bottom:8px}.product-reviews p{white-space:pre-wrap;line-height:1.6;color:#ddd}`}</style>
  </section>;
}
