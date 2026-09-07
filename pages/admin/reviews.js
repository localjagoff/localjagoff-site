import Head from 'next/head';
import {useEffect,useState} from 'react';
import {Check,X,RefreshCw} from 'lucide-react';
import styles from '../../styles/Contact.module.css';
export default function Moderate(){
  const [reviews,setReviews]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function load(){setBusy(true);try{const r=await fetch('/api/reviews/moderation',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error();setReviews((await r.json()).reviews);setError('');}catch{setError('Review queue unavailable.');}finally{setBusy(false);}}
  useEffect(()=>{load();},[]);
  async function decide(id,status){setBusy(true);try{const r=await fetch('/api/reviews/moderation',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),body:JSON.stringify({id,status})});if(!r.ok)throw new Error();await load();}catch{setError('Decision was not saved.');setBusy(false);}}
  return <div className={styles.page}><Head><title>Review Moderation | Local Jagoff</title><meta name="robots" content="noindex,nofollow"/></Head><main className={styles.main}><header className={styles.heading}><h1>REVIEW QUEUE</h1><button onClick={load} disabled={busy} title="Refresh queue"><RefreshCw size={20}/></button></header>
    <p>Approve honest reviews of any rating. Reject spam, abuse, exposed personal information, or unrelated content. Do not edit a customer's words.</p>
    {error&&<p role="alert" className={styles.error}>{error}</p>}{reviews.length===0&&!busy&&<p>No reviews awaiting moderation.</p>}
    {reviews.map(r=><article className={styles.reviewItem} key={r.id}><h2>{r.display_name} / {r.rating} out of 5</h2><p>Product {r.product_id}</p><p style={{whiteSpace:'pre-wrap'}}>{r.body||'Rating only'}</p><div className={styles.actions}><button title="Approve review" disabled={busy} onClick={()=>decide(r.id,'approved')}><Check size={18}/> Approve</button><button title="Reject review" disabled={busy} onClick={()=>decide(r.id,'rejected')}><X size={18}/> Reject</button></div></article>)}
  </main></div>;
}
