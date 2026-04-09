import { useInventory } from '../context/InventoryContext';
import { Search, ClipboardList, Plus, Menu } from 'lucide-react';

interface Props {
  onToggleSidebar: () => void;
  onLogUsage: () => void;
  onAddItem?: () => void;
}

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  cleaning: 'Cleaning Materials',
  office: 'Office Supplies',
  clinic: 'Clinic Supplies',
  transactions: 'Transaction Log',
  reports: 'Reports',
};

export default function TopBar({ onToggleSidebar, onLogUsage, onAddItem }: Props) {
  const { currentPage, searchQuery, setSearchQuery } = useInventory();
  const isInventory = ['cleaning', 'office', 'clinic'].includes(currentPage);

  return (
    <div
      className="topbar"
      style={{
        background: 'var(--topbar-bg)',
        borderBottom: '1px solid var(--topbar-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="topbar-left">
        <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Open menu">
          <Menu size={18} />
        </button>
        <h1 className="font-heading font-bold" style={{ fontSize: 20, color: 'var(--heading-color)' }}>
          {pageTitles[currentPage] || 'Dashboard'}
        </h1>
      </div>
      <div className="topbar-search">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-text)' }} />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl font-body"
          style={{
            fontSize: 14,
            background: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            color: 'var(--fg-color)',
            outline: 'none',
          }}
        />
      </div>
      <div className="topbar-actions">
        <button
          onClick={onLogUsage}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl font-body font-semibold transition-opacity hover:opacity-90"
          style={{ fontSize: 14, background: '#e8b400', color: '#0d1b6e' }}
        >
          <ClipboardList size={16} />
          <span>Log Usage</span>
        </button>
        {isInventory && onAddItem && (
          <button
            onClick={onAddItem}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl font-body font-semibold transition-opacity hover:opacity-90"
            style={{ fontSize: 14, background: '#0d1b6e', color: 'white' }}
          >
            <Plus size={16} />
            <span>Add Item</span>
          </button>
        )}
      </div>
    </div>
  );
}