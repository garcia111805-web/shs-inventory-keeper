import { useState, useMemo, useRef, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { TransactionType, InventoryItem, getStatus } from '../types';
import StatusBadge from './StatusBadge';
import { Search, Plus, Menu, PackagePlus, PackageMinus, Handshake, LogOut, Upload } from 'lucide-react';

interface Props {
  onToggleSidebar: () => void;
  onQuickAction: (type: TransactionType) => void;
  onItemSelect?: (item: InventoryItem) => void;
  onAddItem?: () => void;
  onImportCSV?: () => void;
}

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  cleaning: 'Cleaning Materials',
  office: 'Office Supplies',
  clinic: 'Clinic Supplies',
  transactions: 'Transaction Log',
  reports: 'Reports',
};

const ALL_ACTION_BUTTONS: { type: TransactionType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'restock', label: 'Restock', icon: <PackagePlus size={16} />, color: '#15803d' },
  { type: 'use', label: 'Use', icon: <PackageMinus size={16} />, color: '#d97706' },
  { type: 'borrow', label: 'Borrow', icon: <Handshake size={16} />, color: '#7c3aed' },
];

export default function TopBar({ onToggleSidebar, onQuickAction, onItemSelect, onAddItem, onImportCSV }: Props) {
  const { currentPage, searchQuery, setSearchQuery, items } = useInventory();
  const { role, logout } = useAuth();
  const isAdmin = role === 'admin';
  const isInventory = ['cleaning', 'office', 'clinic'].includes(currentPage);
  const isDashboard = currentPage === 'dashboard';

  // Borrowers only see the Borrow button
  const actionButtons = isAdmin
    ? ALL_ACTION_BUTTONS
    : ALL_ACTION_BUTTONS.filter(b => b.type === 'borrow');

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQuery, items]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleItemClick = (item: InventoryItem) => {
    setShowDropdown(false);
    setSearchQuery('');
    onItemSelect?.(item);
  };

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
      <div className="topbar-search" ref={dropdownRef}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-text)' }} />
        <input
          type="text"
          placeholder="Quick-find items..."
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            if (e.target.value) setShowDropdown(true);
          }}
          onFocus={() => { if (searchQuery) setShowDropdown(true); }}
          className="w-full pl-9 pr-4 py-2 rounded-xl font-body"
          style={{
            fontSize: 14,
            background: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            color: 'var(--fg-color)',
            outline: 'none',
          }}
        />
        {/* Quick-find dropdown */}
        {showDropdown && searchQuery && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl overflow-hidden z-50 animate-scale-up"
            style={{ background: 'var(--dropdown-bg)', border: '1px solid var(--card-border)' }}
          >
            {searchResults.length === 0 ? (
              <div className="px-4 py-3 font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>
                No items matching "{searchQuery}"
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {searchResults.map(item => {
                  const status = getStatus(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="w-full text-left px-4 py-2.5 flex items-center gap-3 table-row-hover"
                      style={{ borderBottom: '1px solid var(--card-border)' }}
                    >
                      <span className="font-body font-semibold flex-1 truncate" style={{ fontSize: 13, color: 'var(--fg-color)' }}>
                        {item.name}
                      </span>
                      <span className="font-body font-bold" style={{ fontSize: 13, color: 'var(--muted-text)', minWidth: 36, textAlign: 'right' }}>
                        {item.quantity}
                      </span>
                      <StatusBadge status={status} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="topbar-actions" style={{ alignItems: 'center' }}>
        {actionButtons.map(btn => (
          <button
            key={btn.type}
            onClick={() => onQuickAction(btn.type)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-body font-semibold transition-all hover:opacity-90"
            style={{
              fontSize: 13,
              background: 'transparent',
              border: `1.5px solid ${btn.color}`,
              color: btn.color,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = btn.color;
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = btn.color;
            }}
          >
            {btn.icon}
            <span>{btn.label}</span>
          </button>
        ))}
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
        {onImportCSV && (
          <button
            onClick={onImportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-body font-semibold transition-opacity hover:opacity-90"
            style={{ fontSize: 13, background: 'transparent', border: '1.5px solid var(--location-text)', color: 'var(--location-text)' }}
            title="Import inventory from CSV"
          >
            <Upload size={15} />
            <span>Import CSV</span>
          </button>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-1 px-2.5 py-2 rounded-xl font-body transition-opacity hover:opacity-80"
          style={{ fontSize: 12, background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--muted-text)', cursor: 'pointer' }}
          title="Sign out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}