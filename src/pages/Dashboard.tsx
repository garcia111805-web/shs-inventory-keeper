import { useInventory } from '../context/InventoryContext';
import { getStatus, Category } from '../types';
import { Package, CheckCircle, AlertTriangle, XCircle, MousePointerClick } from 'lucide-react';

export default function Dashboard() {
  const { items, transactions, setCurrentPage } = useInventory();

  const total = items.length;
  const inStock = items.filter(i => getStatus(i) === 'in-stock').length;
  const lowStock = items.filter(i => getStatus(i) === 'low-stock').length;
  const outOfStock = items.filter(i => getStatus(i) === 'out-of-stock').length;

  const categories: Category[] = ['cleaning', 'office', 'clinic'];

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

  // Find latest item update
  const latestUpdate = items.reduce((latest, item) => {
    return item.lastUpdated > latest ? item.lastUpdated : latest;
  }, '');

  return (
    <div className="p-4 md:p-6 space-y-4" style={{ maxHeight: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Items', value: total, color: '#2563eb', icon: <Package size={22} color="white" /> },
          { label: 'In Stock', value: inStock, color: '#16a34a', icon: <CheckCircle size={22} color="white" /> },
          { label: 'Low Stock', value: lowStock, color: '#ea580c', icon: <AlertTriangle size={22} color="white" /> },
          { label: 'Out of Stock', value: outOfStock, color: '#dc2626', icon: <XCircle size={22} color="white" /> },
        ].map((card, i) => (
          <div
            key={i}
            className="flex-1 px-4 py-5 panel-card flex items-center gap-4 overflow-hidden"
            style={{ borderLeft: `6px solid ${card.color}` }}
          >
            <div className="rounded-[12px] flex items-center justify-center shrink-0" style={{ width: 48, height: 48, background: card.color }}>
              {card.icon}
            </div>
            <div className="flex flex-col">
              <div className="font-body font-bold" style={{ fontSize: 26, letterSpacing: '-0.5px', color: 'var(--heading-color)', lineHeight: 1 }}>
                {card.value}
              </div>
              <div className="font-body" style={{ fontSize: 12, color: 'var(--muted-text)', marginTop: 4 }}>
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: 2-column grid — Breakdown + Activity, stretch to fill */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ alignItems: 'stretch' }}>
        {/* Left: Stock Breakdown — full height, evenly distributed */}
        <div
          className="rounded-2xl panel-card flex flex-col"
          style={{ border: '1px solid var(--card-border)' }}
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-2">
            <h3 className="font-heading font-bold" style={{ fontSize: 18, color: 'var(--heading-color)' }}>
              Stock Breakdown by Category
            </h3>
          </div>

          {/* Bars — flex-1 to fill available space, justify-center for vertical centering */}
          <div className="flex-1 flex flex-col justify-center px-6 py-3" style={{ gap: 4 }}>
            {[...catStats, {
              cat: 'all' as const,
              total, inStock, lowStock, outOfStock,
            }].map((cs) => (
              <div key={cs.cat}>
                {cs.cat === 'all' && <div style={{ borderTop: '1px solid var(--card-border)', margin: '6px 0 10px' }} />}
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => cs.cat !== 'all' && setCurrentPage(cs.cat as any)}
                    className="font-body font-semibold text-right transition-colors"
                    style={{
                      width: 70,
                      fontSize: 13,
                      color: cs.cat === 'all' ? 'var(--heading-color)' : 'var(--fg-color)',
                      background: 'none',
                      border: 'none',
                      cursor: cs.cat === 'all' ? 'default' : 'pointer',
                      padding: 0,
                    }}
                    onMouseEnter={e => { if (cs.cat !== 'all') e.currentTarget.style.color = '#7c3aed'; }}
                    onMouseLeave={e => { if (cs.cat !== 'all') e.currentTarget.style.color = 'var(--fg-color)'; }}
                  >
                    {cs.cat === 'all' ? 'Overall' : cs.cat === 'cleaning' ? 'Cleaning' : cs.cat === 'office' ? 'Office' : 'Clinic'}
                  </button>
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 32, background: 'var(--donut-track)' }}>
                    <div className="flex h-full" style={{ width: '100%' }}>
                      {cs.total > 0 && (
                        <>
                          {cs.inStock > 0 && (
                            <div className="h-full flex items-center justify-center text-white font-body font-semibold" style={{
                              width: `${(cs.inStock / cs.total) * 100}%`,
                              background: '#15803d',
                              fontSize: 12,
                              transition: 'all 0.7s',
                            }}>
                              {(cs.inStock / cs.total) > 0.10 ? cs.inStock : ''}
                            </div>
                          )}
                          {cs.lowStock > 0 && (
                            <div className="h-full flex items-center justify-center text-white font-body font-semibold" style={{
                              width: `${(cs.lowStock / cs.total) * 100}%`,
                              background: '#d97706',
                              fontSize: 12,
                              transition: 'all 0.7s',
                            }}>
                              {(cs.lowStock / cs.total) > 0.10 ? cs.lowStock : ''}
                            </div>
                          )}
                          {cs.outOfStock > 0 && (
                            <div className="h-full flex items-center justify-center text-white font-body font-semibold" style={{
                              width: `${(cs.outOfStock / cs.total) * 100}%`,
                              background: '#b91c1c',
                              fontSize: 12,
                              transition: 'all 0.7s',
                            }}>
                              {(cs.outOfStock / cs.total) > 0.10 ? cs.outOfStock : ''}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <span className="font-body font-bold text-right" style={{ width: 28, fontSize: 13, color: 'var(--fg-color)' }}>
                    {cs.total}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer: legend + tip */}
          <div className="px-6 pb-4 pt-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--card-border)' }}>
            <div className="flex items-center gap-4">
              {[
                { label: 'In Stock', color: '#15803d' },
                { label: 'Low Stock', color: '#d97706' },
                { label: 'Out of Stock', color: '#b91c1c' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="rounded" style={{ width: 10, height: 10, background: l.color }} />
                  <span className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>{l.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 font-body" style={{ fontSize: 10, color: 'var(--muted-text)' }}>
              <MousePointerClick size={12} />
              <span>Click a category to manage</span>
            </div>
          </div>
        </div>

        {/* Right: Recent Activity — matches height */}
        <div
          className="rounded-2xl panel-card flex flex-col"
          style={{ border: '1px solid var(--card-border)' }}
        >
          <div className="px-6 pt-5 pb-2">
            <h3 className="font-heading font-bold" style={{ fontSize: 18, color: 'var(--heading-color)' }}>Recent Activity</h3>
            <p className="font-body mt-0.5" style={{ fontSize: 11, color: 'var(--muted-text)' }}>Latest transactions across all categories</p>
          </div>
          <div className="flex-1 flex flex-col justify-center px-4 py-1">
            {recentAll.length === 0 ? (
              <p className="font-body text-center py-6" style={{ color: 'var(--muted-text)', fontSize: 13 }}>
                No transactions recorded yet
              </p>
            ) : (
              <div className="space-y-0">
                {recentAll.map(tx => {
                  const typeColors: Record<string, string> = { restock: '#15803d', borrow: '#7c3aed', use: '#d97706' };
                  return (
                    <div key={tx.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg table-row-hover">
                      <span className="font-body font-semibold px-2 py-0.5 rounded-full text-white" style={{ fontSize: 10, background: typeColors[tx.type], whiteSpace: 'nowrap', minWidth: 50, textAlign: 'center' }}>
                        {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-body font-semibold truncate" style={{ fontSize: 13, color: 'var(--fg-color)' }}>{tx.itemName}</div>
                        <div className="font-body" style={{ fontSize: 10, color: 'var(--muted-text)' }}>{tx.by}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-body font-bold" style={{ fontSize: 13, color: tx.type === 'restock' ? '#15803d' : '#b91c1c' }}>
                          {tx.type === 'restock' ? '+' : '−'}{Math.abs(tx.qtyChange)}
                        </div>
                        <div className="font-body" style={{ fontSize: 9, color: 'var(--muted-text)' }}>
                          {new Date(tx.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Footer: last updated */}
          <div className="px-6 pb-4 pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
            <p className="font-body" style={{ fontSize: 10, color: 'var(--muted-text)' }}>
              {latestUpdate
                ? `Last updated: ${new Date(latestUpdate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                : 'No updates yet'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
