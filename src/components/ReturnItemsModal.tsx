import React, { useState, useEffect } from 'react';
import { InventoryItem, Transaction } from '../types';
import { X, CornerDownLeft } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { supabase } from '../lib/supabase';

interface Props {
  transaction: Transaction;
  onClose: () => void;
}

export default function ReturnItemsModal({ transaction, onClose }: Props) {
  const { addTransaction, moveItemToQuarantine, showToast } = useInventory();
  const maxReturn = Math.abs(transaction.qtyChange);
  const [returnQty, setReturnQty] = useState<number>(maxReturn);
  const [isDamaged, setIsDamaged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [itemStock, setItemStock] = useState<number | null>(null);

  useEffect(() => {
    const fetchStock = async () => {
      const { data } = await supabase.from('items').select('quantity').eq('id', transaction.itemId).single();
      if (data) setItemStock(data.quantity);
    };
    fetchStock();
  }, [transaction.itemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (returnQty <= 0 || returnQty > maxReturn) {
      showToast(`Please enter a valid quantity between 1 and ${maxReturn}`, 'error');
      return;
    }
    if (itemStock === null) {
      showToast('Still loading item data, please wait...', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (isDamaged) {
        // Use the specialized quarantine function for returns
        await moveItemToQuarantine(
          transaction.itemId,
          returnQty,
          notes || 'Returned as damaged',
          'System (Auto-Quarantine)',
          true // isReturn = true
        );
      } else {
        // Standard return
        await addTransaction({
          itemId: transaction.itemId,
          itemName: transaction.itemName,
          category: transaction.category,
          type: 'return',
          qtyChange: returnQty,
          newStock: itemStock + returnQty,
          by: transaction.by,
          notes: 'Returned from previous borrow',
          date: new Date().toISOString()
        });
      }

      showToast(isDamaged 
        ? `${returnQty} item(s) returned and MARKED DAMAGED.`
        : `${returnQty} item(s) returned successfully!`, 
        isDamaged ? 'warning' : 'success'
      );
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to process return', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up" style={{ border: '1px solid var(--card-border)' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100" style={{ background: '#f8fafc' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#15803d', color: 'white' }}>
              <CornerDownLeft size={20} />
            </div>
            <div>
              <h2 className="font-heading font-bold" style={{ fontSize: 18, color: '#0d1b6e' }}>Return Items</h2>
              <p className="font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>{transaction.itemName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 transition-colors" style={{ color: 'var(--muted-text)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="p-4 rounded-xl" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
            <p className="font-body" style={{ fontSize: 13, color: '#475569' }}>
              <strong>Borrower:</strong> {transaction.by}
            </p>
            <p className="font-body mt-1" style={{ fontSize: 13, color: '#475569' }}>
              <strong>Total Borrowed:</strong> {maxReturn}
            </p>
          </div>

          <div>
            <label className="block font-body font-semibold mb-2" style={{ fontSize: 13, color: 'var(--fg-color)' }}>
              Quantity to Return
            </label>
            <input
              type="number"
              min={1}
              max={maxReturn}
              value={returnQty}
              onChange={e => setReturnQty(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl font-body"
              style={{ fontSize: 15, background: 'var(--input-bg)', border: '1px solid var(--input-border)', outline: 'none' }}
              autoFocus
            />
          </div>

          {/* Quarantine Toggle */}
          <div 
            className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all"
            style={{ 
              background: isDamaged ? 'rgba(185, 28, 28, 0.05)' : '#f8fafc', 
              border: `1px solid ${isDamaged ? '#b91c1c' : '#e2e8f0'}`
            }}
            onClick={() => setIsDamaged(!isDamaged)}
          >
            <div className="flex flex-col">
              <span className="font-body font-bold" style={{ fontSize: 13, color: isDamaged ? '#b91c1c' : '#0d1b6e' }}>
                Mark as Damaged
              </span>
              <span className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>
                Move these items directly to Damaged Items
              </span>
            </div>
            <div 
              className="w-10 h-5 rounded-full relative transition-colors"
              style={{ background: isDamaged ? '#b91c1c' : '#cbd5e1' }}
            >
              <div 
                className="absolute top-1 w-3 h-3 bg-white rounded-full transition-all"
                style={{ left: isDamaged ? '24px' : '4px' }}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || itemStock === null}
              className="w-full py-3.5 rounded-xl font-body font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: isDamaged ? '#b91c1c' : '#15803d', fontSize: 15 }}
            >
              {loading ? 'Processing...' : isDamaged ? 'Return & Mark Damaged' : 'Process Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
