'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { downloadReportPdf } from '@/lib/pdf';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, ChevronLeft, ChevronRight, Search, Plus, X, Loader2 } from 'lucide-react';
import JSZip from 'jszip';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBackfill, setShowBackfill] = useState(false);
  const [backfill, setBackfill] = useState({ date: '', sales: '', expenses: '', note: '' });
  const [backfillMsg, setBackfillMsg] = useState('');
  const [pdfReport, setPdfReport] = useState<any | null>(null);
  const [downloadingReceipts, setDownloadingReceipts] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const REPORTS_PER_PAGE = 7;
  const [page, setPage] = useState(1);

  const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  useEffect(() => {
    supabase.from('daily_reports').select('*').order('report_date', { ascending: false }).then(({ data }) => {
      if (data) setReports(data);
    });
  }, []);

  const loadDate = async (date: string) => {
    if (!date) return;
    setLoading(true);
    const { data } = await supabase.from('daily_reports').select('*').eq('report_date', date).maybeSingle();
    setSelectedReport(data || null);
    setLoading(false);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    loadDate(date);
  };

  const handleBackfill = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackfillMsg('');
    if (!backfill.date || !backfill.sales) { setBackfillMsg('Date and Sales are required.'); return; }

    const { data: existing } = await supabase.from('daily_reports').select('id').eq('report_date', backfill.date).maybeSingle();
    if (existing) { setBackfillMsg('A report already exists for this date.'); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBackfillMsg('Not authenticated.'); return; }

    const totalSales = Number(backfill.sales) || 0;
    const totalExpenses = Number(backfill.expenses) || 0;

    const { error } = await supabase.from('daily_reports').insert([{
      report_date: backfill.date,
      inventory_snapshot: [],
      expenses_snapshot: backfill.note ? [{ note: backfill.note }] : [],
      sales_snapshot: { historical: true, note: backfill.note },
      total_expenses: totalExpenses,
      total_sales: totalSales,
      net_profit: totalSales - totalExpenses,
      user_id: user.id,
    }]);

    if (error) { setBackfillMsg('Error: ' + error.message); return; }

    setBackfillMsg(`Report created for ${backfill.date}.`);
    setBackfill({ date: '', sales: '', expenses: '', note: '' });
    setShowBackfill(false);

    const { data } = await supabase.from('daily_reports').select('*').order('report_date', { ascending: false });
    if (data) setReports(data);
  };

  const promptPdf = (report: any) => setPdfReport(report);

  const downloadReceipts = async (report: any) => {
    const expenses = report.expenses_snapshot || [];
    const withReceipts = expenses.filter((e: any) => e.receipt_url);
    if (withReceipts.length === 0) return;

    setDownloadingReceipts(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`receipts-${report.report_date}`);

      for (const exp of withReceipts) {
        const path = exp.receipt_url.split('/public/receipts/')[1];
        if (!path) continue;
        const { data } = await supabase.storage.from('receipts').download(path);
        if (data) {
          const ext = path.split('.').pop() || 'jpg';
          const name = `${exp.description || 'receipt'}.${ext}`;
          folder?.file(name, data);
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipts-${report.report_date}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingReceipts(false);
    }
  };

  function groupedReports(all: any[]) {
    const groups: { key: string; label: string; reports: any[] }[] = [];
    all.forEach(r => {
      const d = new Date(r.report_date + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = `${monthLabels[d.getMonth()]} ${d.getFullYear()}`;
      const g = groups.find(g => g.key === key);
      if (g) g.reports.push(r);
      else groups.push({ key, label, reports: [r] });
    });
    return groups;
  }

  const groups = groupedReports(reports);

  function paginatedItems() {
    const items: ({ type: 'header'; label: string } | { type: 'report'; report: any })[] = [];
    groups.forEach(g => {
      let firstInGroup = true;
      g.reports.forEach(r => {
        if (firstInGroup) { items.push({ type: 'header', label: g.label }); firstInGroup = false; }
        items.push({ type: 'report', report: r });
      });
    });
    const pages: ({ type: 'header'; label: string } | { type: 'report'; report: any })[][] = [];
    let cur: ({ type: 'header'; label: string } | { type: 'report'; report: any })[] = [];
    let reportCount = 0;
    items.forEach(item => {
      if (item.type === 'header') {
        if (reportCount >= REPORTS_PER_PAGE && cur.length > 0) { pages.push(cur); cur = []; reportCount = 0; }
        cur.push(item);
      } else {
        if (reportCount >= REPORTS_PER_PAGE) { pages.push(cur); cur = []; reportCount = 0; }
        cur.push(item);
        reportCount++;
      }
    });
    if (cur.length > 0) pages.push(cur);
    return pages;
  }

  const pages = paginatedItems();
  const currentItems = pages[page - 1] || [];

  return (
    <div className="space-y-6 max-w-[640px]">
      {pdfReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setPdfReport(null)} />
          <div className="relative z-50 w-full max-w-sm rounded-[10px] border bg-card p-6 shadow-lg mx-4 text-center space-y-4">
            <p className="text-sm font-medium">Include inventory snapshot in the PDF?</p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => { downloadReportPdf(pdfReport, true); setPdfReport(null); }}>
                <Download className="h-4 w-4 mr-2" />Yes, include inventory
              </Button>
              <Button variant="outline" className="w-full" onClick={() => { downloadReportPdf(pdfReport, false); setPdfReport(null); }}>
                No, skip inventory
              </Button>
              <button onClick={() => setPdfReport(null)} className="text-xs text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer pt-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Daily Reports
        </h1>
        <Button variant="outline" size="sm" onClick={() => setShowBackfill(!showBackfill)}>
          {showBackfill ? <X className="h-3.5 w-3.5 mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
          {showBackfill ? 'Cancel' : 'Historical Entry'}
        </Button>
      </div>

      {showBackfill && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historical Entry</div>
            <p className="text-sm text-muted-foreground">Record a summary for a past date. This creates a closed report without item-level detail.</p>
            <form onSubmit={handleBackfill} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Date</label>
                  <Input type="date" value={backfill.date} onChange={e => setBackfill(p => ({ ...p, date: e.target.value }))} max={today} required />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Sales (RM)</label>
                  <Input type="number" step="0.01" value={backfill.sales} onChange={e => setBackfill(p => ({ ...p, sales: e.target.value }))} required />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Expenses (RM)</label>
                  <Input type="number" step="0.01" value={backfill.expenses} onChange={e => setBackfill(p => ({ ...p, expenses: e.target.value }))} />
                </div>
              </div>
              <Input placeholder="Optional note" value={backfill.note} onChange={e => setBackfill(p => ({ ...p, note: e.target.value }))} />
              <Button type="submit" className="w-full">Create Historical Report</Button>
              {backfillMsg && <div className={`text-sm ${backfillMsg.includes('Error') ? 'text-destructive' : 'text-green'}`}>{backfillMsg}</div>}
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5 space-y-3">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" />
            Look up a specific date
          </label>
          <div className="flex items-center gap-3">
            <Input type="date" value={selectedDate} onChange={handleDateChange} max={today} />
            {loading && <span className="text-xs text-muted-foreground">Searching...</span>}
          </div>
        </CardContent>
      </Card>

      {selectedDate && selectedReport === null && !loading && (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            No report for <strong>{selectedDate}</strong>.
          </CardContent>
        </Card>
      )}

      {selectedReport && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{selectedReport.report_date}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadReceipts(selectedReport)} disabled={downloadingReceipts}>
                {downloadingReceipts ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                Receipts
              </Button>
              <Button variant="outline" size="sm" onClick={() => promptPdf(selectedReport)}>
                <Download className="h-3.5 w-3.5 mr-1.5" />PDF
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Sales', value: `RM${Number(selectedReport.total_sales).toLocaleString()}`, border: 'hsl(215 80% 45%)' },
              { label: 'Expenses', value: `RM${Number(selectedReport.total_expenses).toLocaleString()}`, border: 'hsl(32 90% 45%)' },
              { label: 'Net', value: `RM${Number(selectedReport.net_profit).toLocaleString()}`, border: 'hsl(142 60% 38%)', textColor: Number(selectedReport.net_profit) >= 0 ? 'text-green' : 'text-red' },
            ].map((item, i) => (
              <Card key={i} className="border-t-[3px]" style={{ borderTopColor: item.border }}>
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</div>
                  <div className={`text-base sm:text-lg font-bold mt-1 ${(item as any).textColor || ''}`}>{item.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          {selectedReport.sales_snapshot?.historical && selectedReport.sales_snapshot?.note && (
            <p className="text-xs text-muted-foreground">Note: {selectedReport.sales_snapshot.note}</p>
          )}
          {selectedReport.sales_snapshot?.items?.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                Sales breakdown ({selectedReport.sales_snapshot.items.length} entries)
              </summary>
              <div className="mt-2 space-y-1">
                {selectedReport.sales_snapshot.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-border/40 text-sm">
                    <span>{item.type}</span>
                    <span className="font-medium">RM{Number(item.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
          {selectedReport.expenses_snapshot?.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                Expenses breakdown ({selectedReport.expenses_snapshot.length} entries)
              </summary>
              <div className="mt-2 space-y-1">
                {selectedReport.expenses_snapshot.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-border/40 text-sm">
                    <span>{item.description || item.note || `Expense ${i+1}`}</span>
                    <span className="font-medium">-RM{Number(item.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
          {selectedReport.inventory_snapshot?.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                Inventory snapshot ({selectedReport.inventory_snapshot.length} items)
              </summary>
              <div className="mt-2 space-y-1">
                {selectedReport.inventory_snapshot.map((item: any) => (
                  <div key={item.id} className="flex justify-between py-1.5 border-b border-border/40 text-sm">
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">{item.current_stock} / {item.optimal_stock} {item.unit}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      <Separator />

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">All Reports ({reports.length})</h2>
        {reports.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              No reports yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {currentItems.map((item, i) =>
              item.type === 'header' ? (
                <div key={`h-${i}`} className="text-xs font-bold uppercase tracking-wider text-muted-foreground pt-4 pb-1.5 border-b-2 border-primary/30">
                  {item.label}
                </div>
              ) : (
                <Card
                  key={item.report.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => { setSelectedDate(item.report.report_date); setSelectedReport(item.report); }}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">
                        {item.report.report_date}
                        {item.report.report_date === today && <Badge variant="success" className="ml-2 text-[10px] px-1.5 py-0">Today</Badge>}
                        {item.report.sales_snapshot?.historical && <Badge variant="warning" className="ml-2 text-[10px] px-1.5 py-0">Historical</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Sales: RM{Number(item.report.total_sales).toLocaleString()} · Net: <span className={Number(item.report.net_profit) >= 0 ? 'text-green font-medium' : 'text-red font-medium'}>
                          RM{Number(item.report.net_profit).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); downloadReceipts(item.report); }}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); promptPdf(item.report); }}>
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}
        {pages.length > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {page} of {pages.length}</span>
            <Button variant="outline" size="sm" disabled={page >= pages.length} onClick={() => setPage(p => p + 1)}>
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
