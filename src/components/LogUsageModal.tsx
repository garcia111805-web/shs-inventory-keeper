import { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, getStatus, getCategoryLabel, getCategoryColor } from '../types';
import ModalOverlay from './ModalOverlay';
import StatusBadge from './StatusBadge';
import { Search, ClipboardList } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function LogUsageModal({ onClose }: Props) {
  const { items, addTransaction, showToast } = useInventory();
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState('');
  const [by, setBy] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q));
  }, [items, search]);

  const qtyNum = parseInt(qty) || 0;
  const canSubmit = selectedItem && qtyNum > 0 && qtyNum <= selectedItem.quantity && by.trim();

  const handleSubmit = () => {
    if (!selectedItem || !canSubmit) return;
    addTransaction({
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      category: selectedItem.category,
      type: 'use',
      qtyChange: -qtyNum,
      newStock: selectedItem.quantity - qtyNum,
      by: by.trim(),
      notes,
      date: new Date(date).toISOString(),
    });
    showToast(`Usage logged: ${selectedItem.name}`, 'success');
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-xl flex items-center justify-center" style={{ width: 36, height: 36, background: '#e8b400' }}>
          <ClipboardList size={18} color="#0d1b6e" />
        </div>
        <h3 className="font-heading font-bold" style={{ fontSize: 18, color: 'var(--heading-color)' }}>Log Usage</h3>
      </div>

      {/* Item selector */}
      {!selectedItem ? (
        <div className="relative mb-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-text)' }} />
            <input
              className="modal-input pl-8"
              value={search}
              onChange={e => { setSearch(e.target.value); setDropdownOpen(true); }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Search for an item..."
            />
          </div>
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl max-h-48 overflow-y-auto z-10"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              {filtered.slice(0, 20).map(item => (
                <button
                  key={item.id}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 table-row-hover"
                  onClick={() => { setSelectedItem(item); setDropdownOpen(false); setSearch(''); }}
                >
                  <span className="font-body font-semibold flex-1 truncate" style={{ fontSize: 13, color: 'var(--fg-color)' }}>
                    {item.name}
                  </span>
                  <span className="font-body px-1.5 py-0.5 rounded text-white" style={{ fontSize: 10, background: getCategoryColor(item.category) }}>
                    {item.category}
                  </span>
                  <span className="font-body" style={{ fontSize: 12, color: 'var(--muted-text)' }}>{item.quantity}</span>
                  <StatusBadge status={getStatus(item)} />
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-3 font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>No items found</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl p-3 mb-4" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
          <div className="flex items-center justify-between">
            <span className="font-body font-semibold" style={{ fontSize: 14, color: 'var(--fg-color)' }}>{selectedItem.name}</span>
            <button className="font-body text-xs underline" style={{ color: 'var(--muted-text)' }} onClick={() => setSelectedItem(null)}>
              Change
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-body" style={{ fontSize: 12, color: 'var(--muted-text)' }}>Available: {selectedItem.quantity}</span>
            <StatusBadge status={getStatus(selectedItem)} />
          </div>
          {selectedItem.quantity === 0 && (
            <p className="font-body font-semibold mt-1" style={{ fontSize: 12, color: '#b91c1c' }}>
              ⚠ Out of stock — cannot log usage
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Quantity</label>
            <input className="modal-input" type="number" min="1" max={selectedItem?.quantity || 0} value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div>
            <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Date</label>
            <input className="modal-input" type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Used by (required)</label>
          <input className="modal-input" value={by} onChange={e => setBy(e.target.value)} placeholder="Name" />
        </div>
        <div>
          <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Notes (optional)</label>
          <textarea className="modal-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-4 py-2 rounded-xl font-body font-semibold transition-opacity"
          style={{ fontSize: 14, background: '#e8b400', color: '#0d1b6e', opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
        >
          Log Usage
        </button>
      </div>
    </ModalOverlay>
  );
}
