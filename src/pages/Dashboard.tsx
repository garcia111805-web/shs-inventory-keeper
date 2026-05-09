import { useInventory } from '../context/InventoryContext';
import { getStatus, Category } from '../types';
import { Package, CheckCircle, AlertTriangle, XCircle, MousePointerClick } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';

export default function Dashboard() {
  const { items, transactions, setCurrentPage } = useInventory();
  const { categories: dbCategories } = useCategories();

  const total = items.length;
  const inStock = items.filter(i => getStatus(i) === 'in-stock').length;
  const lowStock = items.filter(i => getStatus(i) === 'low-stock').length;
  const outOfStock = items.filter(i => getStatus(i) === 'out-of-stock').length;

  const categories = dbCategories.length > 0 ? dbCategories.map(c => c.name) : ['cleaning', 'office', 'clinic'];

  const catStats = categories.map(cat => {
    const catItems = items.filter(i => i.category === cat);
    return {
      cat,
      total: catItems.length,
      inStock: catItems.filter(i => getStatus(i) === 'in-stock').length,
      lowStock: catItems.filter(i => getStatus(i) === 'low-stock').length,
      outOfStock: catItems.filter(i => getStatus(i) === 'out-of-stock').length,
    };
  });

  const recentAll = transactions.slice(0, 7);

  const latestUpdate = items.reduce((latest, item) => {
    return item.lastUpdated > latest ? item.lastUpdated : latest;
  }, '');

  return (
    <div className="p-6 md:p-10 space-y-8 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px)' }}>
      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Inventory', value: total, color: 'from-blue-600 to-indigo-700', icon: <Package size={24} color="white" /> },
          { label: 'Perfect Stock', value: inStock, color: 'from-emerald-500 to-teal-700', icon: <CheckCircle size={24} color="white" /> },
          { label: 'Low Stock Alert', value: lowStock, color: 'from-amber-400 to-orange-600', icon: <AlertTriangle size={24} color="white" /> },
          { label: 'Critical Outage', value: outOfStock, color: 'from-rose-500 to-red-700', icon: <XCircle size={24} color="white" /> },
        ].map((card, i) => (
          <div
            key={i}
            className={`relative overflow-hidden group panel-card p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-gradient-to-br ${card.color} opacity-10 rounded-full transition-transform duration-500 group-hover:scale-110`}></div>
            
            <div className="flex items-center justify-between relative z-10">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg shadow-blue-500/20`}>
                {card.icon}
              </div>
              <div className="text-right">
                <div className="font-heading font-black text-3xl tracking-tight" style={{ color: 'var(--heading-color)' }}>
                  {card.value}
                </div>
              </div>
            </div>
            
            <div className="mt-4 relative z-10">
              <div className="font-body font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--muted-text)' }}>
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: 2-column grid — Breakdown + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
        {/* Left: Stock Breakdown — takes 3 columns */}
        <div className="xl:col-span-3 panel-card flex flex-col p-8 space-y-6">
          <div>
            <h3 className="font-heading font-bold text-xl" style={{ color: 'var(--heading-color)' }}>
              Stock Distribution
            </h3>
            <p className="font-body text-sm mt-1" style={{ color: 'var(--muted-text)' }}>Inventory levels categorized by department</p>
          </div>

          <div className="space-y-6">
            {[...catStats, {
              cat: 'all' as const,
              total, inStock, lowStock, outOfStock,
            }].map((cs) => (
              <div key={cs.cat} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => cs.cat !== 'all' && setCurrentPage(cs.cat as any)}
                    className="font-body font-bold text-sm transition-colors hover:text-blue-500 text-left"
                    style={{
                      color: cs.cat === 'all' ? 'var(--heading-color)' : 'var(--fg-color)',
                      cursor: cs.cat === 'all' ? 'default' : 'pointer',
                    }}
                  >
                    {cs.cat === 'all' ? 'Overall Status' : cs.cat.charAt(0).toUpperCase() + cs.cat.slice(1)}
                  </button>
                  <span className="font-body font-black text-sm" style={{ color: 'var(--heading-color)' }}>
                    {cs.total} <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Items</span>
                  </span>
                </div>
                
                <div className="relative h-4 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                  {cs.total > 0 ? (
                    <>
                      <div className="h-full transition-all duration-1000" style={{ width: `${(cs.inStock / cs.total) * 100}%`, background: 'var(--status-in-stock-dot)' }} title={`In Stock: ${cs.inStock}`} />
                      <div className="h-full transition-all duration-1000" style={{ width: `${(cs.lowStock / cs.total) * 100}%`, background: 'var(--status-low-stock-dot)' }} title={`Low Stock: ${cs.lowStock}`} />
                      <div className="h-full transition-all duration-1000" style={{ width: `${(cs.outOfStock / cs.total) * 100}%`, background: 'var(--status-out-of-stock-dot)' }} title={`Out of Stock: ${cs.outOfStock}`} />
                    </>
                  ) : (
                    <div className="w-full h-full bg-slate-200 dark:bg-slate-700/50" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-6 border-t border-slate-100 dark:border-slate-800">
            {[
              { label: 'In Stock', color: 'var(--status-in-stock-dot)' },
              { label: 'Low Stock', color: 'var(--status-low-stock-dot)' },
              { label: 'Out of Stock', color: 'var(--status-out-of-stock-dot)' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: l.color }} />
                <span className="font-body font-bold text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-text)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Activity — takes 2 columns */}
        <div className="xl:col-span-2 panel-card flex flex-col p-8 space-y-6">
          <div>
            <h3 className="font-heading font-bold text-xl" style={{ color: 'var(--heading-color)' }}>Global Activity</h3>
            <p className="font-body text-sm mt-1" style={{ color: 'var(--muted-text)' }}>Latest inventory movements</p>
          </div>

          <div className="flex-1 space-y-1">
            {recentAll.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <MousePointerClick size={40} className="mb-4 opacity-20" />
                <p className="font-body text-sm">No recent movements</p>
              </div>
            ) : (
              recentAll.map(tx => {
                const isPositive = tx.type === 'restock' || tx.type === 'return';
                return (
                  <div key={tx.id} className="group flex items-center gap-4 p-3 rounded-2xl transition-all hover:bg-slate-50 dark:hover:bg-white/5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      tx.type === 'restock' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                      tx.type === 'borrow' ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400' :
                      tx.type === 'return' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                      'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                    }`}>
                      {tx.type === 'restock' ? <PackagePlus size={18} /> : 
                       tx.type === 'borrow' ? <Handshake size={18} /> : 
                       tx.type === 'return' ? <CornerDownLeft size={18} /> :
                       <PackageMinus size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-body font-bold text-sm truncate" style={{ color: 'var(--heading-color)' }}>{tx.itemName}</div>
                      <div className="font-body text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-text)' }}>{tx.by}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-heading font-black text-sm ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isPositive ? '+' : '−'}{Math.abs(tx.qtyChange)}
                      </div>
                      <div className="font-body text-[10px] text-slate-400">
                        {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Updates Enabled
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
