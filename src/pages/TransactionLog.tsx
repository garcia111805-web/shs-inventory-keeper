import React, { useMemo, useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { getCategoryLabel } from '../types';
import { ClipboardX, Pencil, Undo2, CornerDownLeft, Search, ChevronDown, RefreshCw } from 'lucide-react';
import { Transaction, Category } from '../types';
import EditTransactionModal from '../components/EditTransactionModal';
import ReturnItemsModal from '../components/ReturnItemsModal';

// --- Modern Custom Select Component ---
function ModernSelect({ value, onChange, options, label }: { value: string, onChange: (v: string) => void, options: { value: string, label: string }[], label: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentLabel = options.find(o => o.value === value)?.label || label;

  return (
    <div className="relative" style={{ minWidth: 160 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl font-body font-semibold transition-all"
        style={{ 
          fontSize: 14, 
          background: 'var(--input-bg)', 
          border: '1px solid var(--card-border)', 
          color: 'var(--fg-color)',
          boxShadow: isOpen ? '0 0 0 2px rgba(13, 27, 110, 0.2)' : 'none'
        }}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ background: 'var(--dropdown-bg)', border: '1px solid var(--card-border)', minWidth: 200 }}>
            <div className="max-h-60 overflow-y-auto py-1">
              {options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className="w-full text-left px-4 py-3 font-body transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  style={{ 
                    fontSize: 14, 
                    color: value === opt.value ? '#7c3aed' : 'var(--fg-color)',
                    background: value === opt.value ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                    fontWeight: value === opt.value ? 700 : 500
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function TransactionLog() {
  const { transactions, searchQuery: globalSearch, voidTransaction, showToast, refreshData, loading } = useInventory();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [localSearch, setLocalSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [returnTx, setReturnTx] = useState<Transaction | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData?.();
      showToast('Data refreshed', 'success');
    } catch (err) {
      showToast('Refresh failed', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const handler = (e: any) => {
      setLocalSearch(e.detail || '');
    };
    window.addEventListener('set-transaction-search', handler);
    return () => window.removeEventListener('set-transaction-search', handler);
  }, []);

  const search = localSearch || globalSearch;

  const filtered = useMemo(() => {
    let list = [...transactions];
    const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const q = normalize(search);
    
    if (!isAdmin) {
      if (!q) return [];
      // Deep search: check every potential name field
      list = list.filter(tx => {
        const potentialNames = [
          tx.by,
          (tx as any).staff_name,
          (tx as any).staffName,
          (tx as any).borrower
        ];
        return potentialNames.some(name => normalize(name).includes(q));
      });
    } else if (q) {
      list = list.filter(t => 
        normalize(t.itemName).includes(q) || 
        normalize(t.by).includes(q) || 
        normalize(t.notes).includes(q)
      );
    }

    if (catFilter !== 'all') list = list.filter(t => t.category === catFilter);
    if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
    return list;
  }, [transactions, search, catFilter, typeFilter, isAdmin]);

  const typeColors: Record<string, string> = { restock: '#15803d', borrow: '#7c3aed', use: '#d97706', return: '#16a34a', quarantine: '#dc2626', release: '#10b981' };

  return (
    <div className="p-4 md:p-8 space-y-4">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {isAdmin && (
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by staff name or item..."
              className="w-full rounded-xl px-4 py-2.5 font-body"
              style={{ paddingLeft: '2.5rem', background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--fg-color)', outline: 'none' }}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--muted-text)' }} />
          </div>
        )}
        {!isAdmin && (
          <div className="flex-1 p-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(13,27,110,0.06)', border: '1px solid rgba(13,27,110,0.1)' }}>
            <Search size={16} style={{ color: '#0d1b6e' }} />
            <span className="font-body font-semibold" style={{ fontSize: 14, color: '#0d1b6e' }}>
              Showing items borrowed by: <span className="font-bold underline">{search}</span>
            </span>
          </div>
        )}
        <div className="flex gap-3">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-xl px-4 py-2 font-body font-bold transition-all"
            style={{ fontSize: 13, background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--fg-color)' }}
          >
            {isRefreshing ? <RefreshCw size={14} className="animate-spin" /> : 'Refresh List'}
          </button>
          
          <ModernSelect 
            label="All Categories"
            value={catFilter} 
            onChange={setCatFilter}
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'cleaning', label: 'Cleaning Materials' },
              { value: 'office', label: 'Office Supplies' },
              { value: 'clinic', label: 'Clinic Supplies' },
            ]}
          />

          <ModernSelect 
            label="All Types"
            value={typeFilter} 
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'restock', label: 'Restock' },
              { value: 'borrow', label: 'Borrow' },
              { value: 'use', label: 'Use' },
            ]}
          />
        </div>
      </div>

      <div className="rounded-2xl panel-card overflow-hidden">
        <div className="table-scroll">
        <table className="w-full">
          <thead className="sticky-thead">
            <tr style={{ background: 'transparent', borderBottom: '1px solid var(--card-border)' }}>
              {['DATE & TIME', 'ITEM', 'CATEGORY', 'TYPE', 'QTY CHANGE', 'NEW STOCK', 'STAFF / REMARKS', ''].map(h => (
                <th key={h} className="text-left px-4 py-4 font-body uppercase" style={{ fontSize: 13, color: 'var(--fg-color)', fontWeight: 700, opacity: 0.9, letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardX size={48} style={{ color: 'var(--muted-text)', opacity: 0.4 }} />
                    <p className="font-body font-semibold" style={{ fontSize: 16, color: 'var(--fg-color)' }}>
                      {loading ? 'Loading from database...' : 'No Transactions Found'}
                    </p>
                    <p className="font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>
                      {loading ? 'Please wait while we fetch your records.' : 
                        (transactions.length > 0 && search ? `We found ${transactions.length} total records, but none match "${search}".` : 'Your transaction history is completely clean and empty.')}
                    </p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(tx => (
              <tr key={tx.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <td className="px-4 py-4 font-body" style={{ fontSize: 14, color: 'var(--fg-color)', opacity: 0.9 }}>
                  {new Date(tx.date).toLocaleString()}
                </td>
                <td className="px-4 py-4 font-body font-bold" style={{ fontSize: 15, color: 'var(--heading-color)' }}>{tx.itemName}</td>
                <td className="px-4 py-4 font-body" style={{ fontSize: 14, color: 'var(--fg-color)', opacity: 0.9 }}>{getCategoryLabel(tx.category)}</td>
                <td className="px-4 py-4">
                  <span className="font-body font-bold px-3 py-1 rounded-full text-white shadow-sm" style={{ fontSize: 12, background: typeColors[tx.type] }}>
                    {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-4 font-body font-bold" style={{ fontSize: 15, color: tx.qtyChange > 0 ? '#16a34a' : '#dc2626' }}>
                  {tx.qtyChange > 0 ? '+' : '−'}{Math.abs(tx.qtyChange)}
                </td>
                <td className="px-4 py-4 font-body font-bold" style={{ fontSize: 15, color: 'var(--heading-color)' }}>{tx.newStock}</td>
                <td className="px-4 py-4 font-body" style={{ fontSize: 14, color: 'var(--fg-color)', opacity: 0.9 }}>
                  <span className="font-bold">{tx.by}</span>{tx.notes ? ` · ${tx.notes}` : ''}
                  {tx.type === 'borrow' && tx.returnDate && (
                    <span style={{ display: 'block', fontSize: 12, color: '#8b5cf6', marginTop: 4, fontWeight: 600 }}>
                      Return: {new Date(tx.returnDate).toLocaleDateString()}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {tx.type === 'borrow' && (
                      <button 
                        onClick={() => setReturnTx(tx)} 
                        className="p-1.5 rounded-lg text-white transition-transform hover:scale-110"
                        title="Return Item"
                        style={{ background: '#15803d' }}
                      >
                        <CornerDownLeft size={14} />
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button 
                          onClick={() => setEditingTx(tx)} 
                          className="p-1.5 rounded-lg text-white transition-transform hover:scale-110"
                          title="Edit Details"
                          style={{ background: '#0d1b6e' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={async () => {
                            if (!confirm(`Are you sure you want to VOID this transaction?\n\nThis will reverse the quantity change (${tx.qtyChange > 0 ? '+' : ''}${tx.qtyChange}) and permanently delete this record.`)) return;
                            try {
                              await voidTransaction(tx);
                              showToast('Transaction voided successfully', 'success');
                            } catch (err: any) {
                              showToast(err.message || 'Failed to void transaction', 'error');
                            }
                          }} 
                          className="p-1.5 rounded-lg text-white transition-transform hover:scale-110"
                          title="Void Transaction"
                          style={{ background: '#b91c1c' }}
                        >
                          <Undo2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      <p className="font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>{filtered.length} transactions found</p>
      
      {editingTx && (
        <EditTransactionModal 
          transaction={editingTx} 
          onClose={() => setEditingTx(null)} 
        />
      )}
      
      {returnTx && (
        <ReturnItemsModal 
          transaction={returnTx} 
          onClose={() => setReturnTx(null)} 
        />
      )}
    </div>
  );
}
