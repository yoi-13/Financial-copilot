'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { Database } from './database.types';

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}

// ── Inventory ──

export async function addInventory(data: { name: string; unit: string; optimal_stock: number; current_stock: number }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('inventory_items').insert({ ...data, user_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/inventory');
}

export async function updateInventory(id: string, data: { name: string; unit: string; optimal_stock: number; current_stock: number }) {
  const supabase = await createClient();
  const { error } = await supabase.from('inventory_items').update(data).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/inventory');
}

export async function deleteInventory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('inventory_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/inventory');
}

// ── Expenses ──

export async function addExpense(data: { description: string; amount: number; receipt_url?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('expenses').insert({ ...data, user_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/expenses');
}

export async function updateExpense(id: string, data: { description: string; amount: number }) {
  const supabase = await createClient();
  const { error } = await supabase.from('expenses').update(data).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/expenses');
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/expenses');
}

// ── Closing / Reports ──

export async function closeDay(data: {
  inventory_snapshot: Database['public']['Tables']['daily_reports']['Insert']['inventory_snapshot'];
  expenses_snapshot: Database['public']['Tables']['daily_reports']['Insert']['expenses_snapshot'];
  sales_snapshot: Database['public']['Tables']['daily_reports']['Insert']['sales_snapshot'];
  total_expenses: number;
  total_sales: number;
  net_profit: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabase.from('daily_reports').select('id').eq('report_date', today).maybeSingle();
  if (existing) throw new Error('This day is already closed');

  const { error } = await supabase.from('daily_reports').insert([{
    report_date: today,
    ...data,
    user_id: user.id,
  }]);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/closing');
  revalidatePath('/dashboard/reports');
}

export async function createHistoricalReport(data: {
  report_date: string;
  total_sales: number;
  total_expenses: number;
  note?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing } = await supabase.from('daily_reports').select('id').eq('report_date', data.report_date).maybeSingle();
  if (existing) throw new Error('A report already exists for this date');

  const totalSales = data.total_sales;
  const totalExpenses = data.total_expenses;

  const { error } = await supabase.from('daily_reports').insert([{
    report_date: data.report_date,
    inventory_snapshot: [],
    expenses_snapshot: data.note ? [{ note: data.note }] : [],
    sales_snapshot: { historical: true, note: data.note },
    total_expenses: totalExpenses,
    total_sales: totalSales,
    net_profit: totalSales - totalExpenses,
    user_id: user.id,
  }]);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/reports');
}
