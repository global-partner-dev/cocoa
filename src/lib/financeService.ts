import { supabase } from '@/lib/supabase';

export type PaymentRole = 'participant' | 'evaluator';
export type PaymentStatus = 'paid' | 'refunded' | 'failed' | 'pending';

export interface PaymentRecord {
  id: string;
  userId: string;
  name?: string | null;
  email?: string | null;
  role: PaymentRole;
  amountCents: number; // store currency minor units
  currency: string; // e.g. USD
  status: PaymentStatus;
  source?: string | null; // e.g. stripe, manual
  createdAt: string; // ISO string
}

export interface PaymentsResult {
  success: boolean;
  data?: PaymentRecord[];
  error?: string;
}

function centsToNumber(amountCents: number) {
  return amountCents / 100;
}

export class FinanceService {
  /**
   * Fetch payments from Supabase. Expects a table `payments` with columns:
   * id (uuid), user_id (uuid), amount_cents (int8), currency (text), status (text), role (text), source (text), created_at (timestamptz)
   * Optionally joined with profiles for name/email.
   */
  static async getPayments(limit = 500): Promise<PaymentsResult> {
    try {
      // Try to join profiles for display
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          user_id,
          amount_cents,
          currency,
          status,
          role,
          source,
          created_at,
          profiles:profiles!payments_user_id_fkey ( name, email )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const mapped: PaymentRecord[] = (data as any[]).map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.profiles?.name ?? null,
        email: row.profiles?.email ?? null,
        role: (row.role as PaymentRole) ?? 'participant',
        amountCents: Number(row.amount_cents ?? 0),
        currency: row.currency ?? 'USD',
        status: (row.status as PaymentStatus) ?? 'paid',
        source: row.source ?? null,
        createdAt: row.created_at,
      }));

      return { success: true, data: mapped };
    } catch (e: any) {
      console.warn('[FinanceService] Falling back to mock payments because DB fetch failed:', e?.message);
      // Fallback mock so UI works even if table not present yet
      const now = new Date();
      const mock: PaymentRecord[] = Array.from({ length: 18 }).map((_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - Math.floor(Math.random() * 25));
        return {
          id: `mock-${i}`,
          userId: `user-${i}`,
          name: i % 2 === 0 ? 'Participant ' + i : 'Evaluator ' + i,
          email: `user${i}@example.com`,
          role: i % 2 === 0 ? 'participant' : 'evaluator',
          amountCents: 1000 + Math.floor(Math.random() * 10000),
          currency: 'USD',
          status: 'paid',
          source: 'mock',
          createdAt: d.toISOString(),
        };
      });
      return { success: true, data: mock };
    }
  }

  static summarize(payments: PaymentRecord[]) {
    const byDay = new Map<string, number>();
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay()); // Sunday start
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let total = 0, todaySum = 0, weekSum = 0, monthSum = 0;

    for (const p of payments) {
      if (p.status !== 'paid') continue;
      const amount = centsToNumber(p.amountCents);
      total += amount;

      const date = new Date(p.createdAt);
      const key = date.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) || 0) + amount);

      if (date >= startOfToday) todaySum += amount;
      if (date >= startOfWeek) weekSum += amount;
      if (date >= startOfMonth) monthSum += amount;
    }

    // Build last 30 days series
    const series: { date: string; amount: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(startOfToday.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      series.push({ date: k, amount: +(byDay.get(k) || 0).toFixed(2) });
    }

    return {
      total: +total.toFixed(2),
      today: +todaySum.toFixed(2),
      week: +weekSum.toFixed(2),
      month: +monthSum.toFixed(2),
      series,
    };
  }

  /** Record an evaluator payment after PayPal capture via Edge Function */
  static async recordEvaluatorPayment(sampleId: string, amountCents: number, currency = 'USD', paypal: { orderId: string; captureId?: string }) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      // Call edge function to verify and persist via Supabase client
      const { data, error } = await supabase.functions.invoke('paypal-capture', {
        body: {
          role: 'evaluator',
          sampleId,
          amountCents,
          currency,
          orderId: paypal.orderId,
          captureId: paypal.captureId,
        },
      });
      if (error) throw new Error(error.message || 'Capture failed');
      if ((data as any)?.error) throw new Error((data as any).error);
      return { success: true } as const;
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to record payment' } as const;
    }
  }

  /** Get paid sample IDs for current evaluator */
  static async getPaidSampleIds() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('payments')
        .select('sample_id')
        .eq('user_id', user.id)
        .eq('role', 'evaluator')
        .eq('status', 'paid')
        .not('sample_id', 'is', null);
      if (error) throw error;
      const ids = new Set<string>((data || []).map((r: any) => r.sample_id).filter(Boolean));
      return { success: true, data: ids } as const;
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to load paid samples' } as const;
    }
  }

  /** Gate: evaluators can pay only when the contest has final_evaluation = true */
  static async canEvaluatorPayForSample(sampleId: string) {
    try {
      const { data, error } = await supabase
        .from('samples')
        .select('contests:contest_id ( final_evaluation )')
        .eq('id', sampleId)
        .single();
      if (error) throw error;
      const allowed = Boolean((data as any)?.contests?.final_evaluation);
      return { success: true, allowed } as const;
    } catch (e: any) {
      return { success: false, allowed: false, error: e?.message || 'Failed to check payment gate' } as const;
    }
  }

  /** Fetch evaluation price (in cents) from contests for a given sample */
  static async getEvaluationPriceCentsForSample(sampleId: string) {
    try {
      const { data, error } = await supabase
        .from('samples')
        .select('contests:contest_id ( evaluation_price )')
        .eq('id', sampleId)
        .single();
      if (error) throw error;
      const price = (data as any)?.contests?.evaluation_price;
      if (price == null || isNaN(Number(price))) throw new Error('Evaluation price not set for contest');
      // evaluation_price is stored in dollars; convert to cents
      return { success: true, data: Math.round(Number(price) * 100) } as const;
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to fetch evaluation price' } as const;
    }
  }

}