import Head from 'next/head';
import {useEffect,useRef,useState} from 'react';
import {Star,ArrowRight} from 'lucide-react';
import Navbar from '../components/Navbar';
import styles from '../styles/Contact.module.css';
export default function Review(){
  const token=useRef('');const [products,setProducts]=useState([]);const [product,setProduct]=useState('');
  const [rating,setRating]=useState(0);const [status,setStatus]=useState('loading');const [error,setError]=useState('');
  useEffect(()=>{
    if(!token.current)token.current=window.location.hash.slice(1);
    const controller=new AbortController();
    history.replaceState(null,'','/review');
    fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'open',token:token.current}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])})
      .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setProducts(d.products);setProduct(String(d.products.find(p=>!p.submitted)?.id||''));setStatus('ready');})
      .catch(()=>{if(!controller.signal.aborted){setError('This review link is unavailable or expired. Email hello@localjagoff.com for help.');setStatus('error');}});
    return ()=>controller.abort();
  },[]);
  async function submit(event){
    event.preventDefault();if(!rating)return;setStatus('sending');setError('');
    const data=Object.fromEntries(new FormData(event.currentTarget));
    try{const r=await fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({...data,action:'submit',token:token.current,productId:Number(product),rating})});const d=await r.json();if(!r.ok)throw new Error(d.error);setProducts(current=>current.map(p=>p.id===Number(product)?{...p,submitted:true}:p));setStatus('sent');}
    catch{setError('We could not confirm your review. Please try again.');setStatus('ready');}
  }
  return <div className={styles.page}><Head><title>Review Your Gear | Local Jagoff</title><meta name="robots" content="noindex,nofollow"/><meta name="referrer" content="no-referrer"/></Head><Navbar/><main className={styles.main}>
    <header className={styles.heading}><img src="/images/icon.png" width="80" height="80" alt=""/><div><p className={styles.eyebrow}>LOCAL JAGOFF / YOUR GEAR</p><h1>GIVE US THE REAL REVIEW.</h1></div></header>
    <div className={styles.reviewBody}>
      {status==='loading'?<p role="status">Opening your review...</p>:status==='sent'?<div className={styles.success} role="status"><h2>APPRECIATE THE HONESTY.</h2><p>Your review is awaiting moderation. We check for personal details and abuse, not whether you liked the product.</p>{products.some(p=>!p.submitted)&&<p><button className={styles.send} onClick={()=>{setProduct(String(products.find(p=>!p.submitted).id));setRating(0);setStatus('ready');}}>REVIEW ANOTHER ITEM</button></p>}<a href="/">Back to the shop</a></div>:<>
        <p className={styles.note}>Your public name, rating, and review may appear on the product page. Leave out contact details and order numbers. For an order issue, <a href="mailto:hello@localjagoff.com">email us</a>.</p>
        {products.length>0&&products.every(p=>p.submitted)&&<p role="status">Your reviews have already been received. Thanks for sharing your experience.</p>}
        {products.some(p=>!p.submitted)&&<form onSubmit={submit} className={styles.formArea}>
          <label>Your gear<select value={product} onChange={e=>{setProduct(e.target.value);setRating(0);}} required><option value="">Choose a product</option>{products.map(p=><option key={p.id} value={p.id} disabled={p.submitted}>{p.name}{p.submitted?' (review received)':''}</option>)}</select></label>
          <fieldset className={styles.rating}><legend>Your rating</legend>{[1,2,3,4,5].map(n=><label key={n} title={`${n} out of 5`}><input type="radio" name="rating" value={n} checked={rating===n} onChange={()=>setRating(n)} required/><Star aria-hidden="true" size={30} fill={n<=rating?'#ffe600':'none'} color={n<=rating?'#ffe600':'#aaa'}/><span className={styles.srOnly}>{n} out of 5</span></label>)}</fieldset>
          <label>Public name<input name="displayName" maxLength={40} required placeholder="First name or nickname" autoComplete="off"/></label>
          <label>Your review <span>(optional)</span><textarea name="text" maxLength={2000} rows={5}/></label>
          <button className={styles.send} disabled={!product||!rating||status==='sending'}>{status==='sending'?'SENDING...':<>SEND REVIEW <ArrowRight size={18} aria-hidden="true"/></>}</button>
        </form>}
        {error&&<p className={styles.error} role="alert">{error}</p>}
      </>}
    </div>
  </main></div>;
}
