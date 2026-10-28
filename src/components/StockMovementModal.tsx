import { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  InventoryItem,
  TransactionType,
  getStatus,
  getCategoryColor,
} from '../types';
import ModalOverlay from './ModalOverlay';
import StatusBadge from './StatusBadge';
import { Search, ArrowLeftRight, Calendar, Clock } from 'lucide-react';

interface Props {
  item?: InventoryItem;
  defaultType?: TransactionType;
  lockType?: boolean;
  maxReturnQty?: number;
  onClose: () => void;
}

const TYPE_CONFIG: { type: TransactionType; label: string; color: string }[] = [
  { type: 'restock', label: 'Restock', color: '#15803d' },
  { type: 'use', label: 'Use', color: '#d97706' },
  { type: 'borrow', label: 'Borrow', color: '#7c3aed' },
  { type: 'return', label: 'Return', color: '#16a34a' },
];

export default function StockMovementModal({ item: prefilledItem, defaultType, lockType, maxReturnQty, onClose }: Props) {
  const { theme } = useTheme();
  const { items, addTransaction, moveItemToQuarantine, showToast } = useInventory();
  const { role, user } = useAuth();

  const isAdmin = role === 'admin';
  
  // Item selection
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(prefilledItem || null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Form state
  const [type, setType] = useState<TransactionType>(defaultType || 'restock');
  const [qty, setQty] = useState(maxReturnQty ? String(maxReturnQty) : '');
  const [by, setBy] = useState(user?.fullName || '');
  const [returnDate, setReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [datePart, setDatePart] = useState(new Date().toISOString().slice(0, 10));
  const [timePart, setTimePart] = useState(new Date().toTimeString().slice(0, 5));
  const [isDamaged, setIsDamaged] = useState(false);

  const availableTypes = useMemo(() => {
    let base = isAdmin ? TYPE_CONFIG : TYPE_CONFIG.filter(tc => tc.type !== 'restock');

    if (selectedItem) {
      if (selectedItem.isConsumable) {
        return base.filter(tc => tc.type !== 'borrow');
      } else {
        return base.filter(tc => tc.type !== 'use');
      }
    }
    return base;
  }, [isAdmin, selectedItem]);

  // Validation state
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-switch type if the selected item doesn't support the current type
  useEffect(() => {
    if (selectedItem && !lockType) {
      if (selectedItem.isConsumable && type === 'borrow') {
        setType('use');
      } else if (!selectedItem.isConsumable && type === 'use') {
        setType('borrow');
      }
    }
  }, [selectedItem, type, lockType]);

  const filtered = useMemo(() => {
    let list = items;
    if (type === 'borrow') {
      list = list.filter(i => !i.isConsumable);
    } else if (type === 'use') {
      list = list.filter(i => i.isConsumable);
    }
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(i => i.name.toUpperCase().includes(q.toUpperCase()));
  }, [items, search, type]);

  const qtyNum = parseInt(qty) || 0;
  const newStock =
    (type === 'restock' || type === 'return')
      ? (selectedItem?.quantity ?? 0) + qtyNum
      : (selectedItem?.quantity ?? 0) - qtyNum;

  const isQtyValid =
    qtyNum > 0 && (
      type === 'restock' || 
      (type === 'return' && (!maxReturnQty || qtyNum <= maxReturnQty)) || 
      (type !== 'restock' && type !== 'return' && newStock >= 0)
    );
  const isByValid = by.trim().length > 0;
  const isReturnValid = type !== 'borrow' || returnDate !== '';
  const canSubmit =
    selectedItem && isQtyValid && isByValid && isReturnValid;

  const fieldClass = (valid: boolean) =>
    `modal-input${touched && !valid ? ' field-error' : ''}`;

  const handleSubmit = async () => {
    setTouched(true);
    if (!selectedItem || !canSubmit || loading) return;
    setLoading(true);
    try {
      if (type === 'return' && isDamaged) {
        // Use the specialized quarantine function for returns
        await moveItemToQuarantine(
          selectedItem.id,
          qtyNum,
          notes || 'Returned as damaged',
          by.trim(),
          true // isReturn = true
        );
        showToast(`Returned ${qtyNum} ${selectedItem.unit} and marked as Damaged`, 'success');
      } else {
        // Regular transaction
        await addTransaction({
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          category: selectedItem.category,
          type,
          qtyChange: (type === 'restock' || type === 'return') ? qtyNum : -qtyNum,
          newStock,
          by: by.trim(),
          returnDate: type === 'borrow' ? returnDate : undefined,
          notes,
          date: new Date(`${datePart}T${timePart}`).toISOString(),
        });
        showToast(
          `${type.charAt(0).toUpperCase() + type.slice(1)} recorded for ${selectedItem.name}`,
          'success',
        );
      }
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Operation failed. Please try again.', 'error');
      setLoading(false);
    }
  };

  const activeColor = TYPE_CONFIG.find(t => t.type === type)?.color || '#7c3aed';


  return (
    <ModalOverlay onClose={onClose}>
      <div className="max-h-[85vh] overflow-y-auto px-1 -mx-1 scrollbar-hide">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="rounded-xl flex items-center justify-center"
          style={{ width: 36, height: 36, background: activeColor, transition: 'background 0.25s' }}
        >
          <ArrowLeftRight size={18} color="white" />
        </div>
        <h3
          className="font-heading font-bold"
          style={{ fontSize: 24, color: 'var(--heading-color)' }}
        >
          {type === 'borrow' ? 'Borrow Item' : type === 'use' ? 'Use Item' : type === 'return' ? 'Return Item' : 'Restock Item'}
        </h3>
      </div>

      {/* Item selector / preview */}
      {!selectedItem ? (
        <div className="relative mb-4">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--muted-text)' }}
            />
            <input
              className="modal-input"
              style={{ paddingLeft: '2.75rem' }}
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Search for an item..."
            />
          </div>
          {dropdownOpen && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl max-h-48 overflow-y-auto z-10"
              style={{
                background: 'var(--dropdown-bg)',
                border: '1px solid var(--card-border)',
              }}
            >
              {filtered.slice(0, 20).map(item => (
                <button
                  key={item.id}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 table-row-hover"
                  onClick={() => {
                    setSelectedItem(item);
                    setDropdownOpen(false);
                    setSearch('');
                  }}
                >
                  <span
                    className="font-body font-semibold flex-1 truncate"
                    style={{ fontSize: 13, color: 'var(--fg-color)' }}
                  >
                    {item.name}
                  </span>
                  <span
                    className="font-body px-1.5 py-0.5 rounded text-white"
                    style={{ fontSize: 10, background: getCategoryColor(item.category) }}
                  >
                    {item.category}
                  </span>
                  <span className="font-body" style={{ fontSize: 12, color: 'var(--muted-text)' }}>
                    {item.quantity}
                  </span>
                  <StatusBadge status={getStatus(item)} />
                </button>
              ))}
              {filtered.length === 0 && (
                <p
                  className="px-3 py-3 font-body"
                  style={{ fontSize: 13, color: 'var(--muted-text)' }}
                >
                  No items found
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl p-3 mb-4"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
        >
          <div className="flex items-center justify-between">
            <span
              className="font-body font-semibold"
              style={{ fontSize: 14, color: 'var(--fg-color)' }}
            >
              {selectedItem.name}
            </span>
            {!prefilledItem && (
              <button
                className="font-body text-xs underline"
                style={{ color: 'var(--muted-text)' }}
                onClick={() => setSelectedItem(null)}
              >
                Change
              </button>
            )}
          </div>
          <div className="font-body font-bold mt-1" style={{ fontSize: 14, color: selectedItem.quantity === 0 ? '#b91c1c' : selectedItem.quantity <= selectedItem.lowStockThreshold ? '#d97706' : '#15803d' }}>
            Current: {selectedItem.quantity} {selectedItem.unit}
          </div>
        </div>
      )}

      {/* Type selector pills */}
      {availableTypes.length > 1 && !lockType && (
        <div className="flex gap-2 mb-4">
          {availableTypes.map(tc => (
            <button
              key={tc.type}
              onClick={() => setType(tc.type)}
              className="flex-1 py-2 rounded-xl font-body font-semibold transition-all"
              style={{
                fontSize: 13,
                background: type === tc.type ? tc.color : 'var(--input-bg)',
                color: type === tc.type ? 'white' : 'var(--fg-color)',
                border: `1px solid ${type === tc.type ? tc.color : 'var(--card-border)'}`,
              }}
            >
              {tc.label}
            </button>
          ))}
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className="font-body text-xs mb-1 block"
              style={{ color: 'var(--muted-text)' }}
            >
              Quantity
            </label>
            <input
              className={fieldClass(isQtyValid)}
              type="number"
              min="1"
              max={type === 'return' && maxReturnQty ? maxReturnQty : (type !== 'restock' && type !== 'return' ? selectedItem?.quantity : undefined)}
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
            {type === 'return' && maxReturnQty && (
              <p className="mt-1 font-body font-bold" style={{ fontSize: 11, color: '#b91c1c' }}>
                Max returnable: {maxReturnQty} {selectedItem?.unit}
              </p>
            )}
          </div>
          <div className="col-span-2 flex items-center justify-between mt-1">
            <span className="font-body text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-text)', fontSize: 10 }}>
              Date & Time
            </span>
            <button 
              type="button"
              onClick={() => {
                setDatePart(new Date().toISOString().slice(0, 10));
                setTimePart(new Date().toTimeString().slice(0, 5));
              }}
              className="text-xs font-semibold hover:opacity-70 transition-opacity"
              style={{ color: theme === 'dark' ? '#e8b400' : '#0d1b6e' }}
            >
              Set to Now
            </button>
          </div>
          <div className="space-y-1">
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-text)' }} />
              <input
                className="modal-input"
                style={{ paddingLeft: '2.5rem' }}
                type="date"
                value={datePart}
                onChange={e => setDatePart(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="relative">
              <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-text)' }} />
              <input
                className="modal-input"
                style={{ paddingLeft: '2.5rem' }}
                type="time"
                value={timePart}
                onChange={e => setTimePart(e.target.value)}
              />
            </div>
          </div>
        </div>



        <div>
          <label
            className="font-body text-xs mb-1 block"
            style={{ color: 'var(--muted-text)' }}
          >
            Staff Member {type === 'borrow' ? 'Borrowing' : type === 'restock' ? 'Restocking' : type === 'return' ? 'Returning' : 'Using'} <span style={{ color: '#b91c1c' }}>*</span>
          </label>
          <input
            className={fieldClass(isByValid)}
            value={by}
            onChange={e => setBy(e.target.value)}
            disabled={!isAdmin}
            placeholder="Full name"
            style={!isAdmin ? { background: 'rgba(0,0,0,0.05)', cursor: 'not-allowed', opacity: 0.8 } : {}}
          />
        </div>

        {/* Borrow return date — animated slide-in */}
        <div
          className="overflow-hidden transition-all"
          style={{
            maxHeight: type === 'borrow' ? 80 : 0,
            opacity: type === 'borrow' ? 1 : 0,
            transition: 'max-height 0.3s ease, opacity 0.25s ease',
          }}
        >
          <label
            className="font-body text-xs mb-1 block"
            style={{ color: 'var(--muted-text)' }}
          >
            Expected Return Date <span style={{ color: '#b91c1c' }}>*</span>
          </label>
          <input
            className={fieldClass(isReturnValid)}
            type="date"
            value={returnDate}
            onChange={e => setReturnDate(e.target.value)}
          />
        </div>

        <div>
          <label
            className="font-body text-xs mb-1 block"
            style={{ color: 'var(--muted-text)' }}
          >
            Notes (optional)
          </label>
          <textarea
            className="modal-input"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Quarantine Toggle for Returns */}
      {type === 'return' && (
        <div className="mt-2 p-4 rounded-2xl flex items-center justify-between transition-all" 
             style={{ 
               background: isDamaged ? 'rgba(185,28,28,0.1)' : 'var(--input-bg)',
               border: `1px solid ${isDamaged ? '#fca5a5' : 'var(--card-border)'}` 
             }}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDamaged ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <div>
              <p className="font-body font-black" style={{ fontSize: 13, color: isDamaged ? '#b91c1c' : 'var(--fg-color)' }}>
                Mark as Damaged
              </p>
              <p className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>
                Move item directly to damaged list
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsDamaged(!isDamaged)}
            className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isDamaged ? 'bg-red-600' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isDamaged ? 'translate-x-6' : ''}`} />
          </button>
        </div>
      )}

      {/* Stock preview */}
      {qtyNum > 0 && selectedItem && (
        <div 
          className="mt-3 p-3 rounded-xl font-body" 
          style={{ 
            fontSize: 13, 
            background: isDamaged ? 'rgba(185,28,28,0.05)' : (newStock < 0 ? 'rgba(185,28,28,0.1)' : 'rgba(21,128,61,0.08)'),
            border: `1px solid ${isDamaged ? 'rgba(185,28,28,0.1)' : (newStock < 0 ? 'rgba(185,28,28,0.2)' : 'rgba(21,128,61,0.15)')}`,
            color: isDamaged ? '#b91c1c' : (newStock < 0 ? '#b91c1c' : '#15803d')
          }}
        >
          <div className="flex justify-between items-center">
            <span>{isDamaged ? 'Stock Status:' : 'Resulting Stock:'}</span>
            <span className="font-bold" style={{ fontSize: 15 }}>
              {isDamaged 
                ? `+${qtyNum} Damaged` 
                : `${newStock} ${selectedItem.unit}`}
            </span>
          </div>
          {newStock < 0 && !isDamaged && (
            <p className="mt-1 font-semibold" style={{ fontSize: 11 }}>
              ⚠️ You cannot use/borrow more than the current stock.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-5">
        <button className="modal-btn-cancel" onClick={onClose}>
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="px-8 py-3 rounded-xl font-body font-bold transition-all shadow-lg active:scale-95"
          style={{
            fontSize: 16,
            background: isDamaged ? '#b91c1c' : activeColor,
            color: 'white',
            opacity: canSubmit && !loading ? 1 : 0.7,
            cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
            border: 'none',
          }}
        >
          {loading ? 'Processing...' : (isDamaged ? 'Return & Mark Damaged' : `Confirm ${(type || 'restock').charAt(0).toUpperCase() + (type || 'restock').slice(1)}`)}
        </button>
      </div>
      </div>
    </ModalOverlay>
  );
}
