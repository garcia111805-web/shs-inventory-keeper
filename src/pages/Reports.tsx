import { useInventory } from '../context/InventoryContext';
import { Category, getStatus, getCategoryLabel } from '../types';
import StatusBadge from '../components/StatusBadge';

const categories: Category[] = ['cleaning', 'office', 'clinic'];
const catColors = { cleaning: '#0d1b6e', office: '#d97706', clinic: '#b91c1c' };
const catLabels = { cleaning: 'Cleaning Materials', office: 'Office Supplies', clinic: 'Clinic Supplies' };

export default function Reports() {
  const { items, setCurrentPage } = useInventory();

  const needsAttention = items.filter(i => {
    const s = getStatus(i);
    return s === 'low-stock' || s === 'out-of-stock';
  });

  return (
    <div className="p-4 md:p-8 space-y-5">
      {categories.map(cat => {
        const catItems = items.filter(i => i.category === cat && i.quantity > 0)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10);
        const maxQty = catItems.length > 0 ? catItems[0].quantity : 1;

        return (
          <div key={cat} className="rounded-2xl p-6 panel-card">
            <h3 className="font-heading font-bold mb-4" style={{ fontSize: 16, color: 'var(--heading-color)' }}>
              {catLabels[cat]} — Top Stocked Items
            </h3>
            {catItems.length === 0 ? (
              <p className="font-body" style={{ fontSize: 14, color: 'var(--muted-text)' }}>No items in stock</p>
            ) : (
              <div className="space-y-2">
                {catItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="font-body font-semibold min-w-0 flex-1 truncate" style={{ maxWidth: 208, fontSize: 14, color: 'var(--fg-color)' }}>
                      {item.name}
                    </span>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height: 24, background: 'var(--donut-track)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${(item.quantity / maxQty) * 100}%`,
                        background: catColors[cat],
                        transition: 'all 0.5s',
                      }} />
                    </div>
                    <span className="font-body font-bold text-right" style={{ width: 32, fontSize: 14, color: 'var(--fg-color)' }}>
                      {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="rounded-2xl p-6 panel-card">
        <h3 className="font-heading font-bold mb-1" style={{ fontSize: 16, color: 'var(--heading-color)' }}>
          Items Needing Attention
        </h3>
        <p className="font-body mb-4" style={{ fontSize: 12, color: 'var(--muted-text)' }}>
          Low stock and out-of-stock items across all categories
        </p>
        <div className="table-scroll">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--table-header-bg)' }}>
              {['ITEM', 'CATEGORY', 'QTY', 'STATUS', 'ACTION'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-body uppercase" style={{ fontSize: 11, color: 'var(--muted-text)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {needsAttention.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-6 font-body" style={{ color: 'var(--muted-text)' }}>All items are in stock!</td></tr>
            ) : needsAttention.map(item => (
              <tr key={item.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <td className="px-4 py-3 font-body font-semibold" style={{ fontSize: 13, color: 'var(--fg-color)' }}>{item.name}</td>
                <td className="px-4 py-3 font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>{getCategoryLabel(item.category)}</td>
                <td className="px-4 py-3 font-body font-bold" style={{ fontSize: 13, color: getStatus(item) === 'out-of-stock' ? '#b91c1c' : '#d97706' }}>
                  {item.quantity}
                </td>
                <td className="px-4 py-3"><StatusBadge status={getStatus(item)} /></td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setCurrentPage(item.category as any)}
                    className="px-3 py-1 rounded-lg font-body font-semibold text-white"
                    style={{ fontSize: 12, background: '#1d4ed8' }}
                  >
                    Restock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
