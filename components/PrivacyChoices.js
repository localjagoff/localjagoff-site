import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getTracker } from '../lib/meta-pixel.cjs';

export default function PrivacyChoices() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signal, setSignal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const privatePage = router.pathname === '/review' || router.pathname.startsWith('/admin');
  useEffect(() => {
    const tracker = getTracker();
    setMounted(true);
    const sync = () => { setSignal(tracker.privacySignal()); setOpen(!tracker.choice()); tracker.refresh(); };
    sync();
    window.addEventListener('storage', sync);
    router.events.on('routeChangeStart', tracker.suspend);
    router.events.on('routeChangeComplete', tracker.refresh);
    return () => {
      window.removeEventListener('storage', sync);
      router.events.off('routeChangeStart', tracker.suspend);
      router.events.off('routeChangeComplete', tracker.refresh);
    };
  }, [router.events]);
  function choose(value) { getTracker().setChoice(value); setOpen(false); }
  if (!mounted || privatePage) return null;
  return <>
    <div className="privacy-choice-footer"><button type="button" onClick={() => setOpen(true)}>Cookie choices</button></div>
    {open && <section className="privacy-choice-banner" aria-label="Cookie choices">
      <div className="privacy-choice-copy">
        <strong>YOUR PRIVACY. YOUR CALL.</strong>
        <p>{signal ? 'Your browser privacy signal is on. Optional Meta tracking stays off.' :
          'Allow Meta cookies to measure visits and shopping activity and support personalized ads. Optional tracking stays off unless you allow it.'} <Link href="/privacy">Privacy details</Link></p>
      </div>
      <div className="privacy-choice-actions">
        <button type="button" onClick={() => choose('denied')}>{signal ? 'Keep tracking off' : 'Decline optional'}</button>
        {!signal && <button type="button" className="privacy-allow" onClick={() => choose('granted')}>Allow Meta cookies</button>}
      </div>
    </section>}
  </>;
}
