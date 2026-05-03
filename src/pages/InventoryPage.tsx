import { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { Category, InventoryItem, getStatus, ItemStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import AddEditItemModal from '../components/AddEditItemModal';
import StockMovementModal from '../components/StockMovementModal';
import BulkRestockModal from '../components/BulkRestockModal';
import { Plus, Pencil, Trash2, Download, PackageSearch, Upload, Handshake, PackageMinus, PackagePlus, Home, ChevronDown } from 'lucide-react';

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
            style={{ background: 'var(--dropdown-bg)', border: '1px solid var(--card-border)', minWidth: 180 }}>
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

interface Props {
  category: Category;
  onAddItem?: () => void;
  onImportCSV?: () => void;
  onStockMovement?: (type: 'restock' | 'use' | 'borrow') => void;
}

export default function InventoryPage({ category, onAddItem, onImportCSV, onStockMovement }: Props) {
  const { items, deleteItem, showToast, searchQuery, setSearchQuery, setCurrentPage: setGlobalPage } = useInventory();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [transactionItem, setTransactionItem] = useState<InventoryItem | null>(null);
  const [showBulkRestock, setShowBulkRestock] = useState(false);

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


  const paginated = filtered;

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
    const headers = ['#', 'Item Name', 'Unit', 'Qty', 'Location', 'Status', 'Last Updated'];
    const rows = filtered.map((item, i) => [i + 1, item.name, item.unit, item.quantity, item.location || '', getStatus(item), item.lastUpdated]);
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

  const categories: { id: Category; label: string }[] = [
    { id: 'cleaning', label: 'Cleaning Materials' },
    { id: 'office', label: 'Office Supplies' },
    { id: 'clinic', label: 'Clinic Supplies' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Borrower Navigation */}
      {!isAdmin && (
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-2">
          <button
            onClick={() => setGlobalPage('portal')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-body font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ color: 'var(--heading-color)', border: '1px solid var(--card-border)' }}
          >
            <Home size={18} /> Back to Portal
          </button>
          
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50 w-full sm:w-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setGlobalPage(cat.id)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-body font-semibold text-sm transition-all`}
                style={{
                  background: category === cat.id ? 'white' : 'transparent',
                  color: category === cat.id ? '#0d1b6e' : 'var(--muted-text)',
                  boxShadow: category === cat.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <PackageSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#0d1b6e' }} />
          <input
            type="text"
            placeholder="Search items..."
            className="w-full rounded-xl pl-9 pr-3 py-2.5 font-body"
            style={{ fontSize: 14, background: '#ffffff', border: '1px solid #0d1b6e', color: '#0d1b6e', outline: 'none' }}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPageNumber(1); }}
          />
        </div>
        <ModernSelect 
          label="All Status"
          value={statusFilter}
          onChange={val => { setStatusFilter(val); setPageNumber(1); }}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'in-stock', label: 'In Stock' },
            { value: 'low-stock', label: 'Low Stock' },
            { value: 'out-of-stock', label: 'Out of Stock' },
          ]}
        />
        <div className="hidden sm:flex flex-1" />
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          {onAddItem && (
            <button
              onClick={onAddItem}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl font-body font-semibold text-white transition-opacity hover:opacity-90"
              style={{ fontSize: 13, background: '#0d1b6e' }}
            >
              <Plus size={15} /> <span className="whitespace-nowrap">Add Item</span>
            </button>
          )}
          {isAdmin && (
            <button
            onClick={() => setShowBulkRestock(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-body font-semibold transition-opacity hover:opacity-90"
            style={{ fontSize: 13, background: '#15803d', color: 'white' }}
          >
            <PackagePlus size={14} /> <span className="whitespace-nowrap">Bulk Restock</span>
          </button>
          )}
          <button
            onClick={() => onStockMovement?.('borrow')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-body font-semibold transition-all hover:opacity-90"
            style={{ fontSize: 13, background: 'transparent', border: '1px solid #7c3aed', color: '#7c3aed' }}
          >
            <Handshake size={14} /> <span className="whitespace-nowrap">Borrow</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => onStockMovement?.('use')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-body font-semibold transition-all hover:opacity-90"
              style={{ fontSize: 13, background: 'transparent', border: '1px solid #d97706', color: '#d97706' }}
            >
              <PackageMinus size={14} /> <span className="whitespace-nowrap">Use</span>
            </button>
          )}
          {onImportCSV && (
            <button
              onClick={onImportCSV}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-body font-semibold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              style={{ fontSize: 13, background: 'transparent', border: '1px solid var(--heading-color)', color: 'var(--heading-color)' }}
              title="Import inventory from CSV"
            >
              <Upload size={14} /> <span className="whitespace-nowrap">Import CSV</span>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={exportCSV}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-body font-semibold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              style={{ fontSize: 13, background: 'transparent', border: '1px solid var(--heading-color)', color: 'var(--heading-color)' }}
            >
              <Download size={14} /> <span className="whitespace-nowrap">Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl panel-card overflow-hidden">
        <div className="table-scroll">
        <table className="w-full">
          <thead className="sticky-thead">
            <tr style={{ background: 'transparent', borderBottom: '1px solid var(--card-border)' }}>
              {['#', 'ITEM NAME', 'UNIT', 'QTY', 'LOCATION', 'STATUS', 'UPDATED', 'ACTIONS'].map(h => (
                <th key={h} className="text-left px-4 py-4 font-body uppercase" style={{ fontSize: 13, color: 'var(--fg-color)', fontWeight: 700, opacity: 0.9 }}>
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
                  <td className="px-4 py-4 font-body" style={{ fontSize: 14, color: 'var(--fg-color)', opacity: 0.9 }}>
                    {idx + 1}
                  </td>
                  <td className="px-4 py-4 font-body font-bold" style={{ fontSize: 16, color: 'var(--heading-color)' }}>
                    {item.name}
                  </td>
                  <td className="px-4 py-4 font-body" style={{ fontSize: 14, color: 'var(--fg-color)', opacity: 0.8 }}>
                    {item.unit}
                  </td>
                  <td className="px-4 py-4 font-body font-bold" style={{ fontSize: 16, color: statusColor(status), letterSpacing: '-0.5px' }}>
                    {item.quantity}
                  </td>
                  <td className="px-4 py-4 font-body" style={{ fontSize: 14, color: 'var(--fg-color)', opacity: 0.9 }}>
                    {item.location ? (
                      <span className="px-2 py-0.5 rounded-full font-body" style={{ fontSize: 11, background: 'var(--location-bg)', color: 'var(--location-text)', border: '1px solid var(--location-border)' }}>
                        {item.location}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted-text)', opacity: 0.4 }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={status} /></td>
                  <td className="px-4 py-4 font-body" style={{ fontSize: 14, color: 'var(--fg-color)', opacity: 0.9 }}>
                    {new Date(item.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      {[
                        { color: '#7c3aed', icon: <Plus size={14} color="white" />, tip: isAdmin ? 'Restock / Use / Borrow' : 'Borrow item', onClick: () => setTransactionItem(item), show: true },
                        { color: '#0d1b6e', icon: <Pencil size={14} color="white" />, tip: 'Edit item', onClick: () => setEditingItem(item), show: isAdmin },
                        { color: '#b71c1c', icon: <Trash2 size={14} color="white" />, tip: 'Delete item', onClick: () => handleDelete(item), show: isAdmin },
                      ].filter(b => b.show).map((btn, i) => (
                        <div key={i} className="relative group">
                          <button
                            onClick={btn.onClick}
                            className="flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
                            style={{ 
                              width: 32, height: 32, 
                              background: btn.color,
                              border: 'none',
                              color: '#ffffff'
                            }}
                          >
                            {btn.icon}
                          </button>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-md text-white font-body opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg"
                            style={{ fontSize: 11, background: '#0f172a', zIndex: 10 }}>
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



      {editingItem && <AddEditItemModal item={editingItem} onClose={() => setEditingItem(null)} />}
      {transactionItem && (
        <StockMovementModal
          item={transactionItem}
          defaultType={isAdmin ? 'restock' : 'borrow'}
          onClose={() => setTransactionItem(null)}
        />
      )}
      {showBulkRestock && <BulkRestockModal category={category} onClose={() => setShowBulkRestock(false)} />}
    </div>
  );
}
