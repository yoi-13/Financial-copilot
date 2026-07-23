'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Plus, Pencil, Trash2, X, Check, PackagePlus } from 'lucide-react';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('packs');
  const [optimal, setOptimal] = useState('');
  const [current, setCurrent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('inventory_items').select('*').order('name');
    if (data) setItems(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await supabase.from('inventory_items').update({ name, unit, optimal_stock: Number(optimal), current_stock: Number(current) }).eq('id', editingId);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('inventory_items').insert([{ name, unit, optimal_stock: Number(optimal), current_stock: Number(current), user_id: user?.id }]);
    }
    resetForm();
    load();
  };

  const edit = (item: any) => {
    setName(item.name); setUnit(item.unit); setOptimal(String(item.optimal_stock)); setCurrent(String(item.current_stock));
    setEditingId(item.id); setShowForm(true);
  };

  const remove = async (id: string) => {
    await supabase.from('inventory_items').delete().eq('id', id);
    load();
  };

  const handleRestock = async (id: string, currentStock: number) => {
    const qty = Number(restockQty);
    if (!qty || qty <= 0) return;
    await supabase.from('inventory_items').update({ current_stock: currentStock + qty }).eq('id', id);
    setRestockingId(null);
    setRestockQty('');
    load();
  };

  const resetForm = () => {
    setName(''); setUnit('packs'); setOptimal(''); setCurrent(''); setEditingId(null); setShowForm(false);
  };

  return (
    <div className="space-y-6 max-w-[600px]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Inventory
        </h1>
        <Button variant="outline" size="sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? <X className="h-3.5 w-3.5 mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
          {showForm ? 'Cancel' : 'Add Item'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{editingId ? 'Edit Item' : 'New Item'}</div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input placeholder="Item name" value={name} onChange={e => setName(e.target.value)} required />
                <Input placeholder="Unit (e.g. packs)" value={unit} onChange={e => setUnit(e.target.value)} required />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input type="number" placeholder="Optimal stock" value={optimal} onChange={e => setOptimal(e.target.value)} required />
                <Input type="number" placeholder="Current stock" value={current} onChange={e => setCurrent(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full">{editingId ? 'Update Item' : 'Add Item'}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            No inventory items yet. Add your first item above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <Card key={item.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-3 sm:p-4">
                {restockingId === item.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Qty to add"
                      value={restockQty}
                      onChange={e => setRestockQty(e.target.value)}
                      className="flex-1 h-8 text-sm text-center"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleRestock(item.id, item.current_stock); }}
                    />
                    <Button variant="default" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => handleRestock(item.id, item.current_stock)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => { setRestockingId(null); setRestockQty(''); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span>{item.current_stock} / {item.optimal_stock} {item.unit}</span>
                        {item.current_stock < item.optimal_stock && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Needs restock</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Restock" onClick={() => { setRestockingId(item.id); setRestockQty(''); }}>
                        <PackagePlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit" onClick={() => edit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" title="Delete" onClick={() => remove(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
