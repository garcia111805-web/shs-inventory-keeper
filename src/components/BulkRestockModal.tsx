import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Category } from '../types';
import ModalOverlay from './ModalOverlay';

interface Props {
  category: Category;
  onClose: () => void;
}

export default function BulkRestockModal({ category, onClose }: Props) {
  const { items, addTransaction, showToast } = useInventory();
  const catItems = items.filter(i => i.category === category);
  const [by, setBy] = useState('');
  const [newQtys, setNewQtys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!by.trim() || loading) return;
    setLoading(true);
    let count = 0;
    catItems.forEach(item => {
      const newQty = parseInt(newQtys[item.id] || '');
      if (!isNaN(newQty) && newQty > item.quantity) {
        addTransaction({
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          type: 'restock',
          qtyChange: newQty - item.quantity,
          newStock: newQty,
          by: by.trim(),
          notes: 'Bulk restock',
          date: new Date().toISOString(),
        });
        count++;
      }
    });
    if (count > 0) {
      showToast(`${count} items restocked`, 'success');
    } else {
      showToast('No changes made', 'warning');
    }
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h3 className="font-heading font-bold mb-4" style={{ fontSize: 18, color: 'var(--heading-color)' }}>Bulk Restock</h3>
      <div className="mb-3">
        <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Person Name</label>
        <input className="modal-input" value={by} onChange={e => setBy(e.target.value)} placeholder="Who is restocking?" />
      </div>
      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {catItems.map(item => (
          <div key={item.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg" style={{ background: 'var(--input-bg)' }}>
            <span className="font-body flex-1 truncate" style={{ fontSize: 13, color: 'var(--fg-color)' }}>{item.name}</span>
            <span className="font-body" style={{ fontSize: 12, color: 'var(--muted-text)', width: 40, textAlign: 'right' }}>{item.quantity}</span>
            <span className="font-body" style={{ fontSize: 12, color: 'var(--muted-text)' }}>→</span>
            <input
              type="number"
              min="0"
              className="modal-input"
              style={{ width: 70 }}
              value={newQtys[item.id] || ''}
              onChange={e => setNewQtys({ ...newQtys, [item.id]: e.target.value })}
              placeholder="new"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
        <button className="modal-btn-confirm" onClick={handleSubmit} disabled={!by.trim() || loading}>
          {loading ? 'Processing...' : 'Restock'}
        </button>
      </div>
    </ModalOverlay>
  );
}
