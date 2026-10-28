import { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { Category, InventoryItem, getStatus, ItemStatus, TransactionType } from '../types';
import StatusBadge from '../components/StatusBadge';
import AddEditItemModal from '../components/AddEditItemModal';
import StockMovementModal from '../components/StockMovementModal';
import BulkRestockModal from '../components/BulkRestockModal';
import QuarantineModal from '../components/QuarantineModal';
import { useCategories } from '../hooks/useCategories';
import { 
  PackageSearch, 
  Plus, 
  Handshake, 
  PackagePlus, 
  PackageMinus, 
  FileDown, 
  FileUp,
  Pencil, 
  Trash2, 
  Home, 
  ChevronDown,
  ArrowLeft,
  CornerDownLeft
} from 'lucide-react';

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
  onStockMovement?: (type: TransactionType) => void;
  forcedType?: 'borrow' | 'use' | 'return';
  initialQuarantineFilter?: boolean;
}

export default function InventoryPage({ category, onAddItem, onImportCSV, onStockMovement, forcedType, initialQuarantineFilter }: Props) {
  const { items, transactions, deleteItem, showToast, searchQuery, setSearchQuery, setCurrentPage: setGlobalPage } = useInventory();
  const { role, user } = useAuth();
  const { categories: dbCategories } = useCategories();
  const isAdmin = role === 'admin';
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [transactionItem, setTransactionItem] = useState<InventoryItem | null>(null);
  const [showBulkRestock, setShowBulkRestock] = useState(false);
  const [overrideType, setOverrideType] = useState<TransactionType | null>(null);
  const [quarantineItem, setQuarantineItem] = useState<InventoryItem | null>(null);
  const showQuarantineOnly = initialQuarantineFilter || false;

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?\n\nThis action cannot be undone.`)) return;
    try {
      await deleteItem(item.id);
      showToast(`"${item.name}" deleted successfully`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete item', 'error');
    }
  };

  // Calculate user's active borrows for 'return' mode
  const borrowedItemsMap = useMemo(() => {
    if (!user?.fullName || forcedType !== 'return') return new Map<string, number>();
    
    const map = new Map<string, number>();
    // Look at user's transactions
    transactions
      .filter(tx => tx.by === user.fullName)
      .forEach(tx => {
        const current = map.get(tx.itemId) || 0;
        // Borrow = negative, Return = positive
        // Quarantine ONLY counts if it's a return (positive qtyChange)
        if (tx.type === 'borrow' || tx.type === 'return' || (tx.type === 'quarantine' && tx.qtyChange > 0)) {
          map.set(tx.itemId, current + tx.qtyChange);
        }
      });
    return map;
  }, [transactions, user?.fullName, forcedType]);

  const filtered = useMemo(() => {
    let list = category === 'all' ? items : items.filter(i => i.category === category);

    // If in return mode, only show items the user has borrowed (net < 0)
    if (forcedType === 'return') {
      list = list.filter(item => {
        const netBalance = borrowedItemsMap.get(item.id) || 0;
        return netBalance < 0; // Negative balance means they owe items
      });
    } else if (forcedType === 'borrow') {
      // Only non-consumables (tools, assets, durable equipment) can be borrowed
      list = list.filter(item => !item.isConsumable);
    } else if (forcedType === 'use') {
      // Only consumables (supplies, paper, ink, soap) can be used
      list = list.filter(item => item.isConsumable);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.name.toUpperCase().includes(q.toUpperCase()));
    }
    if (statusFilter !== 'all') {
      list = list.filter(i => getStatus(i) === statusFilter);
    }
    
    if (showQuarantineOnly) {
      list = list.filter(i => (i.quarantineQuantity || 0) > 0);
    }

    // Always sort alphabetically by name
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [items, category, searchQuery, statusFilter, forcedType, borrowedItemsMap, showQuarantineOnly]);


  const paginated = filtered;


  const exportCSV = () => {
    // We export a format that matches our "Smart Sync" import criteria
    const headers = ['Name', 'Category', 'Unit', 'Quantity', 'Location', 'Low Stock Threshold', 'Notes'];
    const rows = filtered.map(item => [
      item.name, 
      item.category, 
      item.unit, 
      item.quantity, 
      item.location || '', 
      item.lowStockThreshold,
      item.notes || ''
    ]);
    
    // Add BOM for Excel compatibility (UTF-8)
    const csvContent = "\uFEFF" + [headers, ...rows].map(r => r.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SES-Inventory-${category}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported!', 'success');
  };

  const statusColor = (status: ItemStatus) => {
    if (status === 'in-stock') return '#15803d';
    if (status === 'low-stock') return '#d97706';
    return '#b91c1c';
  };

  const baseCategories = dbCategories.length > 0 
    ? dbCategories.map(c => ({ id: c.name as Category, label: c.name.charAt(0).toUpperCase() + c.name.slice(1) }))
    : [
        { id: 'cleaning' as Category, label: 'Cleaning Materials' },
        { id: 'office' as Category, label: 'Office Supplies' },
        { id: 'clinic' as Category, label: 'Clinic Supplies' },
      ];

  const categoryTabs = [
    { id: 'all' as Category, label: 'All Items' },
    ...baseCategories
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Staff Navigation & Back to Portal button */}
      {!isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
          <button 
            onClick={() => setGlobalPage('portal')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-body font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10"
          >
            <ArrowLeft size={16} /> Back to Staff Portal
          </button>
          {forcedType && (
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-[#e8b400]/15 text-[#e8b400] border border-[#e8b400]/30">
              Mode: {forcedType === 'borrow' ? 'Borrowing (Non-Consumables)' : forcedType === 'use' ? 'Using Consumables' : 'Returning Item'}
            </span>
          )}
        </div>
      )}

      {/* Category Tabs */}
      {!initialQuarantineFilter && (
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50 w-full sm:w-auto overflow-x-auto">
          {categoryTabs.map(cat => (
            <button
              key={cat.id}
              onClick={() => setGlobalPage(cat.id)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-body font-semibold text-sm transition-all whitespace-nowrap`}
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
      {!initialQuarantineFilter && (
        <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs group">
          <PackageSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder={category === 'all' ? "Search all items..." : "Search within this category..."}
            className="w-full rounded-2xl pl-10 pr-4 py-3 font-body bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
            style={{ fontSize: 14 }}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); }}
          />
        </div>
        <ModernSelect 
          label="All Status"
          value={statusFilter}
          onChange={val => { setStatusFilter(val); }}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'in-stock', label: 'In Stock' },
            { value: 'low-stock', label: 'Low Stock' },
            { value: 'out-of-stock', label: 'Out of Stock' },
          ]}
        />


        {category !== 'all' && (
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            {isAdmin && (
              <button
                onClick={onAddItem}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl font-body font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-md"
                style={{ fontSize: 13, background: '#0d1b6e', border: 'none' }}
              >
                <Plus size={15} /> <span className="whitespace-nowrap">Add Item</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setShowBulkRestock(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-body font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-md"
                style={{ fontSize: 13, background: '#15803d', border: 'none' }}
              >
                <PackagePlus size={14} /> <span className="whitespace-nowrap">Bulk Restock</span>
              </button>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {isAdmin && (
                <>
                  <button
                    onClick={() => onStockMovement?.('borrow')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-body font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
                    style={{ fontSize: 13, background: '#7c3aed', border: 'none', color: '#ffffff' }}
                  >
                    <Handshake size={14} /> Borrow
                  </button>
                  <button
                    onClick={() => onStockMovement?.('use')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-body font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
                    style={{ fontSize: 13, background: '#d97706', border: 'none', color: '#ffffff' }}
                  >
                    <PackageMinus size={14} /> Use
                  </button>
                  <button
                    onClick={() => onStockMovement?.('return')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-body font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
                    style={{ fontSize: 13, background: '#2563eb', border: 'none', color: '#ffffff' }}
                  >
                    <CornerDownLeft size={14} /> Return
                  </button>
                </>
              )}

              {isAdmin && onImportCSV && (
                <button
                  onClick={onImportCSV}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-body font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
                  style={{ fontSize: 13, background: '#0d1b6e', border: 'none', color: '#ffffff' }}
                  title="Import data from CSV/Excel"
                >
                  <FileUp size={14} /> <span className="whitespace-nowrap">Import Data</span>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={exportCSV}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-body font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
                  style={{ fontSize: 13, background: '#0d1b6e', border: 'none', color: '#ffffff' }}
                  title="Export data to CSV"
                >
                  <FileDown size={14} /> <span className="whitespace-nowrap">Export Data</span>
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl panel-card overflow-hidden">
        <div className="table-scroll">
        <table className="w-full">
          <thead className="sticky-thead">
            <tr style={{ background: 'transparent', borderBottom: '1px solid var(--card-border)' }}>
              { (forcedType === 'return' 
                ? ['#', 'ITEM NAME', 'UNIT', 'YOU OWE', 'DAMAGED', 'LOCATION', 'STATUS', 'UPDATED', 'ACTIONS']
                : ['#', 'ITEM NAME', 'UNIT', 'AVAILABLE', 'DAMAGED', 'LOCATION', 'STATUS', 'UPDATED', 'ACTIONS']
              ).map(h => (
                <th key={h} className="text-left px-3 py-3.5 font-body uppercase text-xs font-bold tracking-wider" style={{ color: 'var(--fg-color)', opacity: 0.85 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-24">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <PackageSearch size={64} style={{ color: forcedType === 'return' ? '#15803d' : 'var(--muted-text)', opacity: forcedType === 'return' ? 0.6 : 0.3 }} />
                    <h3 className="font-heading font-bold" style={{ fontSize: 26, color: forcedType === 'return' ? '#15803d' : 'var(--fg-color)' }}>
                      {forcedType === 'return' 
                        ? 'No Items to Return' 
                        : forcedType === 'borrow'
                          ? 'No Borrowable Items Found'
                          : forcedType === 'use'
                            ? 'No Consumable Items Found'
                            : 'No Items Found'}
                    </h3>
                    <p className="font-body text-lg" style={{ color: 'var(--muted-text)' }}>
                      {forcedType === 'return' 
                        ? 'Your currently borrowed items will appear here when you need to return them.' 
                        : forcedType === 'borrow'
                          ? 'No non-consumable tools or assets match your current category/filter.'
                          : forcedType === 'use'
                            ? 'No consumable items match your current category/filter.'
                            : searchQuery 
                              ? `No results matching "${searchQuery}"` 
                              : 'Start adding items to build your inventory.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : paginated.map((item, idx) => {
              const status = getStatus(item);
              return (
                <tr key={item.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td className="px-3 py-3.5 font-body font-bold text-sm" style={{ color: 'var(--fg-color)' }}>
                    {idx + 1}
                  </td>
                  <td className="px-3 py-3.5 font-body font-bold text-[15px] tracking-tight" style={{ color: 'var(--fg-color)' }}>
                    <span>{item.name}</span>
                  </td>
                  <td className="px-3 py-3.5 font-body font-bold text-xs uppercase" style={{ color: 'var(--fg-color)', opacity: 0.8 }}>
                    {item.unit}
                  </td>
                  {forcedType === 'return' ? (
                    <>
                      <td className="px-3 py-3.5 font-body font-bold text-base" style={{ color: '#b91c1c' }}>
                        {Math.abs(borrowedItemsMap.get(item.id) || 0)}
                      </td>
                      <td className="px-3 py-3.5 font-body font-bold text-base" style={{ color: item.quarantineQuantity > 0 ? '#b91c1c' : 'var(--muted-text)', opacity: item.quarantineQuantity > 0 ? 1 : 0.25 }}>
                        {item.quarantineQuantity || 0}
                        {item.quarantineQuantity > 0 && (
                          <div className="text-[10px] font-bold tracking-tight text-red-600 mt-0.5 leading-none">DAMAGED</div>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-3.5 font-body font-bold text-base" style={{ color: statusColor(status) }}>
                        <div className="flex flex-col">
                          <span>{item.quantity}</span>
                          {item.lowStockThreshold >= item.quantity && item.quantity > 0 && (
                            <span className="text-[10px] font-bold text-amber-600 tracking-tight leading-none mt-0.5">LOW STOCK</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 font-body font-bold text-base" style={{ color: item.quarantineQuantity > 0 ? '#b91c1c' : 'var(--muted-text)', opacity: item.quarantineQuantity > 0 ? 1 : 0.25 }}>
                        {item.quarantineQuantity || 0}
                        {item.quarantineQuantity > 0 && (
                          <div className="text-[10px] font-bold tracking-tight text-red-600 mt-0.5 leading-none">DAMAGED</div>
                        )}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-3.5 font-body">
                    {item.location ? (
                      <span className="px-3 py-1 rounded-full font-body font-semibold text-xs whitespace-nowrap shadow-sm" style={{ background: 'var(--location-bg)', color: 'var(--location-text)', border: '1px solid var(--location-border)' }}>
                        {item.location}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted-text)', opacity: 0.35 }}>—</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5"><StatusBadge status={status} /></td>
                  <td className="px-3 py-3.5 font-body text-xs font-medium" style={{ color: 'var(--muted-text)' }}>
                    {new Date(item.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-2">
                      {[
                        { 
                          color: forcedType === 'use' ? '#d97706' : forcedType === 'return' ? '#15803d' : '#7c3aed', 
                          label: forcedType === 'use' ? 'USE ITEM' : forcedType === 'return' ? 'RETURN' : 'BORROW',
                          tip: forcedType === 'use' ? 'Use consumable' : forcedType === 'return' ? 'Return item' : 'Borrow item', 
                          onClick: () => setTransactionItem(item), 
                          show: !isAdmin 
                        },
                        { color: '#15803d', label: 'RESTOCK', tip: 'Add stock', onClick: () => { setTransactionItem(item); setOverrideType('restock'); }, show: isAdmin && !initialQuarantineFilter },
                        { color: '#dc2626', label: 'REPAIR', tip: 'Manage damaged items', onClick: () => setQuarantineItem(item), show: isAdmin && item.quarantineQuantity > 0 },
                        { color: '#0d1b6e', label: 'EDIT', tip: 'Edit details', onClick: () => setEditingItem(item), show: isAdmin && !initialQuarantineFilter },
                        { color: '#b71c1c', label: 'DELETE', tip: 'Remove item', onClick: () => handleDelete(item), show: isAdmin },
                      ].filter(b => b.show).map((btn, i) => (
                        <div key={i} className="relative group">
                          <button
                            onClick={btn.onClick}
                            className={`flex items-center justify-center rounded-xl font-body font-bold transition-all hover:scale-105 active:scale-95 shadow-md ${!btn.icon ? 'px-4 py-2' : ''}`}
                            style={{ 
                              width: btn.icon ? 42 : 'auto',
                              height: 42,
                              background: btn.color,
                              border: 'none',
                              color: '#ffffff',
                              fontSize: btn.icon ? 14 : 12,
                              letterSpacing: '0.05em'
                            }}
                          >
                            {btn.label || btn.icon}
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
          defaultType={overrideType || (isAdmin ? 'restock' : (forcedType || 'borrow'))}
          lockType={!!overrideType || !!forcedType}
          maxReturnQty={forcedType === 'return' ? Math.abs(borrowedItemsMap.get(transactionItem.id) || 0) : undefined}
          onClose={() => { setTransactionItem(null); setOverrideType(null); }}
        />
      )}
      {showBulkRestock && <BulkRestockModal category={category} onClose={() => setShowBulkRestock(false)} />}
      {quarantineItem && (
        <QuarantineModal 
          item={quarantineItem} 
          onClose={() => setQuarantineItem(null)} 
        />
      )}
    </div>
  );
}
