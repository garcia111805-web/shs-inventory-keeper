import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, Category } from '../types';
import ModalOverlay from './ModalOverlay';

interface Props {
  item?: InventoryItem | null;
  defaultCategory?: Category;
  onClose: () => void;
}

export default function AddEditItemModal({ item, defaultCategory, onClose }: Props) {
  const { addItem, updateItem, showToast } = useInventory();
  const isEdit = !!item;

  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState<Category>(item?.category || defaultCategory || 'cleaning');
  const [unit, setUnit] = useState(item?.unit || 'pcs');
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '0');
  const [threshold, setThreshold] = useState(item?.lowStockThreshold?.toString() || '3');
  const [notes, setNotes] = useState(item?.notes || '');

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (isEdit && item) {
      updateItem({ ...item, name: name.trim(), category, unit, quantity: parseInt(quantity) || 0, lowStockThreshold: parseInt(threshold) || 3, notes });
      showToast(`${name} updated`, 'success');
    } else {
      addItem({ name: name.trim(), category, unit, quantity: parseInt(quantity) || 0, lowStockThreshold: parseInt(threshold) || 3, notes });
      showToast(`${name} added`, 'success');
    }
    onClose();
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
        <div>
          <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Category</label>
          <select className="modal-input" value={category} onChange={e => setCategory(e.target.value as Category)}>
            <option value="cleaning">Cleaning Materials</option>
            <option value="office">Office Supplies</option>
            <option value="clinic">Clinic Supplies</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Unit</label>
            <input className="modal-input" value={unit} onChange={e => setUnit(e.target.value)} />
          </div>
          <div>
            <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Quantity</label>
            <input className="modal-input" type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          <div>
            <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Low Stock Threshold</label>
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
