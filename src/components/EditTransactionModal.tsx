import React, { useState } from 'react';
import { Transaction } from '../types';
import ModalOverlay from './ModalOverlay';
import { useInventory } from '../context/InventoryContext';

interface EditTransactionModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export default function EditTransactionModal({ transaction, onClose }: EditTransactionModalProps) {
  const { updateTransaction, showToast } = useInventory();
  const [by, setBy] = useState(transaction.by);
  const [notes, setNotes] = useState(transaction.notes);
  const [returnDate, setReturnDate] = useState(transaction.returnDate || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!by.trim()) {
      showToast('Staff/Borrower name is required', 'warning');
      return;
    }

    setLoading(true);
    try {
      await updateTransaction({
        ...transaction,
        by,
        notes,
        returnDate: returnDate || undefined,
      });
      showToast('Transaction updated successfully', 'success');
      onClose();
    } catch (err) {
      showToast('Failed to update transaction', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay title="Edit Transaction Details" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        
        <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--card-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--heading-color)' }}>
            Editing: {transaction.itemName} ({transaction.type.toUpperCase()})
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-text)' }}>
            Note: Item quantity and type cannot be edited to maintain inventory accuracy.
          </p>
        </div>

        <div>
          <label className="block font-semibold mb-1.5" style={{ fontSize: 13, color: 'var(--heading-color)' }}>
            Staff / Borrower Name *
          </label>
          <input
            autoFocus
            type="text"
            required
            value={by}
            onChange={e => setBy(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 font-body"
            style={{ fontSize: 14, background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--fg-color)', outline: 'none' }}
          />
        </div>



        {transaction.type === 'borrow' && (
          <div>
            <label className="block font-semibold mb-1.5" style={{ fontSize: 13, color: 'var(--heading-color)' }}>
              Expected Return Date
            </label>
            <input
              type="date"
              value={returnDate}
              onChange={e => setReturnDate(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 font-body"
              style={{ fontSize: 14, background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--fg-color)', outline: 'none' }}
            />
          </div>
        )}

        <div>
          <label className="block font-semibold mb-1.5" style={{ fontSize: 13, color: 'var(--heading-color)' }}>
            Notes / Reason
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 font-body resize-none"
            placeholder="Reason for borrowing, condition of item, etc..."
            style={{ fontSize: 14, background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--fg-color)', outline: 'none' }}
          />
        </div>

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-bold font-body transition-colors"
            style={{ fontSize: 14, background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--heading-color)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl font-bold font-body text-white transition-opacity"
            style={{ fontSize: 14, background: '#0d1b6e', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}
