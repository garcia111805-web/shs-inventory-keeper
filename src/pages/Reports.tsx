import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { getStatus, getCategoryLabel, DEPARTMENTS } from '../types';
import { FileText, FileSpreadsheet, ClipboardList, Download, CheckCircle, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportRecord {
  name: string;
  date: string;
  type: 'PDF' | 'CSV';
}

const REPORT_CARDS = [
  {
    id: 'audit',
    title: 'Monthly Inventory Audit',
    format: 'PDF' as const,
    icon: <FileText size={24} />,
    color: '#0d1b6e',
    description: 'A formal summary of stock levels, consumption, and variances for the current month.',
  },
  {
    id: 'ledger',
    title: 'Full Transaction Ledger',
    format: 'CSV' as const,
    icon: <FileSpreadsheet size={24} />,
    color: '#15803d',
    description: 'A complete, spreadsheet-ready record of every restock, use, and borrow action.',
  },
  {
    id: 'accountability',
    title: 'Asset Accountability Report',
    format: 'PDF' as const,
    icon: <ClipboardList size={24} />,
    color: '#7c3aed',
    description: 'A list of all currently borrowed school assets and their expected return dates.',
  },
];

export default function Reports() {
  const { items, transactions } = useInventory();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [history, setHistory] = useState<ReportRecord[]>([]);

  const addToHistory = (name: string, type: 'PDF' | 'CSV') => {
    setHistory(prev => [
      { name, date: new Date().toISOString(), type },
      ...prev.slice(0, 9),
    ]);
  };

  // ─── PDF: Monthly Inventory Audit ───
  const generateAuditPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 20;
    let y = m;

    const totalItems = items.length;
    const inStock = items.filter(i => getStatus(i) === 'in-stock').length;
    const lowStock = items.filter(i => getStatus(i) === 'low-stock').length;
    const outOfStock = items.filter(i => getStatus(i) === 'out-of-stock').length;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Header
    doc.setDrawColor(13, 27, 110); doc.setLineWidth(1.5);
    doc.line(m, y, pw - m, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(13, 27, 110);
    doc.text('SUCAT SENIOR HIGH SCHOOL', pw / 2, y, { align: 'center' }); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(100);
    doc.text('City of Muntinlupa', pw / 2, y, { align: 'center' }); y += 10;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(13, 27, 110);
    doc.text('MONTHLY INVENTORY AUDIT REPORT', pw / 2, y, { align: 'center' }); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(80);
    doc.text(`Generated: ${dateStr} at ${timeStr}`, pw / 2, y, { align: 'center' }); y += 4;
    doc.setLineWidth(0.5); doc.line(m, y, pw - m, y); y += 10;

    // I. Executive Summary
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(13, 27, 110);
    doc.text('I. EXECUTIVE SUMMARY', m, y); y += 8;

    autoTable(doc, {
      startY: y, margin: { left: m, right: m },
      head: [['Metric', 'Count', 'Percentage']],
      body: [
        ['Total Inventory Items', String(totalItems), '100%'],
        ['In Stock', String(inStock), totalItems > 0 ? `${((inStock / totalItems) * 100).toFixed(1)}%` : '0%'],
        ['Low Stock', String(lowStock), totalItems > 0 ? `${((lowStock / totalItems) * 100).toFixed(1)}%` : '0%'],
        ['Out of Stock', String(outOfStock), totalItems > 0 ? `${((outOfStock / totalItems) * 100).toFixed(1)}%` : '0%'],
      ],
      headStyles: { fillColor: [13, 27, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      bodyStyles: { fontSize: 10, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 40, halign: 'center' } },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    // II. Category Breakdown
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(13, 27, 110);
    doc.text('II. INVENTORY BY CATEGORY', m, y); y += 8;

    const cats = (['cleaning', 'office', 'clinic'] as const).map(c => {
      const ci = items.filter(i => i.category === c);
      return [getCategoryLabel(c), String(ci.length), String(ci.filter(i => getStatus(i) === 'in-stock').length), String(ci.filter(i => getStatus(i) === 'low-stock').length), String(ci.filter(i => getStatus(i) === 'out-of-stock').length)];
    });

    autoTable(doc, {
      startY: y, margin: { left: m, right: m },
      head: [['Category', 'Total', 'In Stock', 'Low Stock', 'Out of Stock']],
      body: cats,
      headStyles: { fillColor: [13, 27, 110], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      bodyStyles: { fontSize: 10, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    // III. Critical Items
    const critical = items.filter(i => getStatus(i) !== 'in-stock').sort((a, b) => a.quantity - b.quantity);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(13, 27, 110);
    doc.text('III. ITEMS REQUIRING IMMEDIATE ACTION', m, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100);
    doc.text('Items flagged as Out of Stock or Low Stock requiring restocking.', m, y + 3); y += 9;

    if (critical.length === 0) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(21, 128, 61);
      doc.text('All items are adequately stocked. No action required.', m, y); y += 12;
    } else {
      autoTable(doc, {
        startY: y, margin: { left: m, right: m },
        head: [['#', 'Item Name', 'Category', 'Current Qty', 'Status']],
        body: critical.map((item, idx) => [String(idx + 1), item.name, getCategoryLabel(item.category), `${item.quantity} ${item.unit}`, getStatus(item) === 'out-of-stock' ? 'OUT OF STOCK' : 'LOW STOCK']),
        headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [254, 242, 242] },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 4: { fontStyle: 'bold' } },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 4) {
            data.cell.styles.textColor = data.cell.raw === 'OUT OF STOCK' ? [185, 28, 28] : [217, 119, 6];
          }
        },
        theme: 'grid',
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Signatures
    if (y > ph - 65) { doc.addPage(); y = m; }
    y = Math.max(y, ph - 60);
    doc.setDrawColor(180); doc.setLineWidth(0.3); doc.line(m, y, pw - m, y); y += 10;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(13, 27, 110);
    doc.text('IV. CERTIFICATION', m, y); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60);
    doc.text('This report has been prepared as an accurate representation of the current inventory status.', m, y); y += 16;

    const sw = (pw - m * 2) / 2 - 10;
    const sly = y + 15;
    doc.setDrawColor(40); doc.setLineWidth(0.4);
    doc.line(m, sly, m + sw, sly);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40);
    doc.text('Prepared by:', m, sly + 5);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(120);
    doc.text('Name / Designation / Date', m, sly + 10);

    const rx = m + sw + 20;
    doc.line(rx, sly, rx + sw, sly);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40);
    doc.text('Approved by:', rx, sly + 5);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(120);
    doc.text('Name / Designation / Date', rx, sly + 10);

    // Footer
    doc.setDrawColor(13, 27, 110); doc.setLineWidth(0.3); doc.line(m, ph - 12, pw - m, ph - 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(150);
    doc.text('SSHS Property & Inventory Management System — Confidential', pw / 2, ph - 8, { align: 'center' });

    doc.save(`SSHS_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    addToHistory('Monthly Inventory Audit', 'PDF');
  };

  // ─── CSV: Full Transaction Ledger ───
  const generateLedgerCSV = () => {
    const deptMap: Record<string, string> = {};
    DEPARTMENTS.forEach(d => { deptMap[d.value] = d.label; });

    const headers = ['Date', 'Type', 'Item Name', 'Category', 'Qty Change', 'New Stock', 'By', 'Department', 'Return Date', 'Notes'];
    const rows = transactions.map(tx => [
      new Date(tx.date).toLocaleString(),
      tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
      tx.itemName,
      getCategoryLabel(tx.category),
      String(tx.qtyChange),
      String(tx.newStock),
      tx.by,
      tx.department ? (deptMap[tx.department] || tx.department) : '',
      tx.returnDate || '',
      tx.notes || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SSHS_Transaction_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToHistory('Full Transaction Ledger', 'CSV');
  };

  // ─── PDF: Asset Accountability Report ───
  const generateAccountabilityPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 20;
    let y = m;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const deptMap: Record<string, string> = {};
    DEPARTMENTS.forEach(d => { deptMap[d.value] = d.label; });

    const borrowedTx = transactions.filter(tx => tx.type === 'borrow');

    // Header
    doc.setDrawColor(13, 27, 110); doc.setLineWidth(1.5);
    doc.line(m, y, pw - m, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(13, 27, 110);
    doc.text('SUCAT SENIOR HIGH SCHOOL', pw / 2, y, { align: 'center' }); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(100);
    doc.text('City of Muntinlupa', pw / 2, y, { align: 'center' }); y += 10;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(13, 27, 110);
    doc.text('ASSET ACCOUNTABILITY REPORT', pw / 2, y, { align: 'center' }); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(80);
    doc.text(`Generated: ${dateStr} at ${timeStr}`, pw / 2, y, { align: 'center' }); y += 4;
    doc.setLineWidth(0.5); doc.line(m, y, pw - m, y); y += 10;

    // Summary
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(13, 27, 110);
    doc.text('I. BORROWED ASSETS SUMMARY', m, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100);
    doc.text('All items currently checked out from school inventory for department or staff use.', m, y + 3); y += 10;

    if (borrowedTx.length === 0) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(11); doc.setTextColor(21, 128, 61);
      doc.text('No assets are currently borrowed. All items are accounted for.', m, y);
      y += 12;
    } else {
      autoTable(doc, {
        startY: y, margin: { left: m, right: m },
        head: [['#', 'Item', 'Category', 'Qty', 'Borrowed By', 'Department', 'Borrow Date', 'Return Date']],
        body: borrowedTx.map((tx, idx) => [
          String(idx + 1),
          tx.itemName,
          getCategoryLabel(tx.category),
          String(Math.abs(tx.qtyChange)),
          tx.by,
          tx.department ? (deptMap[tx.department] || tx.department) : '—',
          new Date(tx.date).toLocaleDateString(),
          tx.returnDate ? new Date(tx.returnDate).toLocaleDateString() : 'Not specified',
        ]),
        headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        columnStyles: { 0: { cellWidth: 8, halign: 'center' } },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 7) {
            if (data.cell.raw === 'Not specified') {
              data.cell.styles.textColor = [185, 28, 28];
              data.cell.styles.fontStyle = 'italic';
            }
          }
        },
        theme: 'grid',
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // Accountability statement
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(13, 27, 110);
    doc.text('II. ACCOUNTABILITY STATEMENT', m, y); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60);
    const stmt = 'All listed individuals are accountable for the borrowed assets and are expected to return them by the specified return dates. Failure to return assets on time must be reported to the Property Office.';
    const lines = doc.splitTextToSize(stmt, pw - m * 2);
    doc.text(lines, m, y); y += lines.length * 5 + 8;

    // Signatures
    if (y > ph - 60) { doc.addPage(); y = m; }
    y = Math.max(y, ph - 55);
    doc.setDrawColor(180); doc.setLineWidth(0.3); doc.line(m, y, pw - m, y); y += 10;
    const sw = (pw - m * 2) / 2 - 10;
    const sly = y + 15;
    doc.setDrawColor(40); doc.setLineWidth(0.4);
    doc.line(m, sly, m + sw, sly);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40);
    doc.text('Property Custodian:', m, sly + 5);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(120);
    doc.text('Name / Designation / Date', m, sly + 10);

    const rx2 = m + sw + 20;
    doc.line(rx2, sly, rx2 + sw, sly);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40);
    doc.text('School Principal:', rx2, sly + 5);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(120);
    doc.text('Name / Designation / Date', rx2, sly + 10);

    // Footer
    doc.setDrawColor(13, 27, 110); doc.setLineWidth(0.3); doc.line(m, ph - 12, pw - m, ph - 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(150);
    doc.text('SSHS Property & Inventory Management System — Confidential', pw / 2, ph - 8, { align: 'center' });

    doc.save(`SSHS_Accountability_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    addToHistory('Asset Accountability Report', 'PDF');
  };

  // ─── Dispatch ───
  const handleGenerate = (id: string) => {
    setGeneratingId(id);
    setTimeout(() => {
      try {
        if (id === 'audit') generateAuditPDF();
        else if (id === 'ledger') generateLedgerCSV();
        else if (id === 'accountability') generateAccountabilityPDF();
      } catch (err) {
        console.error('Generation error:', err);
      } finally {
        setGeneratingId(null);
      }
    }, 150);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Page header */}
      <div className="text-center py-2">
        <h2 className="font-heading font-bold" style={{ fontSize: 20, color: 'var(--heading-color)' }}>
          Document Generation Center
        </h2>
        <p className="font-body mt-1" style={{ fontSize: 13, color: 'var(--muted-text)' }}>
          Generate official reports and export records for the SSHS Property Office
        </p>
      </div>

      {/* Report cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORT_CARDS.map(card => {
          const isGenerating = generatingId === card.id;
          return (
            <div
              key={card.id}
              className="rounded-2xl panel-card flex flex-col"
              style={{ borderTop: `4px solid ${card.color}` }}
            >
              <div className="p-5 flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="rounded-xl flex items-center justify-center"
                    style={{ width: 44, height: 44, background: card.color, color: 'white' }}
                  >
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold" style={{ fontSize: 15, color: 'var(--heading-color)', lineHeight: 1.2 }}>
                      {card.title}
                    </h3>
                    <span className="font-body font-semibold px-2 py-0.5 rounded" style={{
                      fontSize: 10,
                      background: card.format === 'CSV' ? 'rgba(21,128,61,0.12)' : 'var(--location-bg)',
                      color: card.format === 'CSV' ? '#15803d' : 'var(--location-text)',
                    }}>
                      {card.format}
                    </span>
                  </div>
                </div>
                <p className="font-body" style={{ fontSize: 12, color: 'var(--muted-text)', lineHeight: 1.5 }}>
                  {card.description}
                </p>
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={() => handleGenerate(card.id)}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-body font-semibold transition-all hover:opacity-90"
                  style={{
                    fontSize: 13,
                    background: card.color,
                    color: 'white',
                    border: 'none',
                    cursor: isGenerating ? 'wait' : 'pointer',
                    opacity: isGenerating ? 0.7 : 1,
                    boxShadow: `0 3px 12px ${card.color}33`,
                  }}
                >
                  {isGenerating ? (
                    <><Loader2 size={16} className="animate-spin" /> Generating...</>
                  ) : (
                    <><Download size={16} /> Generate & Download</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Report history */}
      <div className="rounded-2xl p-5 panel-card">
        <h3 className="font-heading font-bold mb-3" style={{ fontSize: 15, color: 'var(--heading-color)' }}>
          Report History
        </h3>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
              {['REPORT NAME', 'DATE GENERATED', 'FORMAT', 'STATUS'].map(h => (
                <th key={h} className="text-left py-2 font-body uppercase" style={{ fontSize: 10, color: 'var(--muted-text)', fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-6 font-body" style={{ color: 'var(--muted-text)', fontSize: 13 }}>
                  No reports generated this session — select a report above to get started
                </td>
              </tr>
            ) : (
              history.map((rec, idx) => (
                <tr key={idx} className="table-row-hover" style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td className="py-2.5 font-body font-semibold" style={{ fontSize: 13, color: 'var(--fg-color)' }}>
                    {rec.name}
                  </td>
                  <td className="py-2.5 font-body" style={{ fontSize: 12, color: 'var(--muted-text)' }}>
                    {new Date(rec.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5">
                    <span className="font-body font-semibold px-2 py-0.5 rounded" style={{
                      fontSize: 10,
                      background: rec.type === 'CSV' ? 'rgba(21,128,61,0.12)' : 'var(--location-bg)',
                      color: rec.type === 'CSV' ? '#15803d' : 'var(--location-text)',
                    }}>
                      {rec.type}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="flex items-center gap-1 font-body font-semibold" style={{ fontSize: 12, color: '#15803d' }}>
                      <CheckCircle size={14} /> Downloaded
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
