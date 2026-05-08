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
      <div className="flex-1" />
      <div className="topbar-actions flex-1 justify-end" style={{ alignItems: 'center' }}>
        <div className="ml-auto pl-6 border-l border-slate-200 dark:border-slate-700 h-8 flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-body font-semibold transition-opacity hover:opacity-90"
            style={{ 
              fontSize: 13, 
              background: '#fef2f2', 
              border: '1.5px solid #fca5a5', 
              color: '#b91c1c', 
              cursor: 'pointer' 
            }}
            title="Sign out"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}