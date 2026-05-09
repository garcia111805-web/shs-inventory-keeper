import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, Category, DEFAULT_UNITS } from '../types';
import { useLocations } from '../hooks/useLocations';
import { useCategories } from '../hooks/useCategories';
import { useUnits } from '../hooks/useUnits';
import ModalOverlay from './ModalOverlay';
import { formatItemName } from '../lib/utils';

interface Props {
  item?: InventoryItem | null;
  defaultCategory?: Category;
  onClose: () => void;
}

export default function AddEditItemModal({ item, defaultCategory, onClose }: Props) {
  const { addItem, updateItem, showToast } = useInventory();
  const { locations } = useLocations();
  const { categories } = useCategories();
  const { units: dbUnits } = useUnits();
  const isEdit = !!item;

  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState<Category>(item?.category || defaultCategory || 'cleaning');
  const [unit, setUnit] = useState(item?.unit || 'pcs');
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '0');
  const [threshold, setThreshold] = useState(item?.lowStockThreshold?.toString() || '3');
  const [notes, setNotes] = useState(item?.notes || '');
  const [location, setLocation] = useState(item?.location || '');
  const [isConsumable, setIsConsumable] = useState<boolean>(item?.isConsumable ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || loading) return;
    const formattedName = formatItemName(name);
    const qtyVal = parseInt(quantity) || 0;
    if (qtyVal < 0) {
      showToast('Quantity cannot be negative', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (isEdit && item) {
        await updateItem({
          ...item,
          name: formattedName,
          category,
          unit,
          quantity: parseInt(quantity) || 0,
          lowStockThreshold: parseInt(threshold) || 3,
          notes,
          location: location || undefined,
          isConsumable,
        });
        showToast(`${formattedName} updated`, 'success');
      } else {
        const result = await addItem({
          name: formattedName,
          category,
          unit,
          quantity: parseInt(quantity) || 0,
          lowStockThreshold: parseInt(threshold) || 3,
          notes,
          location: location || undefined,
          isConsumable,
        });
        if (result.merged) {
          showToast(`Merged with existing ${formattedName}`, 'success');
        } else {
          showToast(`${formattedName} added`, 'success');
        }
      }
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Operation failed', 'error');
      setLoading(false);
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
            <select className="modal-input" value={category} onChange={e => setCategory(e.target.value)}>
              {categories.length === 0 ? (
                <>
                  <option value="cleaning">Cleaning Materials</option>
                  <option value="office">Office Supplies</option>
                  <option value="clinic">Clinic Supplies</option>
                </>
              ) : (
                categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</option>
                ))
              )}
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
          <div className="col-span-3">
            <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
              Item Classification
              <span title="Consumables can only be 'Used' (deducted). Assets can only be 'Borrowed' (requires return)." style={{ cursor: 'help', fontSize: 13 }}>ℹ️</span>
            </label>
            <select
              className="modal-input"
              value={isConsumable ? 'true' : 'false'}
              onChange={e => setIsConsumable(e.target.value === 'true')}
            >
              <option value="true">Consumable (e.g. Soap, Alcohol, Paper)</option>
              <option value="false">Non-consumable Asset (e.g. Broom, Monitor)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Unit</label>
            <select className="modal-input" value={unit} onChange={e => setUnit(e.target.value)}>
              {dbUnits.length === 0 ? (
                DEFAULT_UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))
              ) : (
                dbUnits.map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))
              )}
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
        <button className="modal-btn-confirm" onClick={handleSubmit} disabled={!name.trim() || loading}>
          {loading ? 'Processing...' : isEdit ? 'Save Changes' : 'Add Item'}
        </button>
      </div>
    </ModalOverlay>
  );
}
