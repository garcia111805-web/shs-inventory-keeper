import { useState, useMemo, useRef, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { TransactionType, InventoryItem, getStatus } from '../types';
import StatusBadge from './StatusBadge';
import { Search, Plus, Menu, PackagePlus, PackageMinus, Handshake, LogOut, Upload, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  onToggleSidebar: () => void;
  onQuickAction: (type: TransactionType) => void;
  onItemSelect?: (item: InventoryItem) => void;
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

export default function TopBar({ onToggleSidebar, onQuickAction, onItemSelect }: Props) {
  const { currentPage, searchQuery, setSearchQuery, items } = useInventory();
  const { role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
      className="topbar sticky top-0 z-50 flex items-center gap-4 px-8 py-4"
      style={{
        background: 'var(--topbar-bg)',
        borderBottom: '1px solid var(--topbar-border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="topbar-left flex items-center gap-4 min-w-[200px]">
        <button className="hamburger-btn" onClick={onToggleSidebar} aria-label="Open menu">
          <Menu size={18} />
        </button>
        <h1 className="font-heading font-bold" style={{ fontSize: 22, color: 'var(--heading-color)', letterSpacing: '-0.02em' }}>
          {pageTitles[currentPage] || currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}
        </h1>
      </div>

      <div className="flex-1 max-w-xl mx-auto relative" ref={dropdownRef}>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            className="w-full bg-slate-100 dark:bg-slate-900/50 border-none rounded-2xl py-3 pl-11 pr-4 font-body text-sm focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
            placeholder="Search items, categories, or notes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
        </div>

        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 p-2 panel-card shadow-2xl z-[100] animate-scale-up">
            {searchResults.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group"
              >
                <div className="flex flex-col items-start">
                  <span className="font-body font-medium text-sm text-slate-700 dark:text-slate-200">{item.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{item.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={getStatus(item)} />
                  <span className="font-body font-bold text-sm text-slate-500 group-hover:text-blue-500 transition-colors">{item.quantity} {item.unit}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-right flex items-center gap-3 ml-auto">
        <button 
          onClick={toggleTheme}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all shadow-sm"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

        <button
          onClick={logout}
          className="group flex items-center gap-2 px-5 py-3 rounded-2xl font-body font-bold text-sm bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition-all shadow-sm"
        >
          <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </div>
  );
}