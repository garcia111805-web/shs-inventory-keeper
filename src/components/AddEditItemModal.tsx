import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, Category, UNITS } from '../types';
import { useLocations } from '../hooks/useLocations';
import ModalOverlay from './ModalOverlay';

interface Props {
  item?: InventoryItem | null;
  defaultCategory?: Category;
  onClose: () => void;
}

export default function AddEditItemModal({ item, defaultCategory, onClose }: Props) {
  const { addItem, updateItem, showToast } = useInventory();
  const { locations } = useLocations();
  const isEdit = !!item;

  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState<Category>(item?.category || defaultCategory || 'cleaning');
  const [unit, setUnit] = useState(item?.unit || 'pcs');
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '0');
  const [threshold, setThreshold] = useState(item?.lowStockThreshold?.toString() || '3');
  const [notes, setNotes] = useState(item?.notes || '');
  const [location, setLocation] = useState(item?.location || '');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      if (isEdit && item) {
        await updateItem({
          ...item,
          name: name.trim(),
          category,
          unit,
          quantity: parseInt(quantity) || 0,
          lowStockThreshold: parseInt(threshold) || 3,
          notes,
          location: location || undefined,
        });
        showToast(`${name} updated`, 'success');
      } else {
        await addItem({
          name: name.trim(),
          category,
          unit,
          quantity: parseInt(quantity) || 0,
          lowStockThreshold: parseInt(threshold) || 3,
          notes,
          location: location || undefined,
        });
        showToast(`${name} added`, 'success');
      }
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Operation failed', 'error');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h3 className="font-heading font-bold mb-4" style={{ fontSize: 18, color: 'var(--heading-color)' }}>
        {isEdit ? 'Edit Item' : 'Add New Item'}
      </h3>
      <div className="space-y-3">
        <div>
          <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Name</label>
          <input className="modal-input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Category</label>
            <select className="modal-input" value={category} onChange={e => setCategory(e.target.value as Category)}>
              <option value="cleaning">Cleaning Materials</option>
              <option value="office">Office Supplies</option>
              <option value="clinic">Clinic Supplies</option>
            </select>
          </div>
          <div>
            <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Location</label>
            <select
              className="modal-input"
              value={location}
              onChange={e => setLocation(e.target.value)}
            >
              <option value="">— None —</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.name}>{loc.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Unit</label>
            <select className="modal-input" value={unit} onChange={e => setUnit(e.target.value)}>
              {UNITS.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>{isEdit ? 'Quantity' : 'Initial Stock Level'}</label>
            <input className="modal-input" type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          <div>
            <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
              Low Stock Threshold
              <span title="When stock drops to or below this number, the item will be flagged as 'Low Stock' on the dashboard." style={{ cursor: 'help', fontSize: 13 }}>ℹ️</span>
            </label>
            <input className="modal-input" type="number" min="0" value={threshold} onChange={e => setThreshold(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Notes</label>
          <textarea className="modal-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="modal-btn-cancel" onClick={onClose}>Cancel</button>
        <button className="modal-btn-confirm" onClick={handleSubmit} disabled={!name.trim()}>
          {isEdit ? 'Save Changes' : 'Add Item'}
        </button>
      </div>
    </ModalOverlay>
  );
}
