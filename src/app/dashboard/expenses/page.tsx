'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Receipt, Plus, Pencil, Trash2, X, Save, Ban, FileText } from 'lucide-react';

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [dayClosed, setDayClosed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const init = async () => {
      const { data: report } = await supabase.from('daily_reports').select('id').eq('report_date', today).maybeSingle();
      if (report) setDayClosed(true);
      loadExpenses();
    };
    init();
  }, [today]);

  const loadExpenses = async () => {
    const { data } = await supabase.from('expenses').select('*').eq('expense_date', today).order('created_at', { ascending: false });
    if (data) setExpenses(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dayClosed) { alert('Today is already closed.'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    let receiptUrl = '';
    if (receipt) {
      const fileExt = receipt.name.split('.').pop();
      const filePath = `${user?.id}/${Date.now()}.${fileExt}`;
      const { data: upload } = await supabase.storage.from('receipts').upload(filePath, receipt);
      if (upload) {
        const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(filePath);
        receiptUrl = publicUrl;
      }
    }
    await supabase.from('expenses').insert([{
      description: desc, amount: Number(amount), receipt_url: receiptUrl, user_id: user?.id,
    }]);
    setDesc(''); setAmount(''); setReceipt(null); setShowForm(false);
    loadExpenses();
  };

  const startEdit = (exp: any) => {
    setEditingId(exp.id);
    setEditDesc(exp.description);
    setEditAmount(String(exp.amount));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDesc('');
    setEditAmount('');
  };

  const saveEdit = async (id: string) => {
    if (dayClosed) { alert('Cannot edit. Today is already closed.'); return; }
    await supabase.from('expenses').update({ description: editDesc, amount: Number(editAmount) }).eq('id', id);
    cancelEdit();
    loadExpenses();
  };

  const remove = async (id: string) => {
    if (dayClosed) { alert('Cannot delete. Today is already closed.'); return; }
    if (!confirm('Delete this expense?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    loadExpenses();
  };

  const total = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6 max-w-[600px]">
      {dayClosed && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] text-sm font-medium" style={{ background: 'hsl(142 60% 95%)', color: 'hsl(142 60% 38%)', border: '1px solid hsl(142 60% 85%)' }}>
          <Ban className="h-4 w-4" />
          Today ({today}) is closed. Expenses are locked.
          <a href="/dashboard/reports" className="ml-auto underline font-semibold">View report</a>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Today's Expenses
        </h1>
        {!dayClosed && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-3.5 w-3.5 mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
            {showForm ? 'Cancel' : 'Add Expense'}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] text-sm font-medium border bg-card border-l-[3px]" style={{ borderLeftColor: 'hsl(215 80% 45%)' }}>
        <FileText className="h-4 w-4 text-muted-foreground" />
        Total: <span className="font-bold">RM{total.toLocaleString()}</span>
      </div>

      {showForm && !dayClosed && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Expense</div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} required />
              <div className="flex flex-col sm:flex-row gap-3">
                <Input type="number" step="0.01" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} required />
                <Input type="file" accept="image/*" onChange={e => setReceipt(e.target.files?.[0] || null)} className="file:text-xs" />
              </div>
              <Button type="submit" className="w-full">Save Expense</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <Receipt className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            No expenses recorded today.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map(exp => (
            <Card key={exp.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                {editingId === exp.id ? (
                  <div className="flex items-center gap-2">
                    <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="flex-1" />
                    <Input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="w-24" />
                    <Button size="sm" onClick={() => saveEdit(exp.id)}><Save className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{exp.description}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {exp.receipt_url ? <><span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5 align-middle" />Receipt attached</> : 'No receipt'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">RM{Number(exp.amount).toLocaleString()}</span>
                      {!dayClosed && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(exp)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => remove(exp.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
