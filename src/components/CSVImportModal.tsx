import { useState, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Category } from '../types';
import ModalOverlay from './ModalOverlay';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
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
  if (s.includes('clean')) return 'cleaning';
  if (s.includes('office')) return 'office';
  if (s.includes('clinic') || s.includes('medic') || s.includes('health')) return 'clinic';
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
  const { items, addItem, updateItem, showToast } = useInventory();
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

  // Scan all rows to find the header row (the one with a 'Name' column)
  const processAllRows = (allRows: string[][]) => {
    // Check for Sucat SHS specific format
    const isSucatFormat = allRows[0]?.[0]?.toUpperCase().includes('SUCAT SENIOR HIGH SCHOOL');
    
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
              unit: 'pcs',
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
        setError('Detected Sucat SHS format but found no items starting from Row 7.');
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
          unit: unitIdx >= 0 ? (row[unitIdx]?.trim() || 'pcs') : 'pcs',
          quantity: qtyIdx >= 0 ? Math.max(0, parseInt(row[qtyIdx]) || 0) : 0,
          lowStockThreshold: threshIdx >= 0 ? Math.max(0, parseInt(row[threshIdx]) || 3) : 3,
          notes: notesIdx >= 0 ? (row[notesIdx]?.trim() || '') : '',
          location: locIdx >= 0 ? (row[locIdx]?.trim() || undefined) : undefined,
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

    let successCount = 0;
    let updateCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const row of parsed) {
      if (row.isDuplicate) {
        if (updateMode) {
          // Find the existing item by name (case-insensitive)
          const existing = items.find(
            i => i.name.toLowerCase().trim() === row.name.toLowerCase().trim()
          );
          if (existing) {
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

  const catColors: Record<string, string> = { cleaning: '#0d1b6e', office: '#d97706', clinic: '#b91c1c' };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-xl flex items-center justify-center" style={{ width: 36, height: 36, background: '#0d1b6e' }}>
          <FileSpreadsheet size={18} color="white" />
        </div>
        <h3 className="font-heading font-bold" style={{ fontSize: 18, color: 'var(--heading-color)' }}>
          Import Inventory from File
        </h3>
      </div>

      {!done ? (
        <>
          {/* File picker */}
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

          {/* Update mode toggle */}
          {parsed.length > 0 && duplicateCount > 0 && (
            <div
              className="flex items-center gap-3 mt-3 p-3 rounded-xl cursor-pointer select-none"
              style={{ background: updateMode ? 'rgba(13,27,110,0.08)' : 'var(--input-bg)', border: `1px solid ${updateMode ? 'rgba(13,27,110,0.25)' : 'var(--card-border)'}`, transition: 'all 0.2s' }}
              onClick={() => setUpdateMode(m => !m)}
            >
              {/* Toggle pill */}
              <div
                className="relative flex-shrink-0 rounded-full transition-all"
                style={{ width: 36, height: 20, background: updateMode ? '#0d1b6e' : 'var(--card-border)', transition: 'background 0.2s' }}
              >
                <div
                  className="absolute top-1 rounded-full bg-white transition-all"
                  style={{ width: 12, height: 12, left: updateMode ? 20 : 4, transition: 'left 0.2s' }}
                />
              </div>
              <div>
                <p className="font-body font-semibold" style={{ fontSize: 13, color: 'var(--fg-color)' }}>
                  Update existing items
                </p>
                <p className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>
                  {updateMode
                    ? `${duplicateCount} existing item(s) will be updated with data from file`
                    : `${duplicateCount} duplicate(s) will be skipped`}
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
                          <span className="font-body font-semibold px-1.5 py-0.5 rounded text-white" style={{ fontSize: 10, background: catColors[row.category] || '#666' }}>
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
            <div className="mt-3">
              <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'var(--donut-track)' }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${((imported + failed) / parsed.length) * 100}%`,
                  background: '#15803d',
                  transition: 'width 0.3s',
                }} />
              </div>
              <p className="font-body text-center mt-1" style={{ fontSize: 11, color: 'var(--muted-text)' }}>
                Importing {imported + failed} / {parsed.length}...
              </p>
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
        <div className="flex flex-col items-center py-6 gap-3">
          <CheckCircle size={48} color="#15803d" />
          <h4 className="font-heading font-bold" style={{ fontSize: 18, color: 'var(--heading-color)' }}>
            Done!
          </h4>
          <p className="font-body text-center" style={{ fontSize: 13, color: 'var(--muted-text)', lineHeight: 1.6 }}>
            {imported > 0 && <><strong style={{ color: 'var(--fg-color)' }}>{imported}</strong> new items added<br /></>}
            {updated > 0 && <><strong style={{ color: '#0d1b6e' }}>{updated}</strong> existing items updated<br /></>}
            {skipped > 0 && <><span style={{ color: '#d97706' }}>{skipped} duplicates skipped</span><br /></>}
            {failed > 0 && <><span style={{ color: '#b91c1c' }}>{failed} items failed</span></>}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl font-body font-semibold mt-2"
            style={{ fontSize: 14, background: '#0d1b6e', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            Done
          </button>
        </div>
      )}
    </ModalOverlay>
  );
}
