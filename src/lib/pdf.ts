import jsPDF from 'jspdf';

const FONT = 'helvetica';
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const COLORS = {
  black: [0, 0, 0] as [number, number, number],
  gray: [120, 120, 120] as [number, number, number],
  light: [230, 230, 230] as [number, number, number],
  green: [46, 125, 50] as [number, number, number],
  red: [198, 40, 40] as [number, number, number],
};

function rect(doc: jsPDF, x: number, y: number, w: number, h: number, color?: [number, number, number]) {
  if (color) { doc.setFillColor(...color); doc.rect(x, y, w, h, 'F'); }
  else doc.rect(x, y, w, h);
}

export function generateReportPdf(report: any, includeInventory: boolean = true): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');

  // ── Header ──
  doc.setFont(FONT, 'bold');
  doc.setFontSize(18);
  doc.text('FINANCIAL COPILOT', MARGIN, 28);

  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray);
  doc.text('Daily Operations Report', MARGIN, 35);

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.black);
  doc.text(report.report_date, MARGIN, 44);

  rect(doc, MARGIN, 49, PAGE_W - 2 * MARGIN, 0.5, COLORS.light);

  let y = 58;

  // ── Summary Cards ──
  const cardW = (PAGE_W - 2 * MARGIN - 8) / 3;
  const cardH = 28;
  const sales = Number(report.total_sales) || 0;
  const expenses = Number(report.total_expenses) || 0;
  const net = Number(report.net_profit) || 0;

  const summaryItems = [
    { label: 'Total Sales', value: `RM ${sales.toLocaleString()}`, color: COLORS.black },
    { label: 'Total Expenses', value: `RM ${expenses.toLocaleString()}`, color: COLORS.black },
    { label: 'Net Profit', value: `RM ${net.toLocaleString()}`, color: net >= 0 ? COLORS.green : COLORS.red },
  ];

  summaryItems.forEach((item, i) => {
    const cx = MARGIN + i * (cardW + 4);
    rect(doc, cx, y, cardW, cardH, COLORS.light);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text(item.label, cx + 4, y + 10);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...item.color);
    doc.text(item.value, cx + 4, y + 22);
  });

  y += cardH + 12;

  // ── Sales Breakdown ──
  const items = report.sales_snapshot?.items;
  if (items && items.length > 0) {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.black);
    doc.text('Sales Breakdown', MARGIN, y);
    y += 6;

    const colX = [MARGIN, PAGE_W - MARGIN - 50];
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    doc.text('Type', colX[0], y);
    doc.text('Amount', colX[1], y, { align: 'right' });
    y += 2;
    rect(doc, MARGIN, y, PAGE_W - 2 * MARGIN, 0.3, COLORS.light);
    y += 5;

    doc.setTextColor(...COLORS.black);
    items.forEach((item: any) => {
      doc.text(item.type, colX[0], y);
      doc.text(`RM ${Number(item.amount).toLocaleString()}`, colX[1], y, { align: 'right' });
      y += 6;
    });

    rect(doc, MARGIN, y - 3, PAGE_W - 2 * MARGIN, 0.3, COLORS.light);
    doc.setFont(FONT, 'bold');
    doc.text('Total', colX[0], y + 2);
    doc.text(`RM ${sales.toLocaleString()}`, colX[1], y + 2, { align: 'right' });
    y += 12;
  }

  // ── Expenses Breakdown ──
  const expItems = report.expenses_snapshot;
  if (expItems && expItems.length > 0) {
    if (y > 200) { doc.addPage(); y = 30; }

    doc.setFont(FONT, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.black);
    doc.text('Expenses Breakdown', MARGIN, y);
    y += 6;

    const colX = [MARGIN, PAGE_W - MARGIN - 50];
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    doc.text('Description', colX[0], y);
    doc.text('Amount', colX[1], y, { align: 'right' });
    y += 2;
    rect(doc, MARGIN, y, PAGE_W - 2 * MARGIN, 0.3, COLORS.light);
    y += 5;

    doc.setTextColor(...COLORS.black);
    expItems.forEach((item: any) => {
      doc.text(item.description || item.note || 'Expense', colX[0], y);
      doc.text(`RM ${Number(item.amount).toLocaleString()}`, colX[1], y, { align: 'right' });
      y += 6;
    });

    rect(doc, MARGIN, y - 3, PAGE_W - 2 * MARGIN, 0.3, COLORS.light);
    doc.setFont(FONT, 'bold');
    doc.text('Total', colX[0], y + 2);
    doc.text(`RM ${expenses.toLocaleString()}`, colX[1], y + 2, { align: 'right' });
    y += 12;
  }

  // ── Inventory Snapshot (conditional) ──
  const inv = report.inventory_snapshot;
  if (includeInventory && inv && inv.length > 0) {
    if (y > 200) { doc.addPage(); y = 30; }

    doc.setFont(FONT, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.black);
    doc.text('Inventory Snapshot', MARGIN, y);
    y += 6;

    const colInv = [MARGIN, PAGE_W - MARGIN - 70, PAGE_W - MARGIN - 30];
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    doc.text('Item', colInv[0], y);
    doc.text('Stock', colInv[1], y);
    doc.text('Status', colInv[2], y);
    y += 2;
    rect(doc, MARGIN, y, PAGE_W - 2 * MARGIN, 0.3, COLORS.light);
    y += 5;

    doc.setTextColor(...COLORS.black);
    inv.forEach((item: any) => {
      const status = item.current_stock < item.optimal_stock ? 'Restock needed' : 'OK';
      doc.text(item.name, colInv[0], y);
      doc.text(`${item.current_stock} / ${item.optimal_stock} ${item.unit || ''}`, colInv[1], y);
      const [r1, g1, b1] = item.current_stock < item.optimal_stock ? COLORS.red : COLORS.green;
      doc.setTextColor(r1, g1, b1);
      doc.text(status, colInv[2], y);
      doc.setTextColor(...COLORS.black);
      y += 6;
    });
    y += 6;
  }

  // ── Footer ──
  if (y > PAGE_H - 30) { doc.addPage(); y = 30; }
  
  rect(doc, MARGIN, PAGE_H - 20, PAGE_W - 2 * MARGIN, 0.3, COLORS.light);
  doc.setFont(FONT, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.gray);
  const now = new Date();
  const ts = now.toLocaleString('en-MY', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Generated: ${ts} · Financial Copilot`, MARGIN, PAGE_H - 14);

  return doc;
}

export function downloadReportPdf(report: any, includeInventory: boolean = true) {
  const doc = generateReportPdf(report, includeInventory);
  doc.save(`report-${report.report_date}.pdf`);
}