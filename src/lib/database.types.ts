export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      inventory_items: {
        Row: {
          id: string;
          name: string;
          unit: string;
          optimal_stock: number;
          current_stock: number;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          unit?: string;
          optimal_stock?: number;
          current_stock?: number;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          id?: string;
          name?: string;
          unit?: string;
          optimal_stock?: number;
          current_stock?: number;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          description: string;
          amount: number;
          receipt_url: string | null;
          expense_date: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          description: string;
          amount: number;
          receipt_url?: string | null;
          expense_date?: string;
          created_at?: string;
          user_id?: string;
        };
        Update: {
          id?: string;
          description?: string;
          amount?: number;
          receipt_url?: string | null;
          expense_date?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      daily_sales: {
        Row: {
          id: string;
          cash_sales: number;
          card_sales: number;
          sale_date: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          cash_sales?: number;
          card_sales?: number;
          sale_date?: string;
          created_at?: string;
          user_id?: string;
        };
        Update: {
          id?: string;
          cash_sales?: number;
          card_sales?: number;
          sale_date?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      daily_reports: {
        Row: {
          id: string;
          report_date: string;
          inventory_snapshot: Json;
          expenses_snapshot: Json;
          sales_snapshot: Json | null;
          total_expenses: number;
          total_sales: number;
          net_profit: number;
          report_pdf_url: string | null;
          receipts_zip_url: string | null;
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          report_date?: string;
          inventory_snapshot?: Json;
          expenses_snapshot?: Json;
          sales_snapshot?: Json | null;
          total_expenses?: number;
          total_sales?: number;
          net_profit?: number;
          report_pdf_url?: string | null;
          receipts_zip_url?: string | null;
          created_at?: string;
          user_id?: string;
        };
        Update: {
          id?: string;
          report_date?: string;
          inventory_snapshot?: Json;
          expenses_snapshot?: Json;
          sales_snapshot?: Json | null;
          total_expenses?: number;
          total_sales?: number;
          net_profit?: number;
          report_pdf_url?: string | null;
          receipts_zip_url?: string | null;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InventoryItem = Tables<'inventory_items'>;
export type Expense = Tables<'expenses'>;
export type DailySale = Tables<'daily_sales'>;
export type DailyReport = Tables<'daily_reports'>;

export type ExpenseSnapshot = {
  id: string;
  description: string;
  amount: number;
  receipt_url: string | null;
  expense_date: string;
  note?: string;
};

export type SalesSnapshot = {
  items: { type: string; amount: number }[];
  historical?: boolean;
  note?: string;
};
