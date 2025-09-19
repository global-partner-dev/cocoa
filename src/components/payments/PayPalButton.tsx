import { useEffect, useRef, useState } from 'react';
import { loadPayPalSdk } from '@/lib/paypal';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export interface PayPalButtonProps {
  clientId: string; // PayPal REST app client id
  currency?: string; // default USD
  amount: string; // string per PayPal SDK, e.g. "12.99"
  description?: string;
  // Called when PayPal approves and capture succeeds. Returns the PayPal order ID and capture ID
  onApprove: (payload: { orderId: string; captureId?: string }) => Promise<void> | void;
  // Optional hook when user cancels
  onCancel?: () => void;
  // Optional hook when error occurs
  onError?: (message: string) => void;
  disabled?: boolean;
}

/**
 * Thin wrapper rendering PayPal Smart Buttons.
 * Parent is responsible for persisting order info to DB on onApprove.
 */
export default function PayPalButton({ clientId, currency = 'USD', amount, description, onApprove, onCancel, onError, disabled }: PayPalButtonProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonsRef = useRef<any | null>(null);
  const [ready, setReady] = useState(false);
  const [rendered, setRendered] = useState(false);

  // Keep latest props in refs so we can render buttons once and still use fresh values
  const amountRef = useRef(amount);
  const currencyRef = useRef(currency);
  const descriptionRef = useRef(description);
  const disabledRef = useRef(!!disabled);
  const onApproveRef = useRef(onApprove);
  const onCancelRef = useRef(onCancel);
  const onErrorRef = useRef(onError);

  useEffect(() => { amountRef.current = amount; }, [amount]);
  useEffect(() => { currencyRef.current = currency; }, [currency]);
  useEffect(() => { descriptionRef.current = description; }, [description]);
  useEffect(() => { disabledRef.current = !!disabled; }, [disabled]);
  useEffect(() => { onApproveRef.current = onApprove; }, [onApprove]);
  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadPayPalSdk({ clientId, currency, intent: 'capture' });
        if (!cancelled) setReady(true);
      } catch (e: any) {
        onErrorRef.current?.(e?.message || t('dashboard.payments.paypalButton.errors.loadPayPal'));
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, currency]);

  // Mount PayPal Buttons once when ready; do not close on prop changes
  useEffect(() => {
    if (!ready || !containerRef.current || rendered) return;
    const paypal = (window as any).paypal as any;
    if (!paypal?.Buttons) return;

    console.log('[paypal] init', { ready, rendered, hasContainer: !!containerRef.current, amount: amountRef.current, currency: currencyRef.current, disabled: disabledRef.current });

    const buttons = paypal.Buttons({
      style: { layout: 'horizontal', color: 'gold', shape: 'rect', label: 'paypal', tagline: false },
      onInit: (_data: any, actions: any) => {
        console.log('[paypal] onInit');
        if (disabledRef.current && actions?.disable) actions.disable();
        if (!disabledRef.current && actions?.enable) actions.enable();
      },
      onClick: (data: any) => {
        console.log('[paypal] onClick', { data });
      },
      createOrder: (_data: any, actions: any) => {
        const amt = amountRef.current;
        const cur = currencyRef.current;
        const desc = descriptionRef.current || t('dashboard.payments.paypalButton.defaultDescription');
        console.log('[paypal] createOrder', { amount: amt, currency: cur });
        return actions.order.create({
          purchase_units: [
            {
              amount: { value: amt, currency_code: cur },
              description: desc,
            },
          ],
          intent: 'CAPTURE',
        });
      },
      onApprove: async (_data: any, actions: any) => {
        try {
          const details = await actions.order.capture();
          const orderId = details?.id;
          const captureId = details?.purchase_units?.[0]?.payments?.captures?.[0]?.id;
          console.log('[paypal] onApprove', { orderId, captureId });
          await onApproveRef.current?.({ orderId, captureId });
        } catch (e: any) {
          console.error('[paypal] capture failed', e);
          onErrorRef.current?.(e?.message || t('dashboard.payments.paypalButton.errors.paymentCaptureFailed'));
        }
      },
      onCancel: () => { console.log('[paypal] onCancel'); onCancelRef.current?.(); },
      onError: (err: any) => { console.error('[paypal] onError', err); onErrorRef.current?.(err?.message || t('dashboard.payments.paypalButton.errors.payPalError')); },
    });

    // Hold onto instance so we don't close it during React re-renders
    buttonsRef.current = buttons;

    if (typeof buttons.isEligible === 'function' && !buttons.isEligible()) {
      console.warn('[paypal] Buttons not eligible for this context', { amount: amountRef.current, currency: currencyRef.current });
      onErrorRef.current?.(t('dashboard.payments.paypalButton.errors.notEligible'));
      return;
    }

    buttons
      .render(containerRef.current)
      .then(() => { console.log('[paypal] render success'); setRendered(true); })
      .catch((err: any) => {
        console.error('[paypal] render failed', err);
        onErrorRef.current?.(err?.message || t('dashboard.payments.paypalButton.errors.renderFailed'));
      });

    // In production, avoid closing buttons on effect cleanup unless unmounting
    return () => {
      // Only close if component is actually unmounting (container removed)
      const container = containerRef.current;
      const stillInDom = container && document.body.contains(container);
      if (!stillInDom && buttonsRef.current) {
        try { buttonsRef.current.close(); console.log('[paypal] buttons closed (unmount)'); } catch {}
        buttonsRef.current = null;
      } else {
        console.log('[paypal] cleanup skipped (rerender)');
      }
    };
  }, [ready, rendered]);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
      {!ready && (
        <Button disabled size="sm" className="w-full sm:w-auto">
          <span className="text-xs sm:text-sm">{t('dashboard.payments.paypalButton.loading')}</span>
        </Button>
      )}
      <div
        ref={containerRef}
        className="w-full sm:w-auto"
        style={{
          minHeight: 40, // ensure container has space to render
          opacity: disabled ? 0.6 : 1,
          pointerEvents: disabled ? 'none' as const : 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative', // establish stacking context
          zIndex: 0, // keep behind any overlayed sibling elements
        }}
      />
    </div>
  );
}