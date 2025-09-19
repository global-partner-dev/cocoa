-- Payments table and RLS setup
-- Creates a generic payments table to track participant/evaluator payments

-- Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('participant','evaluator')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','refunded','failed','pending')),
  source TEXT NULL, -- e.g. 'stripe', 'app', 'manual'
  sample_id UUID NULL REFERENCES public.samples(id) ON DELETE SET NULL, -- optional link to evaluated/paid sample
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_sample_id ON public.payments(sample_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);

-- RLS enable
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1) Users can view their own payments
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (user_id = auth.uid());

-- 2) Admins/Directors can view all payments
DROP POLICY IF EXISTS "Admins/Directors can view all payments" ON public.payments;
CREATE POLICY "Admins/Directors can view all payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','director')
    )
  );

-- 3) Users can insert payments for themselves (app/client writes)
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
CREATE POLICY "Users can insert own payments" ON public.payments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 4) Admins/Directors can update payments (e.g., refunds)
DROP POLICY IF EXISTS "Admins/Directors can update payments" ON public.payments;
CREATE POLICY "Admins/Directors can update payments" ON public.payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','director')
    )
  );

-- 5) Admins/Directors can delete payments
DROP POLICY IF EXISTS "Admins/Directors can delete payments" ON public.payments;
CREATE POLICY "Admins/Directors can delete payments" ON public.payments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','director')
    )
  );

-- Grants (RLS gates access)
GRANT ALL ON public.payments TO anon, authenticated;