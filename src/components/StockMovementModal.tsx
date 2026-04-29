import { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  InventoryItem,
  TransactionType,
  getStatus,
  getCategoryColor,
} from '../types';
import { useDepartments } from '../hooks/useDepartments';
import ModalOverlay from './ModalOverlay';
import StatusBadge from './StatusBadge';
import { Search, ArrowLeftRight } from 'lucide-react';

interface Props {
  item?: InventoryItem;
  defaultType?: TransactionType;
  onClose: () => void;
}

const TYPE_CONFIG: { type: TransactionType; label: string; color: string }[] = [
  { type: 'restock', label: 'Restock', color: '#15803d' },
  { type: 'use', label: 'Use', color: '#d97706' },
  { type: 'borrow', label: 'Borrow', color: '#7c3aed' },
];

export default function StockMovementModal({ item: prefilledItem, defaultType, onClose }: Props) {
  const { items, addTransaction, showToast } = useInventory();
  const { departments } = useDepartments();

  // Item selection
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(prefilledItem || null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Form state
  const [type, setType] = useState<TransactionType>(defaultType || 'restock');
  const [qty, setQty] = useState('');
  const [by, setBy] = useState('');
  const [department, setDepartment] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));

  // Validation state
  const [touched, setTouched] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q));
  }, [items, search]);

  const qtyNum = parseInt(qty) || 0;
  const newStock =
    type === 'restock'
      ? (selectedItem?.quantity ?? 0) + qtyNum
      : (selectedItem?.quantity ?? 0) - qtyNum;

  const isQtyValid =
    qtyNum > 0 && (type === 'restock' || newStock >= 0);
  const isByValid = by.trim().length > 0;
  const isDeptValid = department !== '';
  const isReturnValid = type !== 'borrow' || returnDate !== '';
  const canSubmit =
    selectedItem && isQtyValid && isByValid && isDeptValid && isReturnValid;

  const fieldClass = (valid: boolean) =>
    `modal-input${touched && !valid ? ' field-error' : ''}`;

  const handleSubmit = async () => {
    setTouched(true);
    if (!canSubmit) return;
    try {
      await addTransaction({
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        category: selectedItem.category,
        type,
        qtyChange: type === 'restock' ? qtyNum : -qtyNum,
        newStock,
        by: by.trim(),
        department: department as any,
        returnDate: type === 'borrow' ? returnDate : undefined,
        notes,
        date: new Date(date).toISOString(),
      });
      showToast(
        `${type.charAt(0).toUpperCase() + type.slice(1)} recorded for ${selectedItem.name}`,
        'success',
      );
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Operation failed. Please try again.', 'error');
    }
  };

  const activeColor = TYPE_CONFIG.find(t => t.type === type)!.color;

  return (
    <ModalOverlay onClose={onClose}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="rounded-xl flex items-center justify-center"
          style={{ width: 36, height: 36, background: activeColor, transition: 'background 0.25s' }}
        >
          <ArrowLeftRight size={18} color="white" />
        </div>
        <h3
          className="font-heading font-bold"
          style={{ fontSize: 18, color: 'var(--heading-color)' }}
        >
          New Transaction
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
              className="modal-input pl-8"
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
          <div className="font-body font-bold mt-1" style={{ fontSize: 14, color: activeColor }}>
            Current: {selectedItem.quantity} {selectedItem.unit}
          </div>
        </div>
      )}

      {/* Type selector pills */}
      <div className="flex gap-2 mb-4">
        {TYPE_CONFIG.map(tc => (
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
              max={type !== 'restock' ? selectedItem?.quantity : undefined}
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
          </div>
          <div>
            <label
              className="font-body text-xs mb-1 block"
              style={{ color: 'var(--muted-text)' }}
            >
              Date &amp; Time
            </label>
            <input
              className="modal-input"
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label
            className="font-body text-xs mb-1 block"
            style={{ color: 'var(--muted-text)' }}
          >
            Department / Office <span style={{ color: '#b91c1c' }}>*</span>
          </label>
          <select
            className={fieldClass(isDeptValid)}
            value={department}
            onChange={e => setDepartment(e.target.value)}
          >
            <option value="">Select department…</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="font-body text-xs mb-1 block"
            style={{ color: 'var(--muted-text)' }}
          >
            Staff Member Requesting <span style={{ color: '#b91c1c' }}>*</span>
          </label>
          <input
            className={fieldClass(isByValid)}
            value={by}
            onChange={e => setBy(e.target.value)}
            placeholder="Full name"
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

      {/* Stock preview */}
      {qtyNum > 0 && selectedItem && (
        <div className="mt-3 font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>
          New stock:{' '}
          <strong style={{ color: newStock < 0 ? '#b91c1c' : 'var(--fg-color)' }}>
            {newStock}
          </strong>
          {newStock < 0 && (
            <span style={{ color: '#b91c1c' }}> (insufficient stock!)</span>
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
          className="px-4 py-2 rounded-xl font-body font-semibold transition-all"
          style={{
            fontSize: 14,
            background: activeColor,
            color: 'white',
            opacity: canSubmit ? 1 : 0.7,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            border: 'none',
            transition: 'background 0.25s, opacity 0.2s',
          }}
        >
          Confirm {type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
      </div>
    </ModalOverlay>
  );
}
