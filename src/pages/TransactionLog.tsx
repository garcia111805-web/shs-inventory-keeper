import React, { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { getCategoryLabel, getDepartmentLabel } from '../types';
import { ClipboardX } from 'lucide-react';

export default function TransactionLog() {
  const { transactions, searchQuery } = useInventory();
  const [catFilter, setCatFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.itemName.toLowerCase().includes(q) || t.by.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q));
    }
    if (catFilter !== 'all') list = list.filter(t => t.category === catFilter);
    if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
    return list;
  }, [transactions, searchQuery, catFilter, typeFilter]);

  const typeColors: Record<string, string> = { restock: '#15803d', borrow: '#7c3aed', use: '#d97706' };

  return (
    <div className="p-4 md:p-8 space-y-4">
      <div className="flex flex-wrap gap-3">
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="flex-1 rounded-xl px-3 py-2.5 font-body"
          style={{ fontSize: 14, background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--fg-color)', outline: 'none' }}>
          <option value="all">All Categories</option>
          <option value="cleaning">Cleaning Materials</option>
          <option value="office">Office Supplies</option>
          <option value="clinic">Clinic Supplies</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="flex-1 rounded-xl px-3 py-2.5 font-body"
          style={{ fontSize: 14, background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--fg-color)', outline: 'none' }}>
          <option value="all">All Types</option>
          <option value="restock">Restock</option>
          <option value="borrow">Borrow</option>
          <option value="use">Use</option>
        </select>
      </div>

      <div className="rounded-2xl panel-card overflow-hidden">
        <div className="table-scroll">
        <table className="w-full">
          <thead className="sticky-thead">
            <tr style={{ background: 'var(--table-header-bg)' }}>
              {['DATE & TIME', 'ITEM', 'CATEGORY', 'DEPARTMENT', 'TYPE', 'QTY CHANGE', 'NEW STOCK', 'BY / NOTES'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-body uppercase" style={{ fontSize: 11, color: 'var(--muted-text)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardX size={48} style={{ color: 'var(--muted-text)', opacity: 0.4 }} />
                    <p className="font-body font-semibold" style={{ fontSize: 16, color: 'var(--fg-color)' }}>No Transactions Found</p>
                    <p className="font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>
                      {searchQuery ? `No results matching "${searchQuery}"` : 'Use the Restock, Use, or Borrow buttons to record your first transaction'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(tx => (
              <tr key={tx.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <td className="px-4 py-3 font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>
                  {new Date(tx.date).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-body font-semibold" style={{ fontSize: 13, color: 'var(--fg-color)' }}>{tx.itemName}</td>
                <td className="px-4 py-3 font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>{getCategoryLabel(tx.category)}</td>
                <td className="px-4 py-3 font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>{getDepartmentLabel(tx.department)}</td>
                <td className="px-4 py-3">
                  <span className="font-body font-semibold px-2 py-0.5 rounded-full text-white" style={{ fontSize: 11, background: typeColors[tx.type] }}>
                    {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 font-body font-bold" style={{ fontSize: 13, color: tx.type === 'restock' ? '#15803d' : '#b91c1c' }}>
                  {tx.type === 'restock' ? '+' : '−'}{Math.abs(tx.qtyChange)}
                </td>
                <td className="px-4 py-3 font-body" style={{ fontSize: 13, color: 'var(--fg-color)' }}>{tx.newStock}</td>
                <td className="px-4 py-3 font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>
                  {tx.by}{tx.notes ? ` · ${tx.notes}` : ''}
                  {tx.type === 'borrow' && tx.returnDate && (
                    <span style={{ display: 'block', fontSize: 11, color: '#7c3aed', marginTop: 2 }}>
                      Return: {new Date(tx.returnDate).toLocaleDateString()}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      <p className="font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>{filtered.length} transactions found</p>
    </div>
  );
}
