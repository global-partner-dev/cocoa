// Lightweight PayPal SDK loader and helpers
// Loads the PayPal JS SDK on demand and exposes a promise to access window.paypal

let paypalLoadPromise: Promise<typeof window.paypal> | null = null;

export type PayPalEnv = 'sandbox' | 'live';

export function loadPayPalSdk(options: {
  clientId: string;
  currency?: string;
  intent?: 'capture' | 'authorize';
  env?: PayPalEnv;
}) {
  if (paypalLoadPromise) return paypalLoadPromise;

  const {
    clientId,
    currency = 'USD',
    intent = 'capture',
  } = options;

  paypalLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('PayPal SDK can only be loaded in browser'));
      return;
    }

    // If already loaded, but ensure Buttons component exists
    const existing = (window as any).paypal;
    if (existing) {
      if (existing.Buttons) {
        resolve(existing);
        return;
      }
      // SDK present without Buttons: inject script requesting buttons and wait
      const addButtons = () => {
        const script = document.createElement('script');
        const base = 'https://www.paypal.com/sdk/js';
        const params = new URLSearchParams({
          'client-id': clientId,
          currency,
          intent,
          components: 'buttons',
        });
        script.src = `${base}?${params.toString()}`;
        script.async = true;
        script.onload = () => {
          const check = () => {
            const wp = (window as any).paypal;
            if (wp?.Buttons) {
              resolve(wp);
            } else {
              setTimeout(check, 50);
            }
          };
          check();
        };
        script.onerror = () => reject(new Error('Failed to load PayPal SDK (buttons)'));
        document.body.appendChild(script);
      };
      addButtons();
      return;
    }

    const script = document.createElement('script');
    // Explicitly request the Buttons component and build the URL safely
    const base = 'https://www.paypal.com/sdk/js';
    const params = new URLSearchParams({
      'client-id': clientId,
      currency,
      intent,
      components: 'buttons',
    });
    script.src = `${base}?${params.toString()}`;
    script.async = true;
    // Wait until paypal.Buttons is available before resolving to avoid race conditions
    script.onload = () => {
      const start = Date.now();
      const check = () => {
        const wp = (window as any).paypal;
        if (wp?.Buttons) {
          console.debug('[paypal] SDK loaded and Buttons available');
          resolve(wp);
        } else if (Date.now() - start > 8000) {
          console.error('[paypal] SDK loaded but Buttons not available after 8s');
          const err = new Error('PayPal SDK loaded but Buttons component not available');
          (err as any).details = { hasPaypal: !!wp, keys: wp ? Object.keys(wp) : [] };
          // Reject so UI can show a meaningful error instead of spinning forever
          // Caller may retry which reuses cached promise; clear cache on failure to allow retry
          paypalLoadPromise = null;
          reject(err);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    };
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.body.appendChild(script);
  });

  return paypalLoadPromise;
}