'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, ArrowRight, Package } from 'lucide-react';
import { CardSkeleton, ListSkeleton } from '@/components/ui/skeleton';

type Range = 'month' | 'year' | 'all';

function stockSeverity(current: number, optimal: number): { label: string } {
  if (current === 0) return { label: 'Out of stock' };
  if (current <= optimal * 0.25) return { label: 'Critical' };
  if (current <= optimal * 0.5) return { label: 'Low' };
  return { label: 'Reorder soon' };
}

const severityColor = 'bg-red-bg text-red border-red/30';
const barColor = 'bg-red';

export default function DashboardPage() {
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [cumulativeLoading, setCumulativeLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [todaySales, setTodaySales] = useState<number | null>(null);
  const [dayClosed, setDayClosed] = useState(false);
  const [range, setRange] = useState<Range>('month');
  const [cumulative, setCumulative] = useState({ sales: 0, expenses: 0, net: 0, count: 0 });

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserName(user.email?.split('@')[0] || 'User');

      const { data: items } = await supabase.from('inventory_items').select('*');
      if (items) setLowStock(items.filter((i: any) => i.current_stock < i.optimal_stock));

      const { data: exps } = await supabase.from('expenses').select('amount').eq('expense_date', today);
      if (exps) setTodayExpenses(exps.reduce((s: number, e: any) => s + Number(e.amount), 0));

      const { data: sales } = await supabase.from('daily_sales').select('cash_sales,card_sales').eq('sale_date', today).maybeSingle();
      if (sales) setTodaySales(Number(sales.cash_sales) + Number(sales.card_sales));

      const { data: report } = await supabase.from('daily_reports').select('id').eq('report_date', today).maybeSingle();
      if (report) setDayClosed(true);
      setDashboardLoading(false);
    };
    load();
  }, [today]);

  useEffect(() => {
    const loadCumulative = async () => {
      let query = supabase.from('daily_reports').select('total_sales,total_expenses,net_profit');
      if (range === 'month') query = query.gte('report_date', monthStart);
      else if (range === 'year') query = query.gte('report_date', yearStart);

      const { data } = await query;
      if (data && data.length > 0) {
        const sales = data.reduce((s: number, r: any) => s + Number(r.total_sales), 0);
        const expenses = data.reduce((s: number, r: any) => s + Number(r.total_expenses), 0);
        const net = data.reduce((s: number, r: any) => s + Number(r.net_profit), 0);
        setCumulative({ sales, expenses, net, count: data.length });
      } else {
        setCumulative({ sales: 0, expenses: 0, net: 0, count: 0 });
      }
      setCumulativeLoading(false);
    };
    loadCumulative();
  }, [range, monthStart, yearStart]);

  const rangeLabel = range === 'month' ? 'This Month' : range === 'year' ? 'This Year' : 'All Time';
  const displayNet = dayClosed || todaySales !== null ? (todaySales ?? 0) - todayExpenses : null;
  const tabs: { key: Range; label: string }[] = [{ key: 'month', label: 'Month' }, { key: 'year', label: 'Year' }, { key: 'all', label: 'All Time' }];

  return (
    <div className="space-y-7">
      <h1 className="text-xl font-semibold tracking-tight">Good {now.getHours() < 12 ? 'morning' : 'evening'}, {userName || 'Loading...'}</h1>

      {dayClosed && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] text-sm font-medium" style={{ background: 'hsl(142 60% 95%)', color: 'hsl(142 60% 38%)', border: '1px solid hsl(142 60% 85%)' }}>
          Today ({today}) is closed. All transactions finalized.
        </div>
      )}

      {lowStock.length > 0 && (
        <Card className="border-amber/40" style={{ background: '#fffbf5' }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" style={{ color: 'hsl(32 90% 45%)' }} />
                <span className="text-sm font-semibold" style={{ color: 'hsl(32 90% 45%)' }}>{lowStock.length} item{lowStock.length > 1 ? 's' : ''} need reordering</span>
              </div>
              <a href="/dashboard/inventory" className="text-xs text-primary font-medium no-underline hover:underline">Manage inventory →</a>
            </div>
            <div className="space-y-2">
              {lowStock.slice(0, 8).map((item: any) => {
                const severity = stockSeverity(item.current_stock, item.optimal_stock);
                const pct = Math.max(0, Math.min(100, (item.current_stock / item.optimal_stock) * 100));
                const need = item.optimal_stock - item.current_stock;
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.current_stock} / {item.optimal_stock} {item.unit} · {severity.label}</div>
                    </div>
                    <div className="flex-1 max-w-[120px]">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className={`text-xs font-semibold whitespace-nowrap px-2 py-0.5 rounded-[4px] border ${severityColor}`}>
                      +{need} {item.unit}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today</h2>
        </div>
        {dashboardLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'Sales', value: todaySales !== null ? `RM${todaySales.toLocaleString()}` : 'Not closed', color: 'text-foreground' },
              { label: 'Expenses', value: `RM${todayExpenses.toLocaleString()}`, color: 'text-foreground' },
              { label: 'Net', value: displayNet !== null ? `RM${displayNet.toLocaleString()}` : '—', color: displayNet !== null ? (displayNet >= 0 ? 'text-green' : 'text-red') : '' },
            ].map((item, i) => (
              <Card key={i} className="border-t-[3px]" style={{ borderTopColor: i === 0 ? 'hsl(215 80% 45%)' : i === 1 ? 'hsl(32 90% 45%)' : 'hsl(142 60% 38%)' }}>
                <CardContent className="p-4 sm:p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</div>
                  <div className={`text-xl sm:text-2xl font-bold tracking-tight mt-1 ${item.color}`}>{item.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{rangeLabel}</h2>
          <div className="flex gap-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setRange(t.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  range === t.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {cumulativeLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        ) : cumulative.count > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'Total Sales', value: `RM${cumulative.sales.toLocaleString()}`, color: '' },
              { label: 'Total Expenses', value: `RM${cumulative.expenses.toLocaleString()}`, color: '' },
              { label: 'Net Profit', value: `RM${cumulative.net.toLocaleString()}`, color: cumulative.net >= 0 ? 'text-green' : 'text-red' },
            ].map((item, i) => (
              <Card key={i} className="border-t-[3px]" style={{ borderTopColor: i === 0 ? 'hsl(215 80% 45%)' : i === 1 ? 'hsl(32 90% 45%)' : 'hsl(142 60% 38%)' }}>
                <CardContent className="p-4 sm:p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</div>
                  <div className={`text-xl sm:text-2xl font-bold tracking-tight mt-1 ${item.color}`}>{item.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No closed reports for this period.
            </CardContent>
          </Card>
        )}
        {cumulative.count > 0 && (
          <p className="text-xs text-muted-foreground mt-2">Based on {cumulative.count} closed day{cumulative.count !== 1 ? 's' : ''}</p>
        )}
      </section>

      <a
        href={dayClosed ? "/dashboard/reports" : "/dashboard/closing"}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-[8px] text-sm font-semibold border-2 border-primary text-primary bg-card hover:bg-primary hover:text-white transition-colors no-underline"
      >
        {dayClosed ? 'View Today\'s Report' : 'Close Today\'s Shift'}
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
