import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import ToastContainer from '../components/ToastContainer';
import Dashboard from './Dashboard';
import InventoryPage from './InventoryPage';
import TransactionLog from './TransactionLog';
import Reports from './Reports';
import AddEditItemModal from '../components/AddEditItemModal';
import LogUsageModal from '../components/LogUsageModal';
import { Category } from '../types';

export default function Index() {
  const { currentPage } = useInventory();
  const [showAddItem, setShowAddItem] = useState(false);
  const [showLogUsage, setShowLogUsage] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isInventory = ['cleaning', 'office', 'clinic'].includes(currentPage);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'cleaning': return <InventoryPage category="cleaning" onAddItem={() => setShowAddItem(true)} />;
      case 'office': return <InventoryPage category="office" onAddItem={() => setShowAddItem(true)} />;
      case 'clinic': return <InventoryPage category="clinic" onAddItem={() => setShowAddItem(true)} />;
      case 'transactions': return <TransactionLog />;
      case 'reports': return <Reports />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-content">
        <TopBar
          onToggleSidebar={() => setSidebarOpen(open => !open)}
          onLogUsage={() => setShowLogUsage(true)}
          onAddItem={isInventory ? () => setShowAddItem(true) : undefined}
        />
        {renderPage()}
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
      {showLogUsage && <LogUsageModal onClose={() => setShowLogUsage(false)} />}
    </div>
  );
}