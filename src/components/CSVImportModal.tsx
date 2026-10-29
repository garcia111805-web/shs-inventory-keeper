import { useState, useRef, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { useLocations } from '../hooks/useLocations';
import { useUnits } from '../hooks/useUnits';
import { Category, getCategoryColor, getCategoryLabel } from '../types';
import ModalOverlay from './ModalOverlay';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { formatItemName, guessConsumable } from '../lib/utils';
import { initialItems } from '../data/initialItems';
import * as XLSX from 'xlsx';

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

// Master dictionary of known school inventory items
const KNOWN_ITEM_CATEGORIES: Record<string, string> = {
  // Alias variations from real CSV data
  'bleach disenfectant': 'cleaning',
  'proclein hypocholorous acid': 'cleaning',
  'indoplas(gloves)': 'cleaning',
  'powerclean solution(dishwashing liquid)': 'cleaning',
  'power clean solution (liquid hand soap)': 'cleaning',
};

// Populate known dictionary from initialItems catalog
initialItems.forEach(item => {
  if (item.name && item.category) {
    KNOWN_ITEM_CATEGORIES[item.name.toLowerCase().trim()] = item.category;
  }
});

// Smart keyword inference based on item names
function inferCategoryFromName(name: string): Category | null {
  const s = name.toLowerCase().trim();
  if (!s) return null;

  // 1. Direct dictionary match
  if (KNOWN_ITEM_CATEGORIES[s]) return KNOWN_ITEM_CATEGORIES[s];

  // 2. Partial dictionary match
  for (const [knownName, cat] of Object.entries(KNOWN_ITEM_CATEGORIES)) {
    if (s.includes(knownName) || (knownName.length > 5 && knownName.includes(s))) {
      return cat;
    }
  }

  // 3. Clinic keywords
  const clinicKeywords = [
    'paracetamol', 'betadine', 'thermometer', 'bandage', 'gauze', 'cotton', 'medicine',
    'medic', 'medical', 'pharma', 'tablet', 'capsule', 'syrup', 'antiseptic', 'ointment',
    'first aid', 'biogesic', 'neozep', 'amoxicillin', 'mefenamic', 'ibuprofen', 'splint',
    'syringe', 'stethoscope', 'sterile', 'blood pressure', 'bp apparatus', 'firstaid'
  ];
  if (clinicKeywords.some(k => s.includes(k))) return 'clinic';

  // 4. Cleaning keywords
  const cleaningKeywords = [
    'bleach', 'detergent', 'cleaner', 'cleanser', 'disinfectant', 'disenfectant', 'dust pan',
    'dustpan', 'walis', 'tingting', 'trash', 'garbage', 'sponge', 'scrub', 'muriatic',
    'sunrox', 'lysol', 'hand soap', 'dishwashing', 'furniture polish', 'pledge', 'albatross',
    'sanicare', 'bathroom tissue', 'mop', 'pail', 'toilet bowl', 'degreaser', 'janitor',
    'air freshener', 'doormat', 'hypochlorous', 'hypocholorous'
  ];
  if (cleaningKeywords.some(k => s.includes(k))) return 'cleaning';

  // 5. Office keywords
  const officeKeywords = [
    'folder', 'envelope', 'paper', 'ink', 'fastener', 'clip', 'clips', 'tape', 'staple', 'staples',
    'stapler', 'calculator', 'glue', 'pad', 'chalk', 'usb', 'flash drive', 'medal', 'ballpen',
    'pen', 'pencil', 'marker', 'highlighter', 'ruler', 'eraser', 'scissors', 'puncher', 'portfolio',
    'binder', 'whiteboard', 'cartolina', 'manila paper', 'bond paper', 'columnar', 'certificate',
    'laminating', 'clearbook', 'carbon paper', 'stamp pad', 'push pin', 'glossy paper'
  ];
  if (officeKeywords.some(k => s.includes(k))) return 'office';

  return null;
}

// Normalize a header string to a known key
function normalizeHeader(h: string): string {
  const s = String(h || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (['name', 'itemname', 'item', 'description', 'product', 'particulars', 'itemdescription'].includes(s)) return 'name';
  if (['category', 'cat', 'categories', 'dept', 'department', 'section', 'group', 'itemgroup', 'classification'].includes(s)) return 'category';
  if (['unit', 'uom', 'unitofmeasure', 'units', 'measure'].includes(s)) return 'unit';
  if (['quantity', 'qty', 'stock', 'count', 'amount', 'balance', 'currentstock', 'onhand'].includes(s)) return 'quantity';
  if (['threshold', 'lowstock', 'lowstockthreshold', 'minstocklevel', 'reorderlevel', 'low', 'min', 'minimum'].includes(s)) return 'threshold';
  if (['notes', 'note', 'remarks', 'comment', 'comments', 'remark'].includes(s)) return 'notes';
  if (['location', 'loc', 'room', 'storage', 'area', 'place', 'cabinet', 'storagetype', 'storagelocation', 'shelf'].includes(s)) return 'location';
  if (['consumable', 'isconsumable', 'asset', 'isasset', 'nature'].includes(s)) return 'consumable';
  return s;
}

// Smart category resolver combining columns, sheets, dictionary & keywords
function resolveCategory(
  rawCategory: string | undefined,
  itemName: string,
  sheetHint: string | undefined,
  existingItems: { name: string; category: Category }[],
  availableCategoryNames: string[],
  fallbackCategory: string = 'office'
): Category {
  // A. Explicit category column provided in row
  if (rawCategory && rawCategory.trim()) {
    const s = rawCategory.toLowerCase().trim();
    if (s.includes('clean') || s.includes('janitor')) return 'cleaning';
    if (s.includes('office') || s.includes('admin') || s.includes('paper') || s.includes('stationer')) return 'office';
    if (s.includes('clinic') || s.includes('medic') || s.includes('health') || s.includes('first aid')) return 'clinic';
    const matched = availableCategoryNames.find(c => c.toLowerCase() === s || s.includes(c.toLowerCase()));
    if (matched) return matched;
    return s;
  }

  // B. Sheet or File name hint
  if (sheetHint && sheetHint.trim()) {
    const s = sheetHint.toLowerCase().trim();
    if (s.includes('clean') || s.includes('janitor')) return 'cleaning';
    if (s.includes('office') || s.includes('admin') || s.includes('paper') || s.includes('stationer')) return 'office';
    if (s.includes('clinic') || s.includes('medic') || s.includes('health') || s.includes('first aid')) return 'clinic';
    const matched = availableCategoryNames.find(c => c.toLowerCase() === s || s.includes(c.toLowerCase()));
    if (matched) return matched;
  }

  // C. Match with existing item in current inventory
  const normName = formatItemName(itemName).toLowerCase();
  const existing = existingItems.find(i => formatItemName(i.name).toLowerCase() === normName);
  if (existing && existing.category) return existing.category;

  // D. Infer from item name (catalog dictionary & keyword matching)
  const inferred = inferCategoryFromName(itemName);
  if (inferred) return inferred;

  // E. Fallback — use admin-configured default category
  return fallbackCategory as Category;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

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
  const { user } = useAuth();
  const { categories: dbCategories, addCategory } = useCategories();
  const { locations, loading: locationsLoading } = useLocations();
  const { units, loading: unitsLoading } = useUnits();
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [done, setDone] = useState(false);

  const availableCategoryNames = useMemo(() => {
    const list = ['cleaning', 'office', 'clinic'];
    dbCategories.forEach(c => {
      const n = c.name.toLowerCase().trim();
      if (n && !list.includes(n)) list.push(n);
    });
    return list;
  }, [dbCategories]);

  const availableCategories = useMemo(() => {
    const set = new Set(['cleaning', 'office', 'clinic']);
    dbCategories.forEach(c => set.add(c.name.toLowerCase()));
    parsed.forEach(p => set.add(p.category.toLowerCase()));
    return Array.from(set);
  }, [dbCategories, parsed]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    parsed.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return counts;
  }, [parsed]);

  // Process Sucat multi-column format
  const processSucatRows = (allRows: string[][]) => {
    const existingNames = new Set(items.map(i => formatItemName(i.name).toLowerCase()));
    const parsedItems: ParsedRow[] = [];

    // Col Mapping: 0,1 (Cleaning In), 2,3 (Cleaning Out), 4,5 (Office In), 6,7 (Office Out), 8,9 (Clinic In), 10,11 (Clinic Out)
    const sections: { col: number; cat: Category }[] = [
      { col: 0, cat: 'cleaning' }, { col: 2, cat: 'cleaning' },
      { col: 4, cat: 'office' }, { col: 6, cat: 'office' },
      { col: 8, cat: 'clinic' }, { col: 10, cat: 'clinic' }
    ];

    for (let i = 6; i < allRows.length; i++) {
      const row = allRows[i];
      sections.forEach(sec => {
        const rawName = row[sec.col]?.trim();
        const qtyVal = row[sec.col + 1];
        if (rawName && rawName !== 'Materials' && rawName !== '' && rawName !== 'Item Name') {
          const formattedName = formatItemName(rawName);
          const nameLower = formattedName.toLowerCase();
          const isDuplicate = existingNames.has(nameLower);
          const existing = isDuplicate ? items.find(i => i.name.toLowerCase().trim() === nameLower) : undefined;

          parsedItems.push({
            name: formattedName,
            category: sec.cat,
            unit: 'PCS',
            quantity: Math.max(0, parseInt(qtyVal) || (existing?.quantity ?? 0)),
            lowStockThreshold: existing?.lowStockThreshold ?? 3,
            notes: '',
            location: existing?.location,
            isConsumable: guessConsumable(formattedName),
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
  };

  // Parse generic sheet rows
  const parseSheetRows = (
    rows: string[][],
    sheetHint: string | undefined,
    existingNames: Set<string>
  ): ParsedRow[] => {
    let headerRowIdx = -1;
    let nameIdx = -1;

    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const mapped = rows[i].map(normalizeHeader);
      const idx = mapped.indexOf('name');
      if (idx !== -1) {
        headerRowIdx = i;
        nameIdx = idx;
        break;
      }
    }

    if (headerRowIdx === -1 || nameIdx === -1) {
      return [];
    }

    const headers = rows[headerRowIdx];
    const dataRows = rows.slice(headerRowIdx + 1);
    const mapped = headers.map(normalizeHeader);
    const catIdx = mapped.indexOf('category');
    const unitIdx = mapped.indexOf('unit');
    const qtyIdx = mapped.indexOf('quantity');
    const threshIdx = mapped.indexOf('threshold');
    const notesIdx = mapped.indexOf('notes');
    const locIdx = mapped.indexOf('location');
    const consIdx = mapped.indexOf('consumable');

    const result: ParsedRow[] = [];

    for (const row of dataRows) {
      const rawName = row[nameIdx]?.trim();
      if (!rawName || rawName === 'Materials' || rawName === 'Item Name' || rawName === 'Name') continue;

      const formattedName = formatItemName(rawName);
      const nameLower = formattedName.toLowerCase();
      const isDuplicate = existingNames.has(nameLower);
      existingNames.add(nameLower);

      const existing = isDuplicate
        ? items.find(i => i.name.toLowerCase().trim() === nameLower)
        : undefined;

      const consRaw = consIdx >= 0 ? row[consIdx]?.toLowerCase() || '' : '';
      const explicitNonConsumable = consRaw.includes('non') || consRaw.includes('no') || consRaw === 'false' || consRaw === '0';
      const isConsumable = consIdx >= 0 ? !explicitNonConsumable : guessConsumable(formattedName);

      const rawCat = catIdx >= 0 ? row[catIdx] : undefined;
      const detectedCat = resolveCategory(rawCat, formattedName, sheetHint, items, availableCategoryNames, "office");

      result.push({
        name: formattedName,
        category: detectedCat,
        unit: unitIdx >= 0 ? (row[unitIdx]?.trim().toUpperCase() || 'PCS') : 'PCS',
        quantity: qtyIdx >= 0 ? Math.max(0, parseInt(row[qtyIdx]) || 0) : 0,
        lowStockThreshold: threshIdx >= 0
          ? Math.max(0, parseInt(row[threshIdx]) || (existing?.lowStockThreshold ?? 3))
          : existing?.lowStockThreshold ?? 3,
        notes: notesIdx >= 0 ? (row[notesIdx]?.trim() || '') : '',
        location: locIdx >= 0 ? (row[locIdx]?.trim().toUpperCase() || undefined) : existing?.location ?? undefined,
        isConsumable,
        isDuplicate,
      });
    }

    return result;
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

          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            setError('Excel file contains no sheets.');
            return;
          }

          // Check if any sheet has Sucat multi-column format
          let isSucatFormatFile = false;
          let sucatSheetRows: string[][] | null = null;

          for (const sName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sName];
            const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (rows.length > 5) {
              const hasSucatHeader = rows.slice(0, 6).some(r =>
                r.some(c => {
                  const val = String(c || '').toUpperCase();
                  return val.includes('SUCAT ELEMENTARY') || val.includes('SUCAT SENIOR HIGH') ||
                    (val.includes('CLEANING') && r.some(c2 => String(c2 || '').toUpperCase().includes('OFFICE')));
                })
              );
              if (hasSucatHeader) {
                isSucatFormatFile = true;
                sucatSheetRows = rows.map(r => r.map(String));
                break;
              }
            }
          }

          if (isSucatFormatFile && sucatSheetRows) {
            processSucatRows(sucatSheetRows);
            return;
          }

          // Otherwise, process ALL sheets in the workbook
          const allParsed: ParsedRow[] = [];
          const existingNames = new Set(items.map(i => formatItemName(i.name).toLowerCase()));

          for (const sName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sName];
            const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (json.length >= 2) {
              const rows = json.map(r => r.map(String));
              const sheetItems = parseSheetRows(rows, sName, existingNames);
              allParsed.push(...sheetItems);
            }
          }

          if (allParsed.length === 0) {
            setError('No valid items found in the Excel file. Please ensure there is a "Name" or "Item" column.');
            return;
          }

          setParsed(allParsed);
        } catch (err) {
          setError('Failed to parse Excel file: ' + String(err));
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

          const allRows = [headers, ...rows];

          const hasSucatHeader = allRows.slice(0, 6).some(r =>
            r.some(c => {
              const val = String(c || '').toUpperCase();
              return val.includes('SUCAT ELEMENTARY') || val.includes('SUCAT SENIOR HIGH') ||
                (val.includes('CLEANING') && r.some(c2 => String(c2 || '').toUpperCase().includes('OFFICE')));
            })
          );

          if (hasSucatHeader) {
            processSucatRows(allRows);
            return;
          }

          const existingNames = new Set(items.map(i => formatItemName(i.name).toLowerCase()));
          const fileHint = file.name.replace(/\.[^/.]+$/, '');
          const parsedItems = parseSheetRows(allRows, fileHint, existingNames);

          if (parsedItems.length === 0) {
            setError('No valid items found in the CSV file. Please ensure there is a "Name" or "Item" column.');
            return;
          }

          setParsed(parsedItems);
        } catch {
          setError('Failed to parse CSV file. Please check the format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const newItems = parsed.filter(r => !r.isDuplicate);
  const duplicateCount = parsed.filter(r => r.isDuplicate).length;
  const totalToProcess = parsed.length;

  const handleImport = async () => {
    setImporting(true);
    setImported(0);

    let successCount = 0;
    const addedLog: { name: string; qty: number; category: string }[] = [];

    // Register any new categories if found in parsed items
    for (const row of parsed) {
      if (row.category && !availableCategoryNames.includes(row.category.toLowerCase())) {
        try {
          await addCategory(row.category.toLowerCase());
          availableCategoryNames.push(row.category.toLowerCase());
        } catch { /* ignore if already exists */ }
      }
    }

    for (const row of parsed) {
      const existing = row.isDuplicate
        ? items.find(i => i.name.toLowerCase().trim() === row.name.toLowerCase().trim())
        : undefined;
      try {
        if (existing) {
          await updateItem({
            ...existing,
            category: row.category,
            unit: row.unit,
            quantity: row.quantity,
            lowStockThreshold: row.lowStockThreshold,
            notes: row.notes || existing.notes,
            location: row.location || existing.location,
            isConsumable: row.isConsumable,
          });
        } else {
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
        }
        successCount++;
        setImported(successCount);
      } catch {
        failCount++;
        setFailed(failCount);
      }
    }

    setImporting(false);
    setDone(true);
    const note = successCount > 0
      ? `${successCount} item${successCount !== 1 ? 's' : ''} imported successfully`
      : 'Nothing to import';
    showToast(note, 'success');
  };

  return (
    <ModalOverlay onClose={onClose} maxWidth="max-w-7xl" className="flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--card-border)] shrink-0">
        <div className="rounded-xl flex items-center justify-center shrink-0" style={{ width: 36, height: 36, background: '#0d1b6e' }}>
          <FileSpreadsheet size={18} color="white" />
        </div>
        <div>
          <h3 className="font-heading font-bold" style={{ fontSize: 18, color: 'var(--heading-color)' }}>
            Import Data from File
          </h3>
          <p className="font-body text-xs text-slate-500 dark:text-slate-400">
            Auto-categorizes items to Cleaning Materials, Office Supplies, Clinic Supplies, etc.
          </p>
        </div>
      </div>

      {!done ? (
        <>
          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto min-h-0 py-3 pr-1 space-y-3">

            {items.length === 0 ? (
              <div
                className="rounded-xl p-3 flex items-center gap-2.5"
                style={{ background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.2)' }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(21,128,61,0.15)', color: '#15803d' }}>
                  <CheckCircle size={16} />
                </div>
                <div>
                  <p className="font-body font-semibold text-xs" style={{ color: '#15803d' }}>
                    Inventory Is Clear &amp; Fresh
                  </p>
                  <p className="font-body text-[11px]" style={{ color: 'var(--muted-text)' }}>
                    Your inventory is empty. All imported items will be added as new records.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-3" style={{ background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.2)' }}>
                <p className="font-body text-xs" style={{ color: '#15803d' }}>Upload your inventory file to begin.</p>
              </div>
            )}

            {/* File selection / File info */}
            {!fileName ? (
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
                  Click to select Excel (.xlsx, .xls) or CSV file
                </span>
                <span className="font-body text-center max-w-md" style={{ fontSize: 11, color: 'var(--muted-text)' }}>
                  Supports multi-sheet workbooks or single sheets. Columns: Name (required), Category, Unit, Quantity, Location. Categories will be automatically routed!
                </span>
              </div>
            ) : (
              <div
                className="rounded-xl p-3 flex items-center justify-between gap-3"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(21,128,61,0.12)', color: '#15803d' }}
                  >
                    <FileSpreadsheet size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-body font-semibold text-xs truncate" style={{ color: 'var(--fg-color)' }}>
                      {fileName}
                    </p>
                    <p className="font-body text-[11px]" style={{ color: 'var(--muted-text)' }}>
                      {parsed.length} items parsed from file
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="shrink-0 font-body font-semibold text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-85"
                  style={{ background: 'var(--card-bg)', color: 'var(--fg-color)', border: '1px solid var(--card-border)', cursor: 'pointer' }}
                >
                  Change File
                </button>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={handleFile}
              className="hidden"
            />

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.2)' }}>
                <AlertTriangle size={16} color="#b91c1c" className="flex-shrink-0 mt-0.5" />
                <span className="font-body" style={{ fontSize: 12, color: '#b91c1c', wordBreak: 'break-word' }}>{error}</span>
              </div>
            )}

            {/* Replace notice */}
            {parsed.length > 0 && (
              <div
                className="rounded-xl p-3"
                style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}
              >
                <p className="font-body text-xs font-semibold" style={{ color: '#d97706' }}>
                  New items will be added. Duplicates will be skipped.
                </p>
                <p className="font-body text-[11px]" style={{ color: 'var(--muted-text)' }}>
                  {duplicateCount > 0
                    ? `${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'} detected and will be skipped.`
                    : 'No duplicates detected.'}
                </p>
              </div>
            )}

            {/* Preview table & category summary */}
            {parsed.length > 0 && (
              <div className="space-y-2">
                {/* Category detection summary pills */}
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="font-body text-xs font-bold text-slate-500 dark:text-slate-400">
                    Auto-Categorized:
                  </span>
                  {Object.entries(categoryCounts).map(([cat, count]) => (
                    <span
                      key={cat}
                      className="font-body text-xs font-bold px-2.5 py-0.5 rounded-lg text-white flex items-center gap-1.5 shadow-sm"
                      style={{ background: getCategoryColor(cat) }}
                    >
                      <span>{getCategoryLabel(cat)}</span>
                      <span className="bg-black/25 px-1.5 py-0.2 rounded text-[10px]">{count}</span>
                    </span>
                  ))}
                </div>

                <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)', maxHeight: 220, overflowY: 'auto' }}>
                  <table className="w-full" style={{ fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)' }}>
                        {['Name', 'Assigned Category', 'Unit', 'Qty', 'Threshold', 'Location', 'Type'].map(h => (
                          <th key={h} className="text-left px-3 py-2 font-body uppercase" style={{ fontSize: 10, color: 'var(--muted-text)', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--card-border)' }}>
                          <td className="px-3 py-2 font-body font-semibold" style={{ color: 'var(--fg-color)' }}>
                            {row.name}
                            {row.isDuplicate && (
                              <span className="font-body ml-1.5 px-1.5 py-0.5 rounded" style={{ fontSize: 9, background: 'rgba(217,119,6,0.15)', color: '#d97706' }}>exists</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <select value={row.category} onChange={(e) => setParsed(prev => prev.map((item, i) => i === idx ? { ...item, category: e.target.value } : item))} className="font-body font-bold px-2 py-0.5 rounded text-white text-[11px] border border-white/20 cursor-pointer outline-none shadow-sm" style={{ background: getCategoryColor(row.category) }} title="Click to adjust category">
                              {availableCategories.map(cat => <option key={cat} value={cat} style={{ background: '#1e293b', color: 'white' }}>{getCategoryLabel(cat)}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select value={row.unit} onChange={(e) => setParsed(prev => prev.map((item, i) => i === idx ? { ...item, unit: e.target.value.toUpperCase() } : item))} className="font-body text-[11px] px-1.5 py-0.5 rounded border border-white/20 cursor-pointer outline-none shadow-sm bg-slate-800 text-white" disabled={unitsLoading}>
                              {units.map(u => <option key={u.id} value={u.name.toUpperCase()} style={{ background: '#1e293b', color: 'white' }}>{u.name.toUpperCase()}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" value={row.quantity} onChange={(e) => setParsed(prev => prev.map((item, i) => i === idx ? { ...item, quantity: Math.max(0, parseInt(e.target.value) || 0) } : item))} className="w-16 font-body font-bold text-[11px] text-center px-1.5 py-0.5 rounded border border-white/20 bg-slate-800 text-white outline-none" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" value={row.lowStockThreshold} onChange={(e) => setParsed(prev => prev.map((item, i) => i === idx ? { ...item, lowStockThreshold: Math.max(0, parseInt(e.target.value) || 0) } : item))} className="w-14 font-body text-[11px] text-center px-1.5 py-0.5 rounded border border-white/20 bg-slate-800 text-white outline-none" />
                          </td>
                          <td className="px-3 py-2">
                            <select value={row.location || ''} onChange={(e) => setParsed(prev => prev.map((item, i) => i === idx ? { ...item, location: e.target.value || undefined } : item))} className="font-body text-[11px] px-1.5 py-0.5 rounded border border-white/20 cursor-pointer outline-none shadow-sm bg-slate-800 text-white" disabled={locationsLoading}>
                              <option value="">— None —</option>
                              {locations.map(loc => <option key={loc.id} value={loc.name} style={{ background: '#1e293b', color: 'white' }}>{loc.name}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <button onClick={() => setParsed(prev => prev.map((item, i) => i === idx ? { ...item, isConsumable: !item.isConsumable } : item))} className="font-body font-bold px-2 py-0.5 rounded text-white text-[10px] border border-white/20 cursor-pointer shadow-sm" style={{ background: row.isConsumable ? '#d97706' : '#7c3aed' }} title={row.isConsumable ? 'Consumable — click to change' : 'Non-Consumable — click to change'}>
                              {row.isConsumable ? 'Consumable' : 'Non-Consumable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-2">
                  {parsed.map((row, idx) => (
                    <div key={idx} className="rounded-xl p-3" style={{ border: '1px solid var(--card-border)', background: 'var(--input-bg)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-body font-bold text-xs truncate" style={{ color: 'var(--fg-color)' }}>{row.name}</p>
                        <span className="px-2 py-0.5 rounded font-body font-bold text-white" style={{ fontSize: 9, background: getCategoryColor(row.category) }}>{getCategoryLabel(row.category)}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <p className="font-body" style={{ fontSize: 10, color: 'var(--muted-text)' }}>Unit</p>
                          <select value={row.unit} onChange={(e) => setParsed(prev => prev.map((item, i) => i === idx ? { ...item, unit: e.target.value.toUpperCase() } : item))} className="mt-1 w-full font-body text-xs px-2 py-1.5 rounded border border-white/20 bg-slate-800 text-white outline-none" disabled={unitsLoading}>
                            {units.map(u => <option key={u.id} value={u.name.toUpperCase()} style={{ background: '#1e293b', color: 'white' }}>{u.name.toUpperCase()}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="font-body" style={{ fontSize: 10, color: 'var(--muted-text)' }}>Qty</p>
                          <input type="number" min="0" value={row.quantity} onChange={(e) => setParsed(prev => prev.map((item, i) => i === idx ? { ...item, quantity: Math.max(0, parseInt(e.target.value) || 0) } : item))} className="mt-1 w-full font-body text-xs px-2 py-1.5 rounded border border-white/20 bg-slate-800 text-white outline-none" />
                        </div>
                        <div>
                          <p className="font-body" style={{ fontSize: 10, color: 'var(--muted-text)' }}>Threshold</p>
                          <input type="number" min="0" value={row.lowStockThreshold} onChange={(e) => setParsed(prev => prev.map((item, i) => i === idx ? { ...item, lowStockThreshold: Math.max(0, parseInt(e.target.value) || 0) } : item))} className="mt-1 w-full font-body text-xs px-2 py-1.5 rounded border border-white/20 bg-slate-800 text-white outline-none" />
                        </div>
                        <div>
                          <p className="font-body" style={{ fontSize: 10, color: 'var(--muted-text)' }}>Location</p>
                          <select value={row.location || ''} onChange={(e) => setParsed(prev => prev.map((item, i) => i === idx ? { ...item, location: e.target.value || undefined } : item))} className="mt-1 w-full font-body text-xs px-2 py-1.5 rounded border border-white/20 bg-slate-800 text-white outline-none" disabled={locationsLoading}>
                            <option value="">— None —</option>
                            {locations.map(loc => <option key={loc.id} value={loc.name} style={{ background: '#1e293b', color: 'white' }}>{loc.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="mt-2">
                        <button onClick={() => setParsed(prev => prev.map((item, i) => i === idx ? { ...item, isConsumable: !item.isConsumable } : item))} className="w-full font-body font-bold text-[11px] py-1.5 rounded border border-white/20 text-white shadow-sm" style={{ background: row.isConsumable ? '#d97706' : '#7c3aed' }}>{row.isConsumable ? 'Consumable' : 'Non-Consumable'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Import progress */}
            {importing && (
              <div className="p-4 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 10, background: 'rgba(0,0,0,0.2)' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, #15803d, #22c55e)',
                      width: `${Math.max(3, (imported / parsed.length) * 100)}%`,
                      transition: 'width 0.4s ease',
                      boxShadow: '0 0 8px rgba(34,197,94,0.5)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="font-body font-bold" style={{ fontSize: 14, color: '#22c55e' }}>
                    {imported} / {parsed.length}
                  </p>
                  <p className="font-body" style={{ fontSize: 12, color: 'var(--fg-color)', opacity: 0.9 }}>
                    {imported > 0 && <span style={{ color: '#22c55e' }}>{imported} added</span>}
                    {imported === 0 && <span>Processing...</span>}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Actions Footer — Always pinned at bottom */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--card-border)] shrink-0 bg-[var(--card-bg)]">
            <div className="text-xs font-body" style={{ color: 'var(--muted-text)' }}>
              {parsed.length > 0 && (
                <span>
                  Ready to process: <strong style={{ color: 'var(--fg-color)' }}>{totalToProcess}</strong> item{totalToProcess !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="modal-btn-cancel" onClick={onClose} disabled={importing}>
                Cancel
              </button>
              {parsed.length > 0 && (
                <button
                  onClick={handleImport}
                  disabled={importing || totalToProcess === 0}
                  className="px-4 py-2 rounded-xl font-body font-semibold transition-all hover:opacity-90 flex items-center gap-2"
                  style={{
                    fontSize: 14,
                    background: totalToProcess === 0 ? 'var(--card-border)' : '#15803d',
                    color: 'white',
                    border: 'none',
                    cursor: (importing || totalToProcess === 0) ? 'not-allowed' : 'pointer',
                    opacity: totalToProcess === 0 ? 0.6 : 1,
                  }}
                >
                  {importing ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing...</>
                  ) : (
                    `Import ${totalToProcess} Item${totalToProcess !== 1 ? 's' : ''}`
                  )}
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Success screen */
        <div className="flex flex-col items-center py-2 gap-3 w-full flex-1 overflow-y-auto min-h-0">
          <CheckCircle size={48} color="#22c55e" />
          <h4 className="font-heading font-bold" style={{ fontSize: 20, color: 'var(--heading-color)' }}>
            Import &amp; Categorization Complete!
          </h4>
          <p className="font-body text-xs text-slate-500 dark:text-slate-400">
            Items have been routed to their respective categories.
          </p>

          <div className="w-full mt-2 rounded-xl p-4 text-center" style={{ border: '1px solid var(--card-border)', background: 'var(--input-bg)' }}>
            <p className="font-body font-bold" style={{ fontSize: 14, color: 'var(--fg-color)' }}>
              {imported ? `Imported ${imported} item${imported === 1 ? '' : 's'}` : 'No items imported'}
            </p>
            <p className="font-body mt-1" style={{ fontSize: 12, color: 'var(--muted-text)' }}>
              The inventory has been refreshed from this file.
            </p>
          </div>

          <div className="pt-2 border-t border-[var(--card-border)] w-full shrink-0">
            <button
              onClick={onClose}
              className="px-8 py-2.5 rounded-xl font-body font-bold w-full"
              style={{ fontSize: 14, background: '#15803d', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </ModalOverlay>
  );
}
