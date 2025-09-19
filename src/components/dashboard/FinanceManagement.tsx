import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, DollarSign, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { FinanceService, PaymentRecord } from '@/lib/financeService';
import { useTranslation } from 'react-i18next';

// Modern chart using Recharts with gradients, tooltip, grid
function MiniAreaChart({ data }: { data: { date: string; amount: number }[] }) {
  const formatted = data.map(d => ({ date: d.date.slice(5), amount: d.amount })); // MM-DD
  const tickFormatter = (v: number) => `$${v.toFixed(0)}`;
  return (
    <div className="w-full h-48 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f1b24a" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#f1b24a" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={tickFormatter} width={50} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, '']} labelFormatter={(l) => l as any} />
          <Area type="monotone" dataKey="amount" stroke="#f1b24a" fill="url(#earnGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function FinanceManagement() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const load = async () => {
    setLoading(true);
    const res = await FinanceService.getPayments();
    if (res.success && res.data) setPayments(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const summary = useMemo(() => FinanceService.summarize(payments), [payments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">{t('finance.header.title')}</h2>
          <p className="text-muted-foreground">{t('finance.header.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 w-full sm:w-auto">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('finance.header.refresh')}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-muted-foreground">{t('finance.summary.total')}</div>
            <div className="text-lg sm:text-2xl font-bold text-[hsl(var(--chocolate-dark))]">${summary.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-muted-foreground">{t('finance.summary.month')}</div>
            <div className="text-lg sm:text-2xl font-bold text-blue-700">${summary.month.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-muted-foreground">{t('finance.summary.week')}</div>
            <div className="text-lg sm:text-2xl font-bold text-emerald-700">${summary.week.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-muted-foreground">{t('finance.summary.today')}</div>
            <div className="text-lg sm:text-2xl font-bold text-yellow-700">${summary.today.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Earning graph */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl"><TrendingUp className="w-5 h-5" /> {t('finance.chart.title')}</CardTitle>
          <CardDescription>{t('finance.chart.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <MiniAreaChart data={summary.series} />
        </CardContent>
      </Card>

      {/* Payment list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl"><DollarSign className="w-5 h-5" /> {t('finance.table.title')}</CardTitle>
          <CardDescription>{t('finance.table.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-3 pr-4 text-xs sm:text-sm">{t('finance.table.when')}</th>
                  <th className="py-3 pr-4 text-xs sm:text-sm">{t('finance.table.who')}</th>
                  <th className="py-3 pr-4 text-xs sm:text-sm hidden sm:table-cell">{t('finance.table.role')}</th>
                  <th className="py-3 pr-4 text-xs sm:text-sm">{t('finance.table.amount')}</th>
                  <th className="py-3 pr-4 text-xs sm:text-sm">{t('finance.table.status')}</th>
                  <th className="py-3 pr-4 text-xs sm:text-sm hidden lg:table-cell">{t('finance.table.source')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 whitespace-nowrap text-xs sm:text-sm">
                      <div className="hidden sm:block">{new Date(p.createdAt).toLocaleString()}</div>
                      <div className="sm:hidden">{new Date(p.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 pr-4 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                      {p.name || p.email || p.userId}
                    </td>
                    <td className="py-3 pr-4 text-xs sm:text-sm capitalize hidden sm:table-cell">{p.role}</td>
                    <td className="py-3 pr-4 text-xs sm:text-sm font-medium">{p.currency} ${(p.amountCents/100).toFixed(2)}</td>
                    <td className="py-3 pr-4">
                      <Badge className={`text-xs ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>{p.status}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-xs sm:text-sm hidden lg:table-cell">{p.source || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}