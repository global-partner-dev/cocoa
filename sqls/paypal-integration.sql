-- PayPal provider integration for payments table
-- Adds provider-specific fields and constraints

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'paypal' CHECK (provider IN ('paypal')),
  ADD COLUMN IF NOT EXISTS provider_order_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS provider_capture_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS provider_payload JSONB NULL;

-- Helpful index to avoid duplicates and speed lookups
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_paypal_capture
ON public.payments(provider, provider_capture_id)
WHERE provider IS NOT NULL AND provider_capture_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_provider_order
ON public.payments(provider, provider_order_id)
WHERE provider IS NOT NULL AND provider_order_id IS NOT NULL;