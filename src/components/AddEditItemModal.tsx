import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem, Category, DEFAULT_UNITS } from '../types';
import { useLocations } from '../hooks/useLocations';
import { useCategories } from '../hooks/useCategories';
import { useUnits } from '../hooks/useUnits';
import ModalOverlay from './ModalOverlay';
import { formatItemName, guessConsumable } from '../lib/utils';
import { PackagePlus, ShoppingBag, CheckCircle2 } from 'lucide-react';

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
    const formattedUnit = unit.trim().toUpperCase();
    const formattedLocation = location.trim().toUpperCase();
    const qtyVal = parseInt(quantity) || 0;
    const guessedConsumable = guessConsumable(formattedName);
    const finalIsConsumable = isEdit ? isConsumable : (item ? isConsumable : guessedConsumable);
    
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
          unit: formattedUnit,
          quantity: parseInt(quantity) || 0,
          lowStockThreshold: parseInt(threshold) || 3,
          notes,
          location: formattedLocation || undefined,
          isConsumable: finalIsConsumable,
        });
        showToast(`${formattedName} updated`, 'success');
      } else {
        const result = await addItem({
          name: formattedName,
          category,
          unit: formattedUnit,
          quantity: parseInt(quantity) || 0,
          lowStockThreshold: parseInt(threshold) || 3,
          notes,
          location: formattedLocation || undefined,
          isConsumable: finalIsConsumable,
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
          <input className="modal-input" placeholder="Enter item name..." value={name} onChange={e => setName(e.target.value)} />
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
        <div className="space-y-1.5">
          <label className="font-body text-xs block font-bold" style={{ color: 'var(--fg-color)' }}>
            Item Classification <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Consumable Option */}
            <button
              type="button"
              onClick={() => setIsConsumable(true)}
              className={`p-3 rounded-xl border-2 text-left transition-all flex items-start gap-3 relative cursor-pointer ${
                isConsumable
                  ? 'border-[#d97706] bg-amber-500/10 shadow-sm'
                  : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/50 dark:bg-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isConsumable ? 'bg-[#d97706] text-white shadow' : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                }`}
              >
                <PackagePlus size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-sm" style={{ color: isConsumable ? '#d97706' : 'var(--fg-color)' }}>
                    Consumable Supply
                  </span>
                  {isConsumable && <CheckCircle2 size={16} className="text-[#d97706]" />}
                </div>
                <p className="font-body text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                  Single-use supplies (soap, chalk, ink, paper). Appears in <strong>Use Consumables</strong>.
                </p>
              </div>
            </button>

            {/* Asset Option */}
            <button
              type="button"
              onClick={() => setIsConsumable(false)}
              className={`p-3 rounded-xl border-2 text-left transition-all flex items-start gap-3 relative cursor-pointer ${
                !isConsumable
                  ? 'border-[#7c3aed] bg-purple-500/10 shadow-sm'
                  : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/50 dark:bg-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  !isConsumable ? 'bg-[#7c3aed] text-white shadow' : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                }`}
              >
                <ShoppingBag size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-sm" style={{ color: !isConsumable ? '#7c3aed' : 'var(--fg-color)' }}>
                    Non-Consumable / Equipment
                  </span>
                  {!isConsumable && <CheckCircle2 size={16} className="text-[#7c3aed]" />}
                </div>
                <p className="font-body text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                  Durable tools & items (brooms, calculators, USBs). Appears in <strong>Borrow Items</strong>.
                </p>
              </div>
            </button>
          </div>
        </div>
        <div className={`grid ${isEdit ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
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
          {!isEdit && (
            <div>
              <label className="font-body text-xs mb-1 block" style={{ color: 'var(--muted-text)' }}>Initial Stock Level</label>
              <input className="modal-input" type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
          )}
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
