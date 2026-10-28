import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import ToastContainer from '../components/ToastContainer';
import Dashboard from './Dashboard';
import InventoryPage from './InventoryPage';
import TransactionLog from './TransactionLog';
import Reports from './Reports';
import SettingsPage from './Settings';
import SelfServicePortal from '../components/SelfServicePortal';
import AddEditItemModal from '../components/AddEditItemModal';
import StockMovementModal from '../components/StockMovementModal';
import CSVImportModal from '../components/CSVImportModal';
import { Category, TransactionType, InventoryItem } from '../types';
import { Loader2, LogOut, Handshake, Sun, Moon, LayoutGrid } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCategories } from '../hooks/useCategories';

export default function Index() {
  const { currentPage, setCurrentPage, loading } = useInventory();
  const { role, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { categories } = useCategories();
  const isAdmin = role === 'admin';
  
  const [showAddItem, setShowAddItem] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [stockMovementType, setStockMovementType] = useState<TransactionType | null>(null);
  const [stockMovementItem, setStockMovementItem] = useState<InventoryItem | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [staffMode, setStaffMode] = useState<'borrow' | 'use' | 'return'>('borrow');

  // Ensure non-admins start on the portal
  useEffect(() => {
    if (role && !isAdmin && currentPage === 'dashboard') {
      setCurrentPage('portal');
    }
  }, [role, isAdmin, currentPage, setCurrentPage]);

  const openStockMovement = (type: TransactionType, item?: InventoryItem) => {
    setStockMovementType(type);
    setStockMovementItem(item);
  };

  const closeStockMovement = () => {
    setStockMovementType(null);
    setStockMovementItem(undefined);
  };

  const handleQuickAction = (type: TransactionType) => {
    if (role !== 'admin' && type !== 'borrow') return;
    openStockMovement(type);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'transactions': return <TransactionLog />;
      case 'reports': return <Reports />;
      case 'quarantine': return (
        <InventoryPage
          category="all"
          onAddItem={() => setShowAddItem(true)}
          onImportCSV={() => setShowCSVImport(true)}
          onStockMovement={handleQuickAction}
          initialQuarantineFilter={true}
        />
      );
      case 'settings': return <SettingsPage />;
      case 'portal': return (
        <div className="p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <header 
              className="flex items-center justify-between p-4 transition-colors duration-300 rounded-2xl border"
              style={{ 
                background: 'var(--topbar-bg)', 
                borderColor: 'var(--topbar-border)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="flex items-center gap-3">
                <Handshake size={24} className="text-[#e8b400]" />
                <h2 className="font-heading font-bold" style={{ color: 'var(--heading-color)' }}>Operations Preview</h2>
              </div>
              <p className="text-xs italic" style={{ color: 'var(--muted-text)' }}>What staff see</p>
            </header>
            <SelfServicePortal onAction={(type) => {
              setStaffMode(type);
              setCurrentPage('all');
            }} />
          </div>
        </div>
      );
      default: {
        // Check if the current page is 'all' or a dynamic category
        const isCategory = currentPage === 'all' ||
                          categories.some(cat => cat.name === currentPage) || 
                          ['cleaning', 'office', 'clinic'].includes(currentPage);
        
        if (isCategory) {
          return (
            <InventoryPage 
              category={currentPage} 
              onAddItem={() => setShowAddItem(true)} 
              onImportCSV={() => setShowCSVImport(true)} 
              onStockMovement={handleQuickAction} 
              forcedType={isAdmin ? undefined : staffMode} 
            />
          );
        }
        
        return isAdmin ? <Dashboard /> : <SelfServicePortal onAction={(type) => {
          setStaffMode(type);
          setCurrentPage('all');
        }} />;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300" style={{ background: 'var(--app-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={48} className="animate-spin text-[#e8b400]" />
          <p className="font-body text-[var(--muted-text)]" style={{ fontSize: 14 }}>Initializing system...</p>
        </div>
      </div>
    );
  }

  // ─── STAFF LAYOUT ───
  if (role && role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ background: 'var(--app-bg)' }}>
        <header className="px-6 py-4 flex items-center justify-between border-b transition-colors duration-300" style={{ background: 'var(--topbar-bg)', borderColor: 'var(--topbar-border)' }}>
          <div className="flex items-center gap-3">
            <img src="/images/sucat-elementary-logo.png" alt="Sucat Elementary School Logo" className="w-8 h-8 rounded-full border border-[#e8b400] object-contain bg-white p-0.5" />
            <div>
              <h2 className="font-heading font-bold" style={{ fontSize: 18, color: 'var(--heading-color)', lineHeight: 1.2 }}>Staff Operations</h2>
              <div className="flex items-center gap-2">
                <p className="font-body text-[10px] uppercase tracking-wider font-bold text-[#e8b400]">{user?.fullName}</p>
                <span className="text-[10px] text-slate-400">•</span>
                <button
                  onClick={logout}
                  className="font-body text-[10px] text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 underline transition-colors font-medium"
                >
                  Switch User
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all shadow-sm"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all font-body text-xs font-bold"
            >
              <LogOut size={14} /> Switch / Logout
            </button>
          </div>
        </header>

        <main className="flex-1 p-0 overflow-y-auto">
          {currentPage === 'portal' ? (
            <SelfServicePortal onAction={(type) => {
              setStaffMode(type);
              setCurrentPage('all');
            }} />
          ) : (
            <div className="animate-fade-in h-full flex flex-col">
              <div className="flex-1 overflow-y-auto">
                {renderPage()}
              </div>
            </div>
          )}
        </main>
        
        <ToastContainer />
      </div>
    );
  }

  // ─── ADMIN LAYOUT ───
  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-content">
        <TopBar
          onToggleSidebar={() => setSidebarOpen(open => !open)}
          onQuickAction={handleQuickAction}
          onItemSelect={(item) => openStockMovement('restock', item)}
        />
        <div className="flex-1 overflow-y-auto">
          {renderPage()}
        </div>
      </div>
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <ToastContainer />
      
      {showAddItem && (
        <AddEditItemModal
          defaultCategory={currentPage as Category}
          onClose={() => setShowAddItem(false)}
        />
      )}
      {showCSVImport && (
        <CSVImportModal onClose={() => setShowCSVImport(false)} />
      )}
      {stockMovementType && (
        <StockMovementModal
          defaultType={stockMovementType}
          item={stockMovementItem}
          lockType={true}
          onClose={closeStockMovement}
        />
      )}
    </div>
  );
}