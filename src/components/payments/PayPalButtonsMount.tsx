import PayPalButton from '@/components/payments/PayPalButton';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  amount: string; // e.g. "19.99"
  disabled?: boolean;
  label?: string;
  onApproved: (ids: { orderId: string; captureId?: string }) => Promise<void> | void;
}

export default function PayPalButtonsMount({ amount, disabled, onApproved }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;

  console.log('[paypal] env client id present:', !!clientId);

  useEffect(() => {
    // Log SDK readiness and configuration once per mount
    const log = () => {
      const wp: any = (window as any).paypal;
      const hasSdk = !!wp;
      const hasButtons = !!wp?.Buttons;
      const scripts = Array.from(document.querySelectorAll('script[src*="paypal.com/sdk/js"]')) as HTMLScriptElement[];
      const urls = scripts.map(s => s.src);
      console.log('[paypal] check', { hasSdk, hasButtons, urls, amount, currency: 'USD' });
      if (hasSdk && !hasButtons) {
        console.warn('[paypal] SDK loaded but Buttons missing (yet). Waiting for loader…');
      }
    };
    log();
    const t = setTimeout(log, 1500);
    return () => clearTimeout(t);
  }, [clientId, amount]);

  if (!clientId) {
    return (
      <div className="text-xs sm:text-sm text-red-600 text-center sm:text-left">{t('dashboard.payments.paypalButtonsMount.missingClientId')}</div>
    );
  }

  return (
    <PayPalButton
      clientId={clientId}
      currency="USD"
      amount={amount}
      onApprove={async ({ orderId, captureId }) => {
        try {
          await onApproved({ orderId, captureId });
        } catch (e: any) {
          toast({ title: t('dashboard.payments.paypalButtonsMount.toasts.submissionFailed'), description: e?.message || t('dashboard.payments.paypalButtonsMount.toasts.unexpectedError'), variant: 'destructive' });
        }
      }}
      onError={(m) => toast({ title: t('dashboard.payments.paypalButtonsMount.toasts.payPalError'), description: m, variant: 'destructive' })}
      onCancel={() => toast({ title: t('dashboard.payments.paypalButtonsMount.toasts.paymentCancelled'), description: t('dashboard.payments.paypalButtonsMount.toasts.paymentCancelledDescription') })}
      disabled={disabled}
    />
  );
}