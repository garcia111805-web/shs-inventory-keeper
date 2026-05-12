import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { X, ShieldAlert, CheckCircle, Trash2 } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';

interface Props {
  item: InventoryItem;
  onClose: () => void;
}

export default function QuarantineModal({ item, onClose }: Props) {
  const { releaseFromQuarantine, disposeFromQuarantine, showToast } = useInventory();
  const { user } = useAuth();
  const [qty, setQty] = useState(item.quarantineQuantity);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRelease = async () => {
    if (qty <= 0 || qty > item.quarantineQuantity) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }
    setLoading(true);
    try {
      await releaseFromQuarantine(item.id, qty, notes || 'Item repaired and released', user?.fullName || 'Admin');
      showToast(`${qty} ${item.unit} released to available stock.`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to release item', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDispose = async () => {
    if (!confirm(`Are you sure you want to DISPOSE of ${qty} quarantined items?\n\nThis will permanently remove them from the system as broken/unusable.`)) return;
    
    setLoading(true);
    try {
      await disposeFromQuarantine(item.id, qty, notes || 'Disposed as completely unrepairable/broken', user?.fullName || 'Admin');
      showToast(`${qty} ${item.unit} disposed and permanently removed from system.`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to dispose item', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up" style={{ border: '1px solid var(--card-border)' }}>
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100" style={{ background: '#fef2f2' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner" style={{ background: '#b91c1c', color: 'white' }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 className="font-heading font-black tracking-tight" style={{ fontSize: 22, color: '#b91c1c' }}>Manage Quarantine</h2>
              <p className="font-body font-bold" style={{ fontSize: 14, color: '#991b1b', opacity: 0.8 }}>{item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full hover:bg-red-100 transition-colors" style={{ color: '#b91c1c' }}>
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="p-5 rounded-2xl border-2 border-dashed border-red-200" style={{ background: '#fffafa' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body font-bold text-red-900" style={{ fontSize: 13 }}>Current Quarantined Stock</p>
                <p className="font-heading font-black text-4xl mt-1" style={{ color: '#b91c1c' }}>{item.quarantineQuantity} <span className="text-xl font-bold opacity-60">{item.unit}</span></p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-full font-body font-black text-[10px] bg-red-600 text-white shadow-sm">DAMAGED / UNDER REPAIR</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-body font-bold mb-2 ml-1" style={{ fontSize: 12, color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                Quantity to Handle
              </label>
              <input
                type="number"
                min={1}
                max={item.quarantineQuantity}
                value={qty}
                onChange={e => setQty(parseInt(e.target.value) || 0)}
                className="w-full px-5 py-3.5 rounded-2xl font-body font-bold shadow-sm"
                style={{ fontSize: 16, background: 'var(--input-bg)', border: '1px solid var(--input-border)', outline: 'none' }}
              />
            </div>
            <div>
              <label className="block font-body font-bold mb-2 ml-1" style={{ fontSize: 12, color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                Admin Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Fixed wheel, Replaced parts"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-5 py-3.5 rounded-2xl font-body shadow-sm"
                style={{ fontSize: 14, background: 'var(--input-bg)', border: '1px solid var(--input-border)', outline: 'none' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button
              onClick={handleRelease}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl font-heading font-black text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              style={{ background: '#15803d', fontSize: 15 }}
            >
              <CheckCircle size={20} /> RELEASE TO STOCK
            </button>
            <button
              onClick={handleDispose}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl font-heading font-black text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              style={{ background: '#0f172a', fontSize: 15 }}
            >
              <Trash2 size={20} /> DISPOSE ITEM
            </button>
          </div>
          
          <p className="text-center font-body italic" style={{ fontSize: 12, color: 'var(--muted-text)' }}>
            Release moves items back to Available. Dispose removes them permanently.
          </p>
        </div>
      </div>
    </div>
  );
}
