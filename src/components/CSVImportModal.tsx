import { useState, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { Category, getCategoryColor } from '../types';
import ModalOverlay from './ModalOverlay';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatItemName } from '../lib/utils';

interface Props {
  onClose: () => void;
}

interface ParsedRow {
  name: string;
  category: Category;
  unit: string;
  quantity: number;
  lowStockThreshold: number;
  notes: string;
  location?: string;
  isConsumable: boolean;
  isDuplicate?: boolean;
}

// Normalize a header string to a known key
function normalizeHeader(h: string): string {
  const s = h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (['name', 'itemname', 'item', 'description', 'product'].includes(s)) return 'name';
  if (['category', 'cat', 'type', 'group'].includes(s)) return 'category';
  if (['unit', 'uom', 'unitofmeasure', 'units'].includes(s)) return 'unit';
  if (['quantity', 'qty', 'stock', 'count', 'amount'].includes(s)) return 'quantity';
  if (['threshold', 'lowstock', 'lowstockthreshold', 'minstocklevel', 'reorderlevel', 'low'].includes(s)) return 'threshold';
  if (['notes', 'note', 'remarks', 'comment', 'comments', 'description'].includes(s)) return 'notes';
  if (['location', 'loc', 'room', 'storage', 'area', 'place', 'cabinet', 'storagetype', 'storagelocation'].includes(s)) return 'location';
  if (['consumable', 'isconsumable', 'type', 'classification', 'asset'].includes(s)) return 'consumable';
  return s;
}

// Normalize category string to our enum
function normalizeCategory(raw: string): Category {
  const s = raw.toLowerCase().trim();
  if (s.includes('clean') || s.includes('janitor')) return 'cleaning';
  if (s.includes('office') || s.includes('admin') || s.includes('paper')) return 'office';
  if (s.includes('clinic') || s.includes('medic') || s.includes('health') || s.includes('first aid')) return 'clinic';
  return 'office'; // default fallback
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Simple CSV parser handling quoted fields
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

export default function CSVImportModal({ onClose }: Props) {
  const { items, addItem, updateItem, addTransaction, showToast, wipeAllItems } = useInventory();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [updated, setUpdated] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [failed, setFailed] = useState(0);
  const [done, setDone] = useState(false);
  const [updateMode, setUpdateMode] = useState(true);
  const [changedItems, setChangedItems] = useState<{ name: string; oldQty: number; newQty: number; diff: number; category: string }[]>([]);
  const [addedItems, setAddedItems] = useState<{ name: string; qty: number; category: string }[]>([]);
  const [wiping, setWiping] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  // Scan all rows to find the header row (the one with a 'Name' column)
  const processAllRows = (allRows: string[][]) => {
    // Check for Sucat Elementary School specific format
    const headerStr = allRows[0]?.[0]?.toUpperCase() || '';
    const isSucatFormat = headerStr.includes('SUCAT ELEMENTARY') || headerStr.includes('SUCAT SENIOR HIGH SCHOOL');
    
    if (isSucatFormat) {
      const existingNames = new Set(items.map(i => formatItemName(i.name).toLowerCase()));
      const parsedItems: ParsedRow[] = [];
      
      // Start from Row 6 (index 6) based on inspection
      // Col Mapping: 0,1 (Cleaning In), 2,3 (Cleaning Out), 4,5 (Office In), 6,7 (Office Out), 8,9 (Clinic In), 10,11 (Clinic Out)
      const sections: { col: number, cat: Category }[] = [
        { col: 0, cat: 'cleaning' }, { col: 2, cat: 'cleaning' },
        { col: 4, cat: 'office' }, { col: 6, cat: 'office' },
        { col: 8, cat: 'clinic' }, { col: 10, cat: 'clinic' }
      ];

      for (let i = 6; i < allRows.length; i++) {
        const row = allRows[i];
        sections.forEach(sec => {
          const rawName = row[sec.col]?.trim();
          const qtyVal = row[sec.col + 1];
          if (rawName && rawName !== 'Materials' && rawName !== '') {
            const formattedName = formatItemName(rawName);
            const nameLower = formattedName.toLowerCase();
            const isDuplicate = existingNames.has(nameLower);
            
            parsedItems.push({
              name: formattedName,
              category: sec.cat,
              unit: 'PCS',
              quantity: Math.max(0, parseInt(qtyVal) || 0),
              lowStockThreshold: 3,
              notes: '',
              location: undefined,
              isConsumable: true,
              isDuplicate
            });
            existingNames.add(nameLower);
          }
        });
      }

      if (parsedItems.length === 0) {
        setError('Detected Sucat Elementary School format but found no items starting from Row 7.');
        return;
      }

      setParsed(parsedItems);
      return;
    }

    let headerRowIdx = -1;
    let nameIdx = -1;

    // Scan up to 20 rows looking for a header row
    for (let i = 0; i < Math.min(allRows.length, 20); i++) {
      const mapped = allRows[i].map(normalizeHeader);
      const idx = mapped.indexOf('name');
      if (idx !== -1) {
        headerRowIdx = i;
        nameIdx = idx;
        break;
      }
    }

    if (headerRowIdx === -1 || nameIdx === -1) {
      const firstRowPreview = allRows[0]?.slice(0, 5).join(', ') || '(empty)';
      setError(`Could not find a "Name" column. First row: ${firstRowPreview}`);
      return;
    }

    const headers = allRows[headerRowIdx];
    const dataRows = allRows.slice(headerRowIdx + 1);
    const mapped = headers.map(normalizeHeader);
    const catIdx = mapped.indexOf('category');
    const unitIdx = mapped.indexOf('unit');
    const qtyIdx = mapped.indexOf('quantity');
    const threshIdx = mapped.indexOf('threshold');
    const notesIdx = mapped.indexOf('notes');
    const locIdx = mapped.indexOf('location');
    const consIdx = mapped.indexOf('consumable');

    const existingNames = new Set(items.map(i => formatItemName(i.name).toLowerCase()));

    const parsedItems: ParsedRow[] = dataRows
      .filter(row => row[nameIdx]?.trim())
      .map(row => {
        const rawName = row[nameIdx]?.trim() || '';
        const formattedName = formatItemName(rawName);
        const nameLower = formattedName.toLowerCase();
        const isDuplicate = existingNames.has(nameLower);
        
        existingNames.add(nameLower);

        const consRaw = consIdx >= 0 ? row[consIdx]?.toLowerCase() || '' : '';
        const isConsumable = consRaw.includes('asset') || consRaw.includes('non') || consRaw === 'false' || consRaw === 'no' ? false : true;

        return {
          name: formattedName,
          category: catIdx >= 0 ? normalizeCategory(row[catIdx] || '') : 'office',
          unit: unitIdx >= 0 ? (row[unitIdx]?.trim().toUpperCase() || 'PCS') : 'PCS',
          quantity: qtyIdx >= 0 ? Math.max(0, parseInt(row[qtyIdx]) || 0) : 0,
          lowStockThreshold: threshIdx >= 0 ? Math.max(0, parseInt(row[threshIdx]) || 3) : 3,
          notes: notesIdx >= 0 ? (row[notesIdx]?.trim() || '') : '',
          location: locIdx >= 0 ? (row[locIdx]?.trim().toUpperCase() || undefined) : undefined,
          isConsumable,
          isDuplicate,
        };
      });

    if (parsedItems.length === 0) {
      setError('No valid items found in the file.');
      return;
    }

    setParsed(parsedItems);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setParsed([]);

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isExcel = ['xlsx', 'xls'].includes(ext || '');

    if (isExcel) {
      // Read as Excel
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          if (json.length < 2) {
            setError('Excel file appears empty or has no data rows.');
            return;
          }

          const allRows = json.map(row => row.map(String));
          processAllRows(allRows);
        } catch {
          setError('Failed to parse Excel file. Please check the format.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Read as CSV
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const { headers, rows } = parseCSV(text);

          if (headers.length === 0 || rows.length === 0) {
            setError('CSV file appears empty or has no data rows.');
            return;
          }

          processAllRows([headers, ...rows]);
        } catch {
          setError('Failed to parse CSV file. Please check the format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const newItems = parsed.filter(r => !r.isDuplicate);
  const duplicateCount = parsed.filter(r => r.isDuplicate).length;
  const totalToProcess = updateMode ? parsed.length : newItems.length;

  const handleImport = async () => {
    setImporting(true);
    setImported(0);
    setUpdated(0);
    setSkipped(0);
    setFailed(0);
    setChangedItems([]);
    setAddedItems([]);

    let successCount = 0;
    let updateCount = 0;
    let skipCount = 0;
    let failCount = 0;
    const changedLog: { name: string; oldQty: number; newQty: number; diff: number; category: string }[] = [];
    const addedLog: { name: string; qty: number; category: string }[] = [];

    for (const row of parsed) {
      if (row.isDuplicate) {
        if (updateMode) {
          // Find the existing item by name (case-insensitive)
          const existing = items.find(
            i => i.name.toLowerCase().trim() === row.name.toLowerCase().trim()
          );
          if (existing) {
            // Smart Check: Only update if something actually changed
            const hasChanged = 
              existing.category !== row.category ||
              existing.unit !== row.unit ||
              existing.quantity !== row.quantity ||
              existing.location !== (row.location || undefined) ||
              existing.isConsumable !== row.isConsumable ||
              (row.notes && existing.notes !== row.notes);

            if (!hasChanged) {
              skipCount++;
              setSkipped(skipCount);
              continue;
            }

            try {
              await updateItem({
                ...existing,
                name: row.name,
                category: row.category,
                unit: row.unit,
                quantity: row.quantity,
                lowStockThreshold: row.lowStockThreshold,
                notes: row.notes || existing.notes,
                location: row.location || existing.location,
                isConsumable: row.isConsumable,
              });
              // Log the sync as a transaction so it appears in the Transaction Log
              const qtyDiff = row.quantity - existing.quantity;
              // Only add to "What Changed" list if qty actually changed
              if (qtyDiff !== 0) {
                changedLog.push({ name: row.name, oldQty: existing.quantity, newQty: row.quantity, diff: qtyDiff, category: row.category });
                setChangedItems([...changedLog]);
                try {
                  await addTransaction({
                    itemId: existing.id,
                    itemName: row.name,
                    category: row.category,
                    type: qtyDiff > 0 ? 'restock' : 'use',
                    qtyChange: qtyDiff,
                    newStock: row.quantity,
                    by: user?.fullName || 'System',
                    notes: `Data Import / Smart Sync`,
                    date: new Date().toISOString(),
                  });
                } catch { /* non-blocking */ }
              }
              updateCount++;
              setUpdated(updateCount);
            } catch {
              failCount++;
              setFailed(failCount);
            }
          }
        } else {
          skipCount++;
          setSkipped(skipCount);
        }
        continue;
      }
      try {
        await addItem({
          name: row.name,
          category: row.category,
          unit: row.unit,
          quantity: row.quantity,
          lowStockThreshold: row.lowStockThreshold,
          notes: row.notes,
          location: row.location || undefined,
          isConsumable: row.isConsumable,
        });
        addedLog.push({ name: row.name, qty: row.quantity, category: row.category });
        setAddedItems([...addedLog]);
        successCount++;
        setImported(successCount);
      } catch {
        failCount++;
        setFailed(failCount);
      }
    }

    setImporting(false);
    setDone(true);
    const parts: string[] = [];
    if (successCount > 0) parts.push(`${successCount} added`);
    if (updateCount > 0) parts.push(`${updateCount} updated`);
    if (skipCount > 0) parts.push(`${skipCount} skipped`);
    if (failCount > 0) parts.push(`${failCount} failed`);
    showToast(parts.join(' · ') || 'Nothing to import', failCount > 0 ? 'warning' : 'success');
  };


  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-xl flex items-center justify-center" style={{ width: 36, height: 36, background: '#0d1b6e' }}>
          <FileSpreadsheet size={18} color="white" />
        </div>
        <h3 className="font-heading font-bold" style={{ fontSize: 18, color: 'var(--heading-color)' }}>
          Import Data from File
        </h3>
      </div>

      {!done ? (
        <>
          {/* ── Fresh Start / Wipe Section ── */}
          <div
            className="rounded-xl p-4 mb-4"
            style={{ background: 'rgba(185,28,28,0.06)', border: '1px solid rgba(185,28,28,0.2)' }}
          >
            <p className="font-body font-semibold mb-1" style={{ fontSize: 13, color: '#b91c1c' }}>
              🗑️ Fresh Start — Clear All Existing Items
            </p>
            <p className="font-body mb-3" style={{ fontSize: 12, color: 'var(--muted-text)' }}>
              Use this if you want to replace the current inventory completely with your new file.
              This will <strong>permanently delete all items and transactions</strong> before you import.
              Skip this step if you just want to add new items on top of what's already here.
            </p>

            {!confirmWipe ? (
              <button
                onClick={() => setConfirmWipe(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-body font-semibold transition-all hover:opacity-80"
                style={{ fontSize: 13, background: '#b91c1c', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                🗑️ Clear Everything &amp; Start Fresh
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="font-body font-semibold" style={{ fontSize: 13, color: '#b91c1c' }}>
                  ⚠️ Are you sure? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={wiping}
                    onClick={async () => {
                      setWiping(true);
                      try {
                        await wipeAllItems();
                        setParsed([]);
                        setFileName('');
                        showToast('✅ All items cleared. You can now import your fresh data.', 'success');
                        setConfirmWipe(false);
                      } catch {
                        showToast('Failed to clear items. Please try again.', 'error');
                      } finally {
                        setWiping(false);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-body font-semibold transition-all"
                    style={{ fontSize: 13, background: '#b91c1c', color: 'white', border: 'none', cursor: wiping ? 'not-allowed' : 'pointer', opacity: wiping ? 0.6 : 1 }}
                  >
                    {wiping ? <Loader2 size={14} className="animate-spin" /> : '✓'} Yes, Clear Everything
                  </button>
                  <button
                    onClick={() => setConfirmWipe(false)}
                    className="px-4 py-2 rounded-lg font-body font-semibold transition-all hover:opacity-80"
                    style={{ fontSize: 13, background: 'var(--input-bg)', color: 'var(--fg-color)', border: '1px solid var(--card-border)', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            className="rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all hover:opacity-90"
            style={{
              border: '2px dashed var(--card-border)',
              background: 'var(--input-bg)',
            }}
          >
            <Upload size={28} style={{ color: 'var(--muted-text)' }} />
            <span className="font-body font-semibold" style={{ fontSize: 14, color: 'var(--fg-color)' }}>
              {fileName || 'Click to select CSV or Excel file'}
            </span>
            <span className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>
              Supports .csv, .xlsx, .xls — Columns: Name (required), Category, Unit, Quantity, Location
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={handleFile}
              className="hidden"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-xl" style={{ background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.2)' }}>
              <AlertTriangle size={16} color="#b91c1c" className="flex-shrink-0 mt-0.5" />
              <span className="font-body" style={{ fontSize: 12, color: '#b91c1c', wordBreak: 'break-word' }}>{error}</span>
            </div>
          )}

          {/* Smart Sync toggle */}
          {parsed.length > 0 && duplicateCount > 0 && (
            <div
              className="flex items-center gap-3 mt-3 p-3 rounded-xl cursor-pointer select-none"
              style={{ background: updateMode ? 'rgba(21,128,61,0.08)' : 'var(--input-bg)', border: `1px solid ${updateMode ? 'rgba(21,128,61,0.25)' : 'var(--card-border)'}`, transition: 'all 0.2s' }}
              onClick={() => setUpdateMode(m => !m)}
            >
              {/* Toggle pill */}
              <div
                className="relative flex-shrink-0 rounded-full transition-all"
                style={{ width: 36, height: 20, background: updateMode ? '#15803d' : 'var(--card-border)', transition: 'background 0.2s' }}
              >
                <div
                  className="absolute top-1 rounded-full bg-white transition-all"
                  style={{ width: 12, height: 12, left: updateMode ? 20 : 4, transition: 'left 0.2s' }}
                />
              </div>
              <div>
                <p className="font-body font-semibold" style={{ fontSize: 13, color: 'var(--fg-color)' }}>
                  Smart Sync & Merge
                </p>
                <p className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>
                  {updateMode
                    ? `Automatically detects changes and updates existing items. New items will be added.`
                    : `Only add new items. Existing items will be skipped.`}
                </p>
              </div>
            </div>
          )}

          {/* Preview table */}
          {parsed.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-body font-semibold" style={{ fontSize: 13, color: 'var(--fg-color)' }}>
                  Preview — {newItems.length} new
                  {duplicateCount > 0 && (
                    <span style={{ color: updateMode ? '#0d1b6e' : '#d97706' }}>
                      {' · '}{duplicateCount} {updateMode ? 'will update' : 'will skip'}
                    </span>
                  )}
                </span>
                <span className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>
                  Showing first {Math.min(parsed.length, 8)}
                </span>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)', maxHeight: 220, overflowY: 'auto' }}>
                <table className="w-full" style={{ fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--table-header-bg)' }}>
                      {['Name', 'Category', 'Unit', 'Qty', 'Threshold', 'Location'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-body uppercase" style={{ fontSize: 10, color: 'var(--muted-text)', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 8).map((row, idx) => (
                      <tr key={idx} style={{
                        borderBottom: '1px solid var(--card-border)',
                        opacity: row.isDuplicate && !updateMode ? 0.45 : 1,
                        background: row.isDuplicate
                          ? updateMode ? 'rgba(13,27,110,0.06)' : 'rgba(217,119,6,0.08)'
                          : undefined,
                      }}>
                        <td className="px-3 py-1.5 font-body font-semibold" style={{ color: 'var(--fg-color)' }}>
                          {row.name}
                          {row.isDuplicate && (
                            <span
                              className="font-body ml-1.5 px-1.5 py-0.5 rounded"
                              style={{
                                fontSize: 9,
                                background: updateMode ? 'rgba(13,27,110,0.15)' : 'rgba(217,119,6,0.15)',
                                color: updateMode ? '#0d1b6e' : '#d97706',
                              }}
                            >
                              {updateMode ? 'will update' : 'skip'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="font-body font-semibold px-1.5 py-0.5 rounded text-white" style={{ fontSize: 10, background: getCategoryColor(row.category) }}>
                            {row.category}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-body" style={{ color: 'var(--muted-text)' }}>{row.unit}</td>
                        <td className="px-3 py-1.5 font-body font-bold" style={{ color: 'var(--fg-color)' }}>{row.quantity}</td>
                        <td className="px-3 py-1.5 font-body" style={{ color: 'var(--muted-text)' }}>{row.lowStockThreshold}</td>
                        <td className="px-3 py-1.5 font-body" style={{ color: row.location ? '#0d1b6e' : 'var(--muted-text)', fontStyle: row.location ? 'normal' : 'italic' }}>
                          {row.location || '—'}
                        </td>
                      </tr>
                    ))}
                    {parsed.length > 8 && (
                      <tr>
                        <td colSpan={6} className="text-center py-2 font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>
                          ...and {parsed.length - 8} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import progress */}
          {importing && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
              {/* Animated bar */}
              <div className="w-full rounded-full overflow-hidden" style={{ height: 10, background: 'rgba(0,0,0,0.2)' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #15803d, #22c55e)',
                    width: `${Math.max(3, ((imported + updated + skipped + failed) / parsed.length) * 100)}%`,
                    transition: 'width 0.4s ease',
                    boxShadow: '0 0 8px rgba(34,197,94,0.5)',
                  }}
                />
              </div>
              {/* Counter */}
              <div className="flex items-center justify-between mt-2">
                <p className="font-body font-bold" style={{ fontSize: 14, color: '#22c55e' }}>
                  {imported + updated + skipped + failed} / {parsed.length}
                </p>
                <p className="font-body" style={{ fontSize: 12, color: 'var(--fg-color)', opacity: 0.9 }}>
                  {imported > 0 && <span style={{ color: '#22c55e' }}>{imported} added · </span>}
                  {updated > 0 && <span style={{ color: '#60a5fa' }}>{updated} updated · </span>}
                  {skipped > 0 && <span style={{ color: '#fbbf24' }}>{skipped} unchanged · </span>}
                  {failed > 0 && <span style={{ color: '#f87171' }}>{failed} failed</span>}
                  {imported + updated + skipped + failed === 0 && <span>Processing...</span>}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-5">
            <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
            {parsed.length > 0 && !importing && totalToProcess > 0 && (
              <button
                onClick={handleImport}
                className="px-4 py-2 rounded-xl font-body font-semibold transition-all hover:opacity-90"
                style={{ fontSize: 14, background: '#15803d', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                {importing ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : updateMode ? (
                  `Apply to ${totalToProcess} Item${totalToProcess !== 1 ? 's' : ''}`
                ) : (
                  `Import ${newItems.length} New Item${newItems.length !== 1 ? 's' : ''}`
                )}
              </button>
            )}
          </div>
        </>
      ) : (
        /* Success screen */
        <div className="flex flex-col items-center py-4 gap-3 w-full">
          <CheckCircle size={52} color="#22c55e" />
          <h4 className="font-heading font-bold" style={{ fontSize: 20, color: 'var(--heading-color)' }}>
            Sync Complete!
          </h4>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 w-full mt-1">
            {imported > 0 && (
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
                <p className="font-heading font-black" style={{ fontSize: 28, color: '#22c55e' }}>{imported}</p>
                <p className="font-body font-semibold" style={{ fontSize: 12, color: '#22c55e' }}>New Items Added</p>
              </div>
            )}
            {updated > 0 && (
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)' }}>
                <p className="font-heading font-black" style={{ fontSize: 28, color: '#60a5fa' }}>{updated}</p>
                <p className="font-body font-semibold" style={{ fontSize: 12, color: '#60a5fa' }}>Items Updated</p>
              </div>
            )}
            {skipped > 0 && (
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)' }}>
                <p className="font-heading font-black" style={{ fontSize: 28, color: '#fbbf24' }}>{skipped}</p>
                <p className="font-body font-semibold" style={{ fontSize: 12, color: '#fbbf24' }}>Unchanged</p>
              </div>
            )}
            {failed > 0 && (
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)' }}>
                <p className="font-heading font-black" style={{ fontSize: 28, color: '#f87171' }}>{failed}</p>
                <p className="font-body font-semibold" style={{ fontSize: 12, color: '#f87171' }}>Failed</p>
              </div>
            )}
          </div>

          {/* Changed items breakdown */}
          {(changedItems.length > 0 || addedItems.length > 0) && (
            <div className="w-full mt-1">
              <p className="font-body font-semibold mb-2" style={{ fontSize: 12, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                What Changed
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)', maxHeight: 200, overflowY: 'auto' }}>
                {/* Updated items with qty change */}
                {changedItems.map((item, i) => (
                  <div key={`upd-${i}`} className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--card-border)', background: i % 2 === 0 ? 'var(--input-bg)' : 'transparent' }}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span
                        className="px-2 py-0.5 rounded font-body font-bold"
                        style={{
                          fontSize: 9,
                          background: item.diff > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(248,113,113,0.15)',
                          color: item.diff > 0 ? '#22c55e' : '#f87171',
                          flexShrink: 0,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {item.diff > 0 ? 'Restocked' : 'Reduced'}
                      </span>
                      <span className="font-body font-semibold truncate" style={{ fontSize: 12, color: 'var(--fg-color)' }}>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>{item.oldQty}</span>
                      <span className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>→</span>
                      <span className="font-body font-bold" style={{ fontSize: 12, color: 'var(--fg-color)' }}>{item.newQty}</span>
                      <span className="font-body font-bold px-1.5 py-0.5 rounded" style={{
                        fontSize: 11,
                        color: item.diff > 0 ? '#22c55e' : '#f87171',
                        background: item.diff > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)',
                      }}>
                        {item.diff > 0 ? `+${item.diff}` : `${item.diff}`}
                      </span>
                    </div>
                  </div>
                ))}
                {/* New items */}
                {addedItems.map((item, i) => (
                  <div key={`add-${i}`} className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--card-border)', background: (changedItems.length + i) % 2 === 0 ? 'var(--input-bg)' : 'transparent' }}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="px-2 py-0.5 rounded font-body font-bold" style={{ fontSize: 9, background: 'rgba(34,197,94,0.15)', color: '#22c55e', flexShrink: 0, letterSpacing: '0.04em' }}>Added</span>
                      <span className="font-body font-semibold truncate" style={{ fontSize: 12, color: 'var(--fg-color)' }}>{item.name}</span>
                    </div>
                    <span className="font-body font-bold" style={{ fontSize: 12, color: '#22c55e' }}>+{item.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl font-body font-bold mt-2 w-full"
            style={{ fontSize: 14, background: '#15803d', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            Done
          </button>
        </div>
      )}
    </ModalOverlay>
  );
}
