import { useState } from 'react';
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
import AddEditItemModal from '../components/AddEditItemModal';
import StockMovementModal from '../components/StockMovementModal';
import CSVImportModal from '../components/CSVImportModal';
import { Category, TransactionType, InventoryItem } from '../types';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { currentPage, loading } = useInventory();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [showAddItem, setShowAddItem] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [stockMovementType, setStockMovementType] = useState<TransactionType | null>(null);
  const [stockMovementItem, setStockMovementItem] = useState<InventoryItem | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isInventory = ['cleaning', 'office', 'clinic'].includes(currentPage);

  const openStockMovement = (type: TransactionType, item?: InventoryItem) => {
    setStockMovementType(type);
    setStockMovementItem(item);
  };

  const closeStockMovement = () => {
    setStockMovementType(null);
    setStockMovementItem(undefined);
  };

  const renderPage = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin" style={{ color: 'var(--muted-text)' }} />
            <p className="font-body" style={{ fontSize: 14, color: 'var(--muted-text)' }}>Loading inventory data...</p>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'cleaning': return <InventoryPage category="cleaning" onAddItem={isAdmin ? () => setShowAddItem(true) : undefined} />;
      case 'office': return <InventoryPage category="office" onAddItem={isAdmin ? () => setShowAddItem(true) : undefined} />;
      case 'clinic': return <InventoryPage category="clinic" onAddItem={isAdmin ? () => setShowAddItem(true) : undefined} />;
      case 'transactions': return <TransactionLog />;
      case 'reports': return isAdmin ? <Reports /> : <Dashboard />;
      case 'settings': return isAdmin ? <SettingsPage /> : <Dashboard />;
      default: return <Dashboard />;
    }
  };

  // Borrower can only use 'borrow' type
  const handleQuickAction = (type: TransactionType) => {
    if (!isAdmin && type !== 'borrow') return;
    openStockMovement(type);
  };

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-content">
        <TopBar
          onToggleSidebar={() => setSidebarOpen(open => !open)}
          onQuickAction={handleQuickAction}
          onItemSelect={(item) => openStockMovement(isAdmin ? 'restock' : 'borrow', item)}
          onAddItem={isAdmin && isInventory ? () => setShowAddItem(true) : undefined}
          onImportCSV={isAdmin ? () => setShowCSVImport(true) : undefined}
        />
        {renderPage()}
      </div>
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <ToastContainer />
      {showAddItem && isAdmin && (
        <AddEditItemModal
          defaultCategory={currentPage as Category}
          onClose={() => setShowAddItem(false)}
        />
      )}
      {showCSVImport && isAdmin && (
        <CSVImportModal onClose={() => setShowCSVImport(false)} />
      )}
      {stockMovementType && (
        <StockMovementModal
          defaultType={stockMovementType}
          item={stockMovementItem}
          onClose={closeStockMovement}
        />
      )}
    </div>
  );
}