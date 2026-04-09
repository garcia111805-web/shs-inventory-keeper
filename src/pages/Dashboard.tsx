import { useInventory } from '../context/InventoryContext';
import { getStatus, Category, getCategoryLabel, getCategoryColor } from '../types';
import { Package, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function Dashboard() {
  const { items, transactions } = useInventory();

  const total = items.length;
  const inStock = items.filter(i => getStatus(i) === 'in-stock').length;
  const lowStock = items.filter(i => getStatus(i) === 'low-stock').length;
  const outOfStock = items.filter(i => getStatus(i) === 'out-of-stock').length;

  const categories: Category[] = ['cleaning', 'office', 'clinic'];
  const catLabels = { cleaning: 'CLEANING', office: 'OFFICE', clinic: 'CLINIC' };
  const catColors = { cleaning: '#0d1b6e', office: '#d97706', clinic: '#b91c1c' };

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

  const recentUsage = transactions.filter(t => t.type === 'use').slice(0, 5);
  const recentAll = transactions.slice(0, 5);

  function relativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div className="p-4 md:p-8 space-y-5">
      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: total, color: '#0d1b6e', icon: <Package size={22} color="white" /> },
          { label: 'In Stock', value: inStock, color: '#15803d', icon: <CheckCircle size={22} color="white" /> },
          { label: 'Low Stock', value: lowStock, color: '#d97706', icon: <AlertTriangle size={22} color="white" /> },
          { label: 'Out of Stock', value: outOfStock, color: '#b91c1c', icon: <XCircle size={22} color="white" /> },
        ].map((card, i) => (
          <div
            key={i}
            className="flex-1 rounded-2xl px-5 py-5 panel-card flex items-center gap-4"
            style={{ borderLeft: `4px solid ${card.color}` }}
          >
            <div className="rounded-xl flex items-center justify-center" style={{ width: 44, height: 44, background: card.color }}>
              {card.icon}
            </div>
            <div>
              <div className="font-body font-bold" style={{ fontSize: 30, letterSpacing: '-1px', color: 'var(--fg-color)' }}>
                {card.value}
              </div>
              <div className="font-body" style={{ fontSize: 12, color: 'var(--muted-text)', marginTop: 6 }}>
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Donut charts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {catStats.map(cs => {
          const circumference = 2 * Math.PI * 52;
          const totalItems = cs.total || 1;
          const inPct = cs.inStock / totalItems;
          const lowPct = cs.lowStock / totalItems;
          const outPct = cs.outOfStock / totalItems;

          return (
            <div key={cs.cat} className="flex-1 rounded-2xl p-5 panel-card flex flex-col items-center">
              <div className="flex items-center gap-2 mb-3">
                <span className="rounded-full" style={{ width: 8, height: 8, background: catColors[cs.cat] }} />
                <span className="font-body uppercase" style={{ fontSize: 11, color: 'var(--muted-text)' }}>
                  {catLabels[cs.cat]}
                </span>
              </div>
              <div className="relative" style={{ width: 136, height: 136 }}>
                <svg width="136" height="136" viewBox="0 0 136 136" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="68" cy="68" r="52" fill="none" strokeWidth="11" stroke="var(--donut-track)" />
                  {/* Green segment */}
                  <circle cx="68" cy="68" r="52" fill="none" strokeWidth="11" stroke="#15803d"
                    strokeDasharray={`${inPct * circumference} ${circumference}`}
                    strokeDashoffset="0"
                    style={{ transition: 'all 0.6s ease' }} />
                  {/* Amber segment */}
                  <circle cx="68" cy="68" r="52" fill="none" strokeWidth="11" stroke="#d97706"
                    strokeDasharray={`${lowPct * circumference} ${circumference}`}
                    strokeDashoffset={`${-inPct * circumference}`}
                    style={{ transition: 'all 0.6s ease' }} />
                  {/* Red segment */}
                  <circle cx="68" cy="68" r="52" fill="none" strokeWidth="11" stroke="#b91c1c"
                    strokeDasharray={`${outPct * circumference} ${circumference}`}
                    strokeDashoffset={`${-(inPct + lowPct) * circumference}`}
                    style={{ transition: 'all 0.6s ease' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-body font-bold" style={{ fontSize: 30, color: 'var(--fg-color)' }}>{cs.total}</span>
                  <span className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>items</span>
                </div>
              </div>
              <div className="flex gap-6 mt-3">
                {[
                  { label: 'In Stock', count: cs.inStock, color: '#15803d' },
                  { label: 'Low', count: cs.lowStock, color: '#d97706' },
                  { label: 'Out', count: cs.outOfStock, color: '#b91c1c' },
                ].map(leg => (
                  <div key={leg.label} className="flex flex-col items-center">
                    <div className="flex items-center gap-1">
                      <span className="rounded-full" style={{ width: 8, height: 8, background: leg.color }} />
                      <span className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>{leg.label}</span>
                    </div>
                    <span className="font-body font-bold" style={{ fontSize: 18, color: leg.color }}>{leg.count}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 3: Stacked bar chart */}
      <div className="rounded-2xl p-6 panel-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold" style={{ fontSize: 16, color: 'var(--heading-color)' }}>
            Stock Breakdown by Category
          </h3>
        <div className="flex flex-wrap items-center gap-4">
            {[
              { label: 'In Stock', color: '#15803d' },
              { label: 'Low Stock', color: '#d97706' },
              { label: 'Out of Stock', color: '#b91c1c' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="rounded" style={{ width: 10, height: 10, background: l.color }} />
                <span className="font-body" style={{ fontSize: 12, color: 'var(--muted-text)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        {[...catStats, {
          cat: 'all' as const,
          total, inStock, lowStock, outOfStock,
        }].map((cs, idx) => (
          <div key={cs.cat}>
            {cs.cat === 'all' && <div style={{ borderTop: '1px solid var(--card-border)', margin: '8px 0' }} />}
            <div className="flex items-center gap-3 mb-2">
              <span className="font-body text-right" style={{ width: 80, fontSize: 14, color: 'var(--fg-color)' }}>
                {cs.cat === 'all' ? 'All' : cs.cat === 'cleaning' ? 'Cleaning' : cs.cat === 'office' ? 'Office' : 'Clinic'}
              </span>
              <div className="flex-1 rounded-full overflow-hidden" style={{ height: 28, background: 'var(--donut-track)' }}>
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
                          {(cs.inStock / cs.total) > 0.09 ? cs.inStock : ''}
                        </div>
                      )}
                      {cs.lowStock > 0 && (
                        <div className="h-full flex items-center justify-center text-white font-body font-semibold" style={{
                          width: `${(cs.lowStock / cs.total) * 100}%`,
                          background: '#d97706',
                          fontSize: 12,
                          transition: 'all 0.7s',
                        }}>
                          {(cs.lowStock / cs.total) > 0.09 ? cs.lowStock : ''}
                        </div>
                      )}
                      {cs.outOfStock > 0 && (
                        <div className="h-full flex items-center justify-center text-white font-body font-semibold" style={{
                          width: `${(cs.outOfStock / cs.total) * 100}%`,
                          background: '#b91c1c',
                          fontSize: 12,
                          transition: 'all 0.7s',
                        }}>
                          {(cs.outOfStock / cs.total) > 0.09 ? cs.outOfStock : ''}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <span className="font-body font-bold text-right" style={{ width: 32, fontSize: 14, color: 'var(--fg-color)' }}>
                {cs.total}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Row 4: Recent Usage & Recent Transactions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 panel-card">
          <h3 className="font-heading font-bold" style={{ fontSize: 16, color: 'var(--heading-color)' }}>Recent Usage</h3>
          <p className="font-body mb-3" style={{ fontSize: 12, color: 'var(--muted-text)' }}>Last 5 items used by staff</p>
          {recentUsage.length === 0 ? (
            <p className="font-body text-center py-6" style={{ color: 'var(--muted-text)', fontSize: 14 }}>
              No usage logged yet — use "Log Usage" to record items used
            </p>
          ) : (
            <div className="space-y-1">
              {recentUsage.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-2 py-2 rounded-lg table-row-hover">
                  <div className="rounded-lg flex items-center justify-center font-body font-bold text-white"
                    style={{ width: 32, height: 32, fontSize: 12, background: getCategoryColor(tx.category) }}>
                    {tx.category[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-semibold truncate" style={{ fontSize: 13, color: 'var(--fg-color)' }}>{tx.itemName}</div>
                    <div className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>
                      {getCategoryLabel(tx.category)} · Used by {tx.by}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-body font-bold" style={{ fontSize: 14, color: '#b91c1c' }}>−{Math.abs(tx.qtyChange)}</div>
                    <div className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>{relativeTime(tx.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl p-5 panel-card">
          <h3 className="font-heading font-bold" style={{ fontSize: 16, color: 'var(--heading-color)' }}>Recent Transactions</h3>
          <p className="font-body mb-3" style={{ fontSize: 12, color: 'var(--muted-text)' }}>All types — last 5 entries</p>
          {recentAll.length === 0 ? (
            <p className="font-body text-center py-6" style={{ color: 'var(--muted-text)', fontSize: 14 }}>
              No transactions yet
            </p>
          ) : (
            <div className="space-y-1">
              {recentAll.map(tx => {
                const typeColors = { restock: '#1d4ed8', borrow: '#d97706', use: '#b91c1c' };
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-2 py-2 rounded-lg table-row-hover">
                    <span className="font-body font-semibold px-2 py-0.5 rounded-full text-white" style={{ fontSize: 11, background: typeColors[tx.type] }}>
                      {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-body font-semibold truncate" style={{ fontSize: 13, color: 'var(--fg-color)' }}>{tx.itemName}</div>
                      <div className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>{tx.by}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-body font-bold" style={{ fontSize: 14, color: tx.type === 'restock' ? '#15803d' : '#b91c1c' }}>
                        {tx.type === 'restock' ? '+' : '−'}{Math.abs(tx.qtyChange)}
                      </div>
                      <div className="font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>
                        {new Date(tx.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
