import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { PageName, getStatus } from '../types';
import { Sun, Moon, X, Settings } from 'lucide-react';

const navSections = [
  {
    label: 'MAIN',
    items: [
      { page: 'portal' as PageName, label: 'Portal' },
      { page: 'dashboard' as PageName, label: 'Dashboard' }
    ],
  },
  {
    label: 'INVENTORY',
    items: [
      { page: 'cleaning' as PageName, label: 'Cleaning Materials' },
      { page: 'office' as PageName, label: 'Office Supplies' },
      { page: 'clinic' as PageName, label: 'Clinic Supplies' },
    ],
  },
  {
    label: 'RECORDS',
    items: [
      { page: 'transactions' as PageName, label: 'Transaction Log' },
      { page: 'reports' as PageName, label: 'Reports' },
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: Props) {
  const { currentPage, setCurrentPage, items, darkMode, toggleDarkMode } = useInventory();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  // Filter nav sections based on role
  const filteredSections = navSections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (!isAdmin) {
        // Staff only see the Portal
        if (item.page !== 'portal') return false;
      }
      if (isAdmin && item.page === 'portal') return false;
      return true;
    }),
  })).filter(section => section.items.length > 0);

  const criticalCounts = {
    cleaning: items.filter(i => i.category === 'cleaning' && (getStatus(i) === 'out-of-stock' || getStatus(i) === 'low-stock')).length,
    office: items.filter(i => i.category === 'office' && (getStatus(i) === 'out-of-stock' || getStatus(i) === 'low-stock')).length,
    clinic: items.filter(i => i.category === 'clinic' && (getStatus(i) === 'out-of-stock' || getStatus(i) === 'low-stock')).length,
  };

  const handleNav = (page: PageName) => {
    setCurrentPage(page);
    onClose();
  };

  return (
    <aside
      className={`sidebar ${isOpen ? 'open' : ''}`}
      style={{
        background: 'linear-gradient(175deg, #0a1560 0%, #0d1b6e 45%, #1a0a3e 75%, #6b0a0a 100%)',
      }}
    >
      <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">
        <X size={18} />
      </button>
      {/* Logo area */}
      <div className="flex flex-col items-center py-5 px-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <img
          src="/images/349022250_260267146537592_5468556789585259072_n-removebg-preview.png"
          alt="SSHS Logo"
          className="rounded-full"
          style={{
            width: 80, height: 80,
            border: '3px solid #e8b400',
            boxShadow: '0 0 16px rgba(232,180,0,0.45), 0 0 32px rgba(232,180,0,0.18)',
          }}
        />
        <h2 className="font-heading font-bold text-center mt-2" style={{ color: '#e8b400', fontSize: 14 }}>
          Sucat Senior High School
        </h2>
        <p className="font-body text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          City of Muntinlupa
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {filteredSections.map(section => (
          <div key={section.label}>
            <p className="font-body uppercase mb-1.5 px-3" style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.05em' }}>
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const active = currentPage === item.page;
                const badgeCount = item.page === 'cleaning' ? criticalCounts.cleaning
                  : item.page === 'office' ? criticalCounts.office
                  : item.page === 'clinic' ? criticalCounts.clinic : 0;

                return (
                  <button
                    key={item.page}
                    onClick={() => handleNav(item.page)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-body flex items-center justify-between transition-all"
                    style={active ? {
                      background: '#e8b400',
                      color: '#0d1b6e',
                      fontWeight: 600,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.15), 0 0 12px rgba(232,180,0,0.35)',
                    } : {
                      color: 'rgba(255,255,255,0.7)',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span>{'· '}{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="font-body font-bold rounded-full px-2 py-0.5 sidebar-badge-pulse" style={{
                        fontSize: 11,
                        background: '#dc2626',
                        color: 'white',
                        minWidth: 24,
                        textAlign: 'center',
                        boxShadow: '0 0 8px rgba(220,38,38,0.5)',
                      }}>
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings link (admin only) */}
      {isAdmin && (
        <div className="px-3 pb-2">
          <button
            onClick={() => handleNav('settings' as PageName)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full font-body text-sm transition-all"
            style={{
              background: currentPage === 'settings' ? '#e8b400' : 'rgba(255,255,255,0.08)',
              color: currentPage === 'settings' ? '#0d1b6e' : 'rgba(255,255,255,0.75)',
              fontWeight: currentPage === 'settings' ? 600 : 400,
            }}
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
      )}

      {/* Dark mode toggle */}
      <div className="px-3 pb-4">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full font-body text-sm transition-all"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
        >
          {darkMode ? <Moon size={16} /> : <Sun size={16} />}
          {darkMode ? 'Dark Mode' : 'Light Mode'}
        </button>
      </div>
    </aside>
  );
}