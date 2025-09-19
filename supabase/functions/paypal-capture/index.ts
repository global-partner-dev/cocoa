// Supabase Edge Function: paypal-capture
// Verifies PayPal order/capture and records payment in DB
// Env required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - SUPABASE_ANON_KEY (for user auth verification)
// - PAYPAL_CLIENT_ID
// - PAYPAL_CLIENT_SECRET
// - PAYPAL_ENV (sandbox|live)

// deno-lint-ignore-file no-explicit-any

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const PAYPAL_CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID')!;
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET')!;
const PAYPAL_ENV = (Deno.env.get('PAYPAL_ENV') || 'sandbox').toLowerCase();
const PP_BASE = PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

// CORS headers for browser access from dev and production UIs
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // optionally restrict to your domains
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function getPayPalAccessToken() {
  const creds = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const res = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal oauth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

async function getPayPalOrder(accessToken: string, orderId: string) {
  const res = await fetch(`${PP_BASE}/v2/checkout/orders/${orderId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`PayPal order fetch failed: ${res.status}`);
  return await res.json();
}

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}

serve(async (req) => {
  // Preflight support
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders } });
  }
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const auth = req.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) return json(401, { error: 'Missing auth' });
    const jwt = auth.slice('Bearer '.length);

    // Verify user from JWT using anon client with JWT attached
    const supabaseUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: userData, error: userErr } = await supabaseUserClient.auth.getUser();
    if (userErr || !userData?.user?.id) return json(401, { error: 'Invalid user' });
    const userId = userData.user.id;

    const payload = await req.json();
    const role = payload?.role as 'evaluator';
    const sampleId = payload?.sampleId as string;
    const amountCents = Number(payload?.amountCents);
    const currency = (payload?.currency || 'USD').toUpperCase();
    const orderId = payload?.orderId as string;
    const captureId = payload?.captureId as (string | undefined);

    if (!role || !sampleId || !orderId || !amountCents || !currency) {
      return json(400, { error: 'Missing fields' });
    }

    // Read expected amount from DB
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch contest and expected amount
    const { data: sampleRow, error: sampleErr } = await admin
      .from('samples')
      .select('contest_id')
      .eq('id', sampleId)
      .single();
    if (sampleErr || !sampleRow?.contest_id) return json(400, { error: 'Invalid sample' });

    // Only handle evaluator payments now
    const { data: contest, error: contestErr } = await admin
      .from('contests')
      .select('evaluation_price')
      .eq('id', sampleRow.contest_id)
      .single();
    if (contestErr) return json(400, { error: 'Contest lookup failed' });
    const expectedCents = Math.round(Number(contest?.evaluation_price ?? 0) * 100);

    if (!expectedCents || isNaN(expectedCents)) return json(400, { error: 'Invalid expected price' });

    // Verify with PayPal
    const ppToken = await getPayPalAccessToken();
    const order = await getPayPalOrder(ppToken, orderId);

    const status = order?.status; // should be COMPLETED
    const unit = order?.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    const amountVal = Number(unit?.amount?.value);
    const amountCurrency = (unit?.amount?.currency_code || '').toUpperCase();
    const actualCaptureId = capture?.id as string | undefined;
    const captureStatus = capture?.status; // should be COMPLETED

    if (status !== 'COMPLETED' && captureStatus !== 'COMPLETED') {
      return json(400, { error: 'PayPal order not completed' });
    }
    if (!amountVal || amountCurrency !== currency) {
      return json(400, { error: 'PayPal amount/currency mismatch' });
    }

    const paypalCents = Math.round(amountVal * 100);

    // Compare expected and both reported amounts
    if (Math.abs(expectedCents - paypalCents) > 0 || Math.abs(expectedCents - amountCents) > 0) {
      return json(400, { error: 'Amount mismatch' });
    }

    // Persist payment
    const { error: insertErr } = await admin.from('payments').insert({
      user_id: userId,
      role,
      amount_cents: expectedCents,
      currency,
      status: 'paid',
      source: 'paypal',
      sample_id: sampleId,
      provider: 'paypal',
      provider_order_id: orderId,
      provider_capture_id: captureId || actualCaptureId || null,
      provider_payload: order,
    });
    if (insertErr) return json(500, { error: 'DB insert failed' });


    return json(200, { ok: true });
  } catch (e: any) {
    return json(500, { error: e?.message || 'Unexpected error' });
  }
});