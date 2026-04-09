import { useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Category, getCategoryLabel, getStatus } from '../types';
import StatusBadge from '../components/StatusBadge';

export default function TransactionLog() {
  const { transactions, searchQuery } = useInventory();
  const [catFilter, setCatFilter] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');

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

  const typeColors = { restock: '#1d4ed8', borrow: '#d97706', use: '#b91c1c' };

  return (
    <div className="p-8 space-y-4">
      <div className="flex gap-3">
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
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--table-header-bg)' }}>
              {['DATE & TIME', 'ITEM', 'CATEGORY', 'TYPE', 'QTY CHANGE', 'NEW STOCK', 'BY / NOTES'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-body uppercase" style={{ fontSize: 11, color: 'var(--muted-text)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 font-body" style={{ color: 'var(--muted-text)' }}>No transactions found</td></tr>
            ) : filtered.map(tx => (
              <tr key={tx.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <td className="px-4 py-3 font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>
                  {new Date(tx.date).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-body font-semibold" style={{ fontSize: 13, color: 'var(--fg-color)' }}>{tx.itemName}</td>
                <td className="px-4 py-3 font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>{getCategoryLabel(tx.category)}</td>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>{filtered.length} transactions found</p>
    </div>
  );
}

import React from 'react';
