'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ClipboardCheck, ArrowLeft, ArrowRight, Check, Plus, X, Receipt, Package, DollarSign } from 'lucide-react';

type StockEntry = { id: string; name: string; unit: string; optimal_stock: number; current_stock: number };
type SaleEntry = { type: string; amount: number };

const STEPS = ['Audit', 'Expenses', 'Sales', 'Review'];

export default function ClosingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [stocks, setStocks] = useState<StockEntry[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [newExpense, setNewExpense] = useState({ desc: '', amount: '' });
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [saleTypes, setSaleTypes] = useState<string[]>(['Cash', 'QR', 'Account Transfer', 'Card', 'E-hailing']);
  const [saleType, setSaleType] = useState('Cash');
  const [saleAmount, setSaleAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadyClosed, setAlreadyClosed] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.from('daily_reports').select('*').eq('report_date', today).maybeSingle();
      if (data) { setAlreadyClosed(true); return; }
      if (step === 0) {
        const { data: items } = await supabase.from('inventory_items').select('*').order('name');
        if (items) setStocks(items);
        const { data: settings } = await supabase.from('user_settings').select('sale_types').maybeSingle();
        if (settings) {
          const st = settings as any;
          if (st.sale_types?.length) {
            setSaleTypes(st.sale_types);
            if (!st.sale_types.includes(saleType)) setSaleType(st.sale_types[0]);
          }
        }
      }
      if (step === 1) {
        const { data: exps } = await supabase.from('expenses').select('*').eq('expense_date', today).order('created_at');
        if (exps) setExpenses(exps);
      }
    };
    check();
  }, [step, today]);

  if (alreadyClosed) {
    return (
      <div className="max-w-[520px] mx-auto space-y-6 pt-8">
        <Card className="text-center">
          <CardContent className="p-8 space-y-4">
            <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <h2 className="text-lg font-semibold">Today is Already Closed</h2>
            <p className="text-sm text-muted-foreground">The shift for <strong>{today}</strong> has been finalized.</p>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>Dashboard</Button>
              <Button onClick={() => router.push('/dashboard/reports')}>View Reports</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const updateStock = (id: string, value: number) => {
    setStocks(prev => prev.map(s => s.id === id ? { ...s, current_stock: value } : s));
  };

  const addExpense = async () => {
    if (!newExpense.desc || !newExpense.amount) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('expenses').insert([{ description: newExpense.desc, amount: Number(newExpense.amount), user_id: user?.id }]);
    setNewExpense({ desc: '', amount: '' });
    const { data } = await supabase.from('expenses').select('*').eq('expense_date', today).order('created_at');
    if (data) setExpenses(data);
  };

  const addSale = () => {
    const amount = Number(saleAmount);
    if (!amount || amount <= 0) return;
    setSales(prev => [...prev, { type: saleType, amount }]);
    setSaleAmount('');
  };

  const removeSale = (index: number) => {
    setSales(prev => prev.filter((_, i) => i !== index));
  };

  const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalSales = sales.reduce((s: number, e: SaleEntry) => s + e.amount, 0);
  const net = totalSales - totalExpenses;

  const handleCloseDay = async () => {
    setSubmitting(true);
    setError('');

    const { data: existing } = await supabase.from('daily_reports').select('id').eq('report_date', today).maybeSingle();
    if (existing) { setError('This day was already closed by another session.'); setSubmitting(false); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Not authenticated'); setSubmitting(false); return; }

      for (const s of stocks) {
        await supabase.from('inventory_items').update({ current_stock: s.current_stock }).eq('id', s.id);
      }

      await supabase.from('daily_sales').insert([{
        cash_sales: totalSales,
        card_sales: 0,
        user_id: user.id,
      }]);

      const { error: reportErr } = await supabase.from('daily_reports').insert([{
        report_date: today,
        inventory_snapshot: stocks,
        expenses_snapshot: expenses,
        sales_snapshot: { items: sales },
        total_expenses: totalExpenses,
        total_sales: totalSales,
        net_profit: net,
        user_id: user.id,
      }]);
      if (reportErr) throw reportErr;

      setDone(true);
    } catch (err: any) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="max-w-[520px] mx-auto space-y-6 pt-8">
        <Card>
          <CardContent className="p-8 space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-green-bg flex items-center justify-center mx-auto">
              <Check className="h-6 w-6 text-green" />
            </div>
            <h2 className="text-lg font-semibold">Shift Closed</h2>
            <p className="text-sm text-muted-foreground">Day <strong>{today}</strong> finalized.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Sales', value: `RM${totalSales.toLocaleString()}`, color: '' },
                { label: 'Expenses', value: `RM${totalExpenses.toLocaleString()}`, color: '' },
                { label: 'Net', value: `RM${net.toLocaleString()}`, color: net >= 0 ? 'text-green' : 'text-red' },
                { label: 'Items Audited', value: String(stocks.length), color: '' },
              ].map((item, i) => (
                <div key={i} className="p-3 sm:p-4 border rounded-[8px] bg-card">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</div>
                  <div className={`text-base sm:text-lg font-bold mt-1 ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={() => router.push('/dashboard/reports')}>View Reports</Button>
              <Button onClick={() => router.push('/dashboard')}>Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[520px] mx-auto space-y-6 pt-4">
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex-1 h-1 rounded-full transition-colors" style={{
            background: i === step ? 'hsl(215 80% 45%)' : i < step ? 'hsl(215 80% 45%)' : 'var(--border)',
            opacity: i < step ? 0.4 : 1,
          }} />
        ))}
      </div>

      {/* Step 0: Inventory Audit */}
      {step === 0 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Inventory Audit</h2>
            </div>
            <p className="text-sm text-muted-foreground">Update your current stock levels.</p>
            {stocks.length === 0 && <p className="text-sm text-muted-foreground">No inventory items. Add some first.</p>}
            <div className="space-y-1">
              {stocks.map(s => (
                <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
                  <span className="flex-1 text-sm font-medium">{s.name}</span>
                  <Input type="number" value={s.current_stock} onChange={e => updateStock(s.id, Number(e.target.value))} className="w-20 text-center h-8" />
                  <span className="text-xs text-muted-foreground w-20 text-right">Optimal: {s.optimal_stock}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => router.push('/dashboard/inventory')}>Manage Items</Button>
              <Button className="flex-1" onClick={() => setStep(1)} disabled={stocks.length === 0}>
                Next <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Expenses */}
      {step === 1 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Expenses</h2>
            </div>
            <p className="text-sm text-muted-foreground">Log your daily purchases.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="Description" value={newExpense.desc} onChange={e => setNewExpense(p => ({ ...p, desc: e.target.value }))} />
              <div className="flex gap-2">
                <Input type="number" step="0.01" placeholder="Amount" value={newExpense.amount} onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))} className="w-full sm:w-28" />
                <Button size="sm" onClick={addExpense} disabled={!newExpense.desc || !newExpense.amount} className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {expenses.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-2">Today: RM{totalExpenses.toLocaleString()}</div>
                <div className="space-y-1">
                  {expenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-border/40 text-sm">
                      <span>{e.description}</span>
                      <span className="font-medium">RM{Number(e.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-1.5" />Back</Button>
              <Button className="flex-1" onClick={() => setStep(2)}>Next <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Sales */}
      {step === 2 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Sales</h2>
            </div>
            <p className="text-sm text-muted-foreground">Add each sales transaction by type and amount.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select options={saleTypes.map(t => ({ value: t, label: t }))} value={saleType} onChange={e => setSaleType(e.target.value)} />
              <div className="flex gap-2">
                <Input type="number" step="0.01" placeholder="Amount" value={saleAmount} onChange={e => setSaleAmount(e.target.value)} className="w-full sm:w-28" />
                <Button size="sm" onClick={addSale} disabled={!saleAmount || Number(saleAmount) <= 0} className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {sales.length > 0 ? (
              <div>
                <div className="space-y-1">
                  {sales.map((sale, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40 text-sm">
                      <span>{sale.type}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">RM{sale.amount.toLocaleString()}</span>
                        <button onClick={() => removeSale(i)} className="text-muted-foreground hover:text-destructive bg-transparent border-none cursor-pointer p-0"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-sm font-semibold mt-2">Total: RM{totalSales.toLocaleString()}</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No sales added yet.</p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1.5" />Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={sales.length === 0}>Next <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Final Summary</h2>
            </div>
            <p className="text-sm text-muted-foreground">Review and close the day.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Sales', value: `RM${totalSales.toLocaleString()}`, border: 'hsl(215 80% 45%)' },
                { label: 'Expenses', value: `RM${totalExpenses.toLocaleString()}`, border: 'hsl(32 90% 45%)' },
                { label: 'Net', value: `RM${net.toLocaleString()}`, border: 'hsl(142 60% 38%)', color: net >= 0 ? 'text-green' : 'text-red' },
                { label: 'Items Audited', value: String(stocks.length), border: 'hsl(215 10% 50%)' },
              ].map((item, i) => (
                <div key={i} className="p-3 sm:p-4 border rounded-[8px] bg-card border-t-[3px]" style={{ borderTopColor: item.border }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</div>
                  <div className={`text-base sm:text-lg font-bold mt-1 ${(item as any).color || ''}`}>{item.value}</div>
                </div>
              ))}
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={submitting}><ArrowLeft className="h-4 w-4 mr-1.5" />Back</Button>
              <Button className="flex-1" onClick={handleCloseDay} disabled={submitting}>
                {submitting ? 'Saving...' : 'Close Day'} <Check className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
