import Head from 'next/head';
import {useEffect,useRef,useState} from 'react';
import {Star,ArrowRight,Plus,Minus,Check} from 'lucide-react';
import Navbar from '../components/Navbar';
import styles from '../styles/Contact.module.css';

const emptyDraft=()=>({rating:0,comment:'',expanded:false,consent:false});

export default function Review(){
  const token=useRef(''),nameInput=useRef(null);
  const [products,setProducts]=useState([]),[drafts,setDrafts]=useState({});
  const [publicName,setPublicName]=useState(''),[nameError,setNameError]=useState('');
  const [status,setStatus]=useState('loading'),[sendingProduct,setSendingProduct]=useState(null);
  const [error,setError]=useState(''),[productErrors,setProductErrors]=useState({}),[lastSubmitted,setLastSubmitted]=useState(null);

  useEffect(()=>{
    if(!token.current)token.current=window.location.hash.slice(1);
    const controller=new AbortController();
    history.replaceState(null,'','/review');
    fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'open',token:token.current}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])})
      .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setProducts(d.products);setStatus('ready');})
      .catch(()=>{if(!controller.signal.aborted){setError('This review link is unavailable or expired. Email hello@localjagoff.com for help.');setStatus('error');}});
    return ()=>controller.abort();
  },[]);

  function updateDraft(id,change){
    setDrafts(current=>({...current,[id]:{...(current[id]||emptyDraft()),...change}}));
  }

  async function submit(event,product){
    event.preventDefault();
    const draft=drafts[product.id]||emptyDraft();
    if(product.submitted||sendingProduct!==null||!draft.rating)return;
    if(!publicName.trim()){
      setNameError('Enter a public name before sending your review.');
      nameInput.current?.focus();
      return;
    }
    setNameError('');setSendingProduct(product.id);setProductErrors(current=>({...current,[product.id]:''}));
    try{
      const r=await fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({action:'submit',token:token.current,productId:product.id,rating:draft.rating,displayName:publicName,text:draft.comment,socialShareConsent:draft.consent})});
      const d=await r.json();if(!r.ok)throw new Error(d.error);
      setProducts(current=>current.map(p=>p.id===product.id?{...p,submitted:true}:p));
      setLastSubmitted(product.id);
    }catch{
      setProductErrors(current=>({...current,[product.id]:'We could not confirm this review. Please try again.'}));
    }finally{setSendingProduct(null);}
  }

  const hasUnreviewed=products.some(p=>!p.submitted);
  return <div className={styles.page}><Head><title>Review Your Order | Local Jagoff</title><meta name="robots" content="noindex,nofollow"/><meta name="referrer" content="no-referrer"/></Head><Navbar/><main id="main-content" tabIndex={-1} className={styles.main}>
    <header className={styles.heading}><img src="/images/icon.png" width="80" height="80" alt=""/><div><p className={styles.eyebrow}>LOCAL JAGOFF / REVIEWS</p><h1>WHAT’D YOU THINK?</h1><p className={styles.reviewIntro}>Review anything from your order.</p></div></header>
    <div className={styles.reviewBody}>
      {status==='loading'?<p role="status">Opening your review...</p>:status==='error'?<p className={styles.error} role="alert">{error}</p>:<>
        <p className={styles.note}>Your public name, rating, and review may appear on the product page. Leave out contact details and order numbers. For an order issue, <a href="mailto:hello@localjagoff.com">email us</a>.</p>
        {lastSubmitted!==null&&<section className={styles.reviewSuccess} role="status"><h2>APPRECIATE THE HONESTY.</h2><p>Your review is awaiting moderation. We check for personal details and abuse, not whether you liked the product.</p><p>Want to help us out one more time? You can leave a recommendation on our Facebook Page.</p><a className={styles.facebookLink} href="https://www.facebook.com/profile.php?id=61588908282648" target="_blank" rel="noopener noreferrer">VISIT LOCAL JAGOFF ON FACEBOOK <ArrowRight size={18} aria-hidden="true"/></a>{hasUnreviewed&&<p>There’s more from your order below whenever you’re ready.</p>}</section>}
        {hasUnreviewed&&<div className={styles.formArea}><label className={styles.sharedName}>Public name<input ref={nameInput} value={publicName} onChange={e=>{setPublicName(e.target.value);setNameError('');}} maxLength={40} required placeholder="First name or nickname" autoComplete="off" aria-invalid={Boolean(nameError)} aria-describedby={nameError?'public-name-error':undefined}/></label>{nameError&&<p className={styles.error} id="public-name-error" role="alert">{nameError}</p>}</div>}
        {products.length===0&&<p>No products are available for this review link.</p>}
        {products.length>0&&!hasUnreviewed&&<p role="status">Your reviews have already been received. Thanks for sharing your experience.</p>}
        <div className={styles.reviewProducts}>{products.map(p=>{
          const draft=drafts[p.id]||emptyDraft();
          return <article className={`${styles.productReviewCard} ${p.submitted?styles.productReviewComplete:''}`} key={p.id}>
            <h2>{p.name}</h2>
            {p.submitted?<div className={styles.receivedState}>{draft.rating>0&&<span aria-label={`${draft.rating} out of 5 stars`}>{'★'.repeat(draft.rating)}</span>}<strong><Check size={18} aria-hidden="true"/> REVIEW RECEIVED</strong></div>:<form className={styles.formArea} onSubmit={e=>submit(e,p)}>
              <fieldset className={styles.rating} disabled={sendingProduct!==null}><legend>Your rating</legend>{[1,2,3,4,5].map(n=><label key={n} title={`${n} out of 5`}><input type="radio" name={`rating-${p.id}`} value={n} checked={draft.rating===n} onChange={()=>updateDraft(p.id,{rating:n})} aria-label={`${n} out of 5 stars for ${p.name}`} required/><Star aria-hidden="true" size={28} fill={n<=draft.rating?'#ffe600':'none'} color={n<=draft.rating?'#ffe600':'#aaa'}/></label>)}</fieldset>
              <button className={styles.commentToggle} type="button" aria-expanded={draft.expanded} aria-controls={`comment-${p.id}`} onClick={()=>updateDraft(p.id,{expanded:!draft.expanded})}>{draft.expanded?<Minus size={18} aria-hidden="true"/>:<Plus size={18} aria-hidden="true"/>}{draft.expanded?'Hide comment':'Add a comment (optional)'}</button>
              <div id={`comment-${p.id}`} className={styles.commentPanel} hidden={!draft.expanded}><label>Tell us more <span>What did you like? Anything we should know?</span><textarea value={draft.comment} onChange={e=>updateDraft(p.id,{comment:e.target.value})} maxLength={2000} rows={3}/></label></div>
              <label className={styles.socialConsent}><input type="checkbox" checked={draft.consent} onChange={e=>updateDraft(p.id,{consent:e.target.checked})}/><span>I give Local Jagoff permission to share my review on social media.<small>Optional. This won’t affect your review.</small></span></label>
              <button className={styles.send} disabled={!draft.rating||sendingProduct!==null}>{sendingProduct===p.id?'SENDING...':<>SEND REVIEW <ArrowRight size={18} aria-hidden="true"/></>}</button>
              {productErrors[p.id]&&<p className={styles.error} role="alert">{productErrors[p.id]}</p>}
            </form>}
          </article>;
        })}</div>
      </>}
    </div>
  </main></div>;
}
