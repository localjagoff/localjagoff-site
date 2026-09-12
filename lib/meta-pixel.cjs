const PIXEL_ID = '2603757676747952';
const CONSENT_KEY = 'lj-meta-consent-v1';
const PURCHASE_KEY = 'lj-meta-purchases-v1';
const ORIGIN = 'https://www.localjagoff.com';

function eligibleLocation(location) {
  if (!location || location.origin !== ORIGIN) return false;
  const url = new URL(location.href);
  if (!(/^\/(?:product\/[1-9]\d*|tees|hoodies|hats|stuff-nat|cart|success|privacy)?$/.test(url.pathname)) || url.hash) return false;
  return [...url.searchParams].every(([key, value]) =>
    (key === 'variant' && /^[1-9]\d{0,15}$/.test(value)) ||
    (key === 'fbclid' && /^[a-zA-Z0-9_-]{1,500}$/.test(value)));
}

function productParameters(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) return null;
  const contents = [];
  for (const item of items) {
    const id = String(item?.id), variant = String(item?.variant_id), quantity = Number(item?.quantity);
    const cents = Number(item?.unit_amount);
    if (!/^[1-9]\d{0,15}$/.test(id) || !/^[1-9]\d{0,15}$/.test(variant) ||
        !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99 ||
        !Number.isSafeInteger(cents) || cents < 1) return null;
    contents.push({ id: `lj_${id}_${variant}`, quantity, item_price: cents / 100 });
  }
  return { content_type: 'product', content_ids: contents.map(item => item.id), contents,
    num_items: contents.reduce((sum, item) => sum + item.quantity, 0), currency: 'USD',
    value: Math.round(contents.reduce((sum, item) => sum + item.item_price * item.quantity, 0) * 100) / 100 };
}

function createTracker(win) {
  let initialized = false, consentGranted = false, page = '', viewed = '', currentProduct = null;
  const sentPurchases = new Set();
  const read = key => { try { return win.localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { win.localStorage.setItem(key, value); } catch {} };
  const privacySignal = () => win.navigator.globalPrivacyControl === true ||
    win.navigator.doNotTrack === '1' || win.doNotTrack === '1';
  const choice = () => privacySignal() ? 'denied' : read(CONSENT_KEY);
  const safeReferrer = () => {
    if (!win.document.referrer) return true;
    try {
      const ref = new URL(win.document.referrer);
      return !ref.search && !ref.hash || eligibleLocation(ref);
    } catch { return false; }
  };
  const allowed = () => choice() === 'granted' && eligibleLocation(win.location) && safeReferrer();

  function consent(granted) {
    if (!initialized || consentGranted === granted) return;
    win.fbq('consent', granted ? 'grant' : 'revoke');
    consentGranted = granted;
  }

  function ready() {
    if (!allowed()) return false;
    if (!initialized) {
      // Do not mix with a second site's Pixel or an unexpected existing integration.
      if (win.fbq) return false;
      const queue = function () { queue.callMethod ? queue.callMethod.apply(queue, arguments) : queue.queue.push(arguments); };
      queue.push = queue; queue.loaded = true; queue.version = '2.0'; queue.queue = [];
      // Meta otherwise emits an extra automatic PageView on history changes.
      queue.disablePushState = true;
      win.fbq = queue; win._fbq = queue;
      queue('consent', 'grant');
      consentGranted = true;
      queue('set', 'autoConfig', false, PIXEL_ID);
      queue('init', PIXEL_ID);
      const script = win.document.createElement('script');
      script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      script.setAttribute('data-lj-pixel', PIXEL_ID);
      win.document.head.appendChild(script);
      initialized = true;
    }
    consent(true);
    return true;
  }
  function track(name, parameters, eventID) {
    try {
      if (!ready()) return false;
      win.fbq('trackSingle', PIXEL_ID, name, parameters || {}, ...(eventID ? [{ eventID }] : []));
      return true;
    } catch { return false; }
  }
  function refresh() {
    if (!allowed()) { consent(false); return; }
    const key = win.location.pathname + win.location.search;
    if (page !== key && track('PageView')) { page = key; viewed = ''; }
    if (currentProduct?.path === win.location.pathname) {
      const parameters = productParameters([currentProduct.item]);
      const viewKey = `${key}:${parameters?.content_ids[0]}`;
      if (parameters && viewed !== viewKey && track('ViewContent', parameters)) viewed = viewKey;
    }
  }
  function setChoice(value) {
    if (!['granted', 'denied'].includes(value)) return;
    write(CONSENT_KEY, value);
    if (value === 'denied') {
      consent(false);
      for (const name of ['_fbp', '_fbc']) for (const domain of ['', '; Domain=www.localjagoff.com', '; Domain=localjagoff.com']) {
        win.document.cookie = `${name}=; Max-Age=0; Path=/; Secure; SameSite=Lax${domain}`;
      }
    }
    refresh();
    win.dispatchEvent(new win.Event('lj-privacy-choice'));
  }
  return { choice, privacySignal, allowed, refresh, setChoice,
    suspend(destination) {
      let next; try { next = new URL(destination, win.location.href); } catch {}
      if (!next || !eligibleLocation(next)) consent(false);
    },
    observeProduct(item) {
      const context = { path: `/product/${item.id}`, item };
      currentProduct = context; refresh();
      return () => { if (currentProduct === context) currentProduct = null; };
    },
    addToCart(items) { const parameters = productParameters(items); return parameters ? track('AddToCart', parameters) : false; },
    initiateCheckout(items) { const parameters = productParameters(items); return parameters ? track('InitiateCheckout', parameters) : false; },
    purchase(receipt) {
      if (!allowed() || win.location.pathname !== '/success' || receipt?.paid !== true ||
          !/^lj_purchase_[a-f0-9]{64}$/.test(receipt.event_id || '')) return false;
      const parameters = productParameters(receipt.items);
      if (!parameters || !Number.isSafeInteger(receipt.amount_total) || receipt.amount_total < 1) return false;
      let saved; try { saved = JSON.parse(read(PURCHASE_KEY)); } catch {}
      const recent = Array.isArray(saved) ? saved.filter(id => /^lj_purchase_[a-f0-9]{64}$/.test(id)).slice(-99) : [];
      if (sentPurchases.has(receipt.event_id) || recent.includes(receipt.event_id)) return false;
      if (!track('Purchase', { ...parameters, value: receipt.amount_total / 100 }, receipt.event_id)) return false;
      sentPurchases.add(receipt.event_id);
      write(PURCHASE_KEY, JSON.stringify([...recent, receipt.event_id]));
      return true;
    },
  };
}
let browserTracker;
function getTracker() {
  if (typeof window === 'undefined') return null;
  return browserTracker || (browserTracker = createTracker(window));
}
module.exports = { PIXEL_ID, CONSENT_KEY, PURCHASE_KEY, eligibleLocation, productParameters, createTracker, getTracker };
