import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, TransactionType, getStatus } from '../types';
import ModalOverlay from './ModalOverlay';
import StatusBadge from './StatusBadge';

interface Props {
  item: InventoryItem;
  onClose: () => void;
}

export default function TransactionModal({ item, onClose }: Props) {
  const { addTransaction, showToast } = useInventory();
  const [type, setType] = useState<TransactionType>('restock');
  const [qty, setQty] = useState('');
  const [by, setBy] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));

  const qtyNum = parseInt(qty) || 0;
  const newStock = type === 'restock' ? item.quantity + qtyNum : item.quantity - qtyNum;
  const isValid = qtyNum > 0 && by.trim() && (type === 'restock' || newStock >= 0);

  const handleSubmit = () => {
    if (!isValid) return;
    addTransaction({
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      type,
      qtyChange: type === 'restock' ? qtyNum : -qtyNum,
      newStock,
      by: by.trim(),
      notes,
      date: new Date(date).toISOString(),
    });
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} recorded for ${item.name}`, 'success');
    onClose();
  };

  const typeConfig: { type: TransactionType; label: string; color: string }[] = [
    { type: 'restock', label: 'Restock', color: '#1d4ed8' },
    { type: 'borrow', label: 'Borrow', color: '#d97706' },
    { type: 'use', label: 'Use', color: '#b91c1c' },
  ];

  return (
    <ModalOverlay onClose={onClose}>
      <h3 className="font-heading font-bold mb-3" style={{ fontSize: 18, color: 'var(--heading-color)' }}>Transaction</h3>
      
      {/* Item preview */}
      <div className="rounded-xl p-3 mb-4" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
        <div className="flex items-center justify-between">
          <span className="font-body font-semibold" style={{ fontSize: 14, color: 'var(--fg-color)' }}>{item.name}</span>
          <StatusBadge status={getStatus(item)} />
        </div>
        <div className="font-body mt-1" style={{ fontSize: 12, color: 'var(--muted-text)' }}>
          Current stock: {item.quantity} {item.unit}
        </div>
      </div>

      {/* Type selector */}
      <div className="flex gap-2 mb-4">
        {typeConfig.map(tc => (
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

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Quantity</label>
            <input className="modal-input" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div>
            <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Date</label>
            <input className="modal-input" type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Person Name</label>
          <input className="modal-input" value={by} onChange={e => setBy(e.target.value)} placeholder="Who is this for?" />
        </div>
        <div>
          <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Notes (optional)</label>
          <textarea className="modal-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {qtyNum > 0 && (
        <div className="mt-3 font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>
          New stock: <strong style={{ color: newStock < 0 ? '#b91c1c' : 'var(--fg-color)' }}>{newStock}</strong>
          {newStock < 0 && <span style={{ color: '#b91c1c' }}> (insufficient stock!)</span>}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-5">
        <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
        <button className="modal-btn-confirm" onClick={handleSubmit} disabled={!isValid}>Confirm</button>
      </div>
    </ModalOverlay>
  );
}
