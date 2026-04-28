import { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Category, InventoryItem, getStatus, ItemStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import AddEditItemModal from '../components/AddEditItemModal';
import StockMovementModal from '../components/StockMovementModal';
import BulkRestockModal from '../components/BulkRestockModal';
import { Plus, Pencil, Trash2, Download, PackageSearch } from 'lucide-react';

interface Props {
  category: Category;
  onAddItem: () => void;
}

export default function InventoryPage({ category, onAddItem }: Props) {
  const { items, deleteItem, searchQuery, showToast } = useInventory();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [transactionItem, setTransactionItem] = useState<InventoryItem | null>(null);
  const [showBulkRestock, setShowBulkRestock] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;

  const filtered = useMemo(() => {
    let list = items.filter(i => i.category === category);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      list = list.filter(i => getStatus(i) === statusFilter);
    }
    return list;
  }, [items, category, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleDelete = async (item: InventoryItem) => {
    if (confirm(`Delete "${item.name}"?`)) {
      try {
        await deleteItem(item.id);
        showToast(`${item.name} deleted`, 'success');
      } catch (err: any) {
        showToast(err?.message || 'Delete failed', 'error');
      }
    }
  };

  const exportCSV = () => {
    const headers = ['#', 'Item Name', 'Unit', 'Qty', 'Status', 'Last Updated'];
    const rows = filtered.map((item, i) => [i + 1, item.name, item.unit, item.quantity, getStatus(item), item.lastUpdated]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category}-inventory.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported!', 'success');
  };

  const statusColor = (status: ItemStatus) => {
    if (status === 'in-stock') return '#15803d';
    if (status === 'low-stock') return '#d97706';
    return '#b91c1c';
  };

  return (
    <div className="p-4 md:p-8 space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-xl px-3 py-2.5 font-body w-full sm:w-auto sm:flex-1"
          style={{ fontSize: 14, background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--fg-color)', outline: 'none' }}
        >
          <option value="all">All Status</option>
          <option value="in-stock">In Stock</option>
          <option value="low-stock">Low Stock</option>
          <option value="out-of-stock">Out of Stock</option>
        </select>
        <div className="hidden sm:flex flex-1" />
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowBulkRestock(true)}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-body font-semibold text-white"
            style={{ fontSize: 14, background: '#0d1b6e' }}
          >
            Bulk Restock
          </button>
          <button
            onClick={exportCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-body font-semibold"
            style={{ fontSize: 14, background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--fg-color)' }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl panel-card overflow-hidden">
        <div className="table-scroll">
        <table className="w-full">
          <thead className="sticky-thead">
            <tr style={{ background: 'var(--table-header-bg)' }}>
              {['#', 'ITEM NAME', 'UNIT', 'QTY', 'STATUS', 'LAST UPDATED', 'ACTIONS'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-body uppercase" style={{ fontSize: 11, color: 'var(--muted-text)', fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <PackageSearch size={48} style={{ color: 'var(--muted-text)', opacity: 0.4 }} />
                    <p className="font-body font-semibold" style={{ fontSize: 16, color: 'var(--fg-color)' }}>No Items Found</p>
                    <p className="font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>
                      {searchQuery ? `No results matching "${searchQuery}"` : 'Add your first item to get started'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : paginated.map((item, idx) => {
              const status = getStatus(item);
              return (
                <tr key={item.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td className="px-4 py-3 font-body" style={{ fontSize: 14, color: 'var(--muted-text)' }}>
                    {(currentPage - 1) * perPage + idx + 1}
                  </td>
                  <td className="px-4 py-3 font-body font-semibold" style={{ fontSize: 14, color: 'var(--fg-color)' }}>
                    {item.name}
                  </td>
                  <td className="px-4 py-3 font-body" style={{ fontSize: 14, color: 'var(--muted-text)' }}>
                    {item.unit}
                  </td>
                  <td className="px-4 py-3 font-body font-bold" style={{ fontSize: 14, color: statusColor(status), letterSpacing: '-0.5px' }}>
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={status} /></td>
                  <td className="px-4 py-3 font-body" style={{ fontSize: 14, color: 'var(--muted-text)' }}>
                    {new Date(item.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {[
                        { color: '#e8b400', icon: <Plus size={14} color="white" />, tip: 'Restock / Use / Borrow', onClick: () => setTransactionItem(item) },
                        { color: '#0d1b6e', icon: <Pencil size={14} color="white" />, tip: 'Edit item', onClick: () => setEditingItem(item) },
                        { color: '#b71c1c', icon: <Trash2 size={14} color="white" />, tip: 'Delete item', onClick: () => handleDelete(item) },
                      ].map((btn, i) => (
                        <div key={i} className="relative group">
                          <button
                            onClick={btn.onClick}
                            className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
                            style={{ width: 28, height: 28, background: btn.color }}
                          >
                            {btn.icon}
                          </button>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-white font-body opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
                            style={{ fontSize: 11, background: '#1f2937', zIndex: 10 }}>
                            {btn.tip}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 font-body" style={{ fontSize: 14, color: 'var(--fg-color)' }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="modal-btn-cancel">Prev</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="modal-btn-cancel">Next</button>
        </div>
      )}

      {editingItem && <AddEditItemModal item={editingItem} onClose={() => setEditingItem(null)} />}
      {transactionItem && <StockMovementModal item={transactionItem} onClose={() => setTransactionItem(null)} />}
      {showBulkRestock && <BulkRestockModal category={category} onClose={() => setShowBulkRestock(false)} />}
    </div>
  );
}
