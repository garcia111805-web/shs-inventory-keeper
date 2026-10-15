import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { PageName, getStatus } from '../types';
import { Sun, Moon, X, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCategories } from '../hooks/useCategories';

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
  const { currentPage, setCurrentPage, items } = useInventory();
  const { theme, toggleTheme } = useTheme();
  const { role } = useAuth();
  const { categories } = useCategories();
  const isAdmin = role === 'admin';

  const inventoryItems = categories.length > 0 
    ? categories.map(cat => ({ page: cat.name as PageName, label: cat.name.charAt(0).toUpperCase() + cat.name.slice(1) }))
    : [
        { page: 'cleaning' as PageName, label: 'Cleaning Materials' },
        { page: 'office' as PageName, label: 'Office Supplies' },
        { page: 'clinic' as PageName, label: 'Clinic Supplies' },
      ];

  const dynamicNavSections = [
    {
      label: 'MAIN',
      items: [
        { page: 'portal' as PageName, label: 'Portal' },
        { page: 'dashboard' as PageName, label: 'Dashboard' }
      ],
    },
    {
      label: 'INVENTORY',
      items: inventoryItems,
    },
    {
      label: 'RECORDS',
      items: [
        { page: 'transactions' as PageName, label: 'Transaction Log' },
        { page: 'quarantine' as PageName, label: 'Damaged Items' },
        { page: 'reports' as PageName, label: 'Reports' },
      ],
    },
  ];

  // Filter nav sections based on role
  const filteredSections = dynamicNavSections.map(section => ({
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

  const criticalCounts: Record<string, number> = {};
  inventoryItems.forEach(item => {
    criticalCounts[item.page] = items.filter(i => i.category === item.page && (getStatus(i) === 'out-of-stock' || getStatus(i) === 'low-stock')).length;
  });

  const handleNav = (page: PageName) => {
    setCurrentPage(page);
    onClose();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">
        <X size={18} />
      </button>
      
      {/* Logo area */}
      <div className="flex flex-col items-center py-8 px-6" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <img
            src="/images/349022250_260267146537592_5468556789585259072_n-removebg-preview.png"
            alt="Sucat Elementary School Logo"
            className="relative rounded-full bg-white p-0.5"
            style={{
              width: 84, height: 84,
              border: '2px solid var(--sidebar-border)',
            }}
          />
        </div>
        <h2 className="font-heading font-black text-center mt-4" style={{ color: 'var(--heading-color)', fontSize: 18 }}>
          Sucat Elementary School
        </h2>
        <p className="font-body text-[11px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--muted-text)', opacity: 1 }}>
          Inventory System
        </p>
      </div>
 
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        {filteredSections.map(section => (
          <div key={section.label}>
            <p className="font-body font-black uppercase mb-3 px-3" style={{ fontSize: 11, color: 'var(--muted-text)', opacity: 0.8, letterSpacing: '0.15em' }}>
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map(item => {
                const active = currentPage === item.page;
                const badgeCount = criticalCounts[item.page] || 0;
 
                return (
                  <button
                    key={item.page}
                    onClick={() => handleNav(item.page)}
                    className="w-full text-left px-4 py-3 rounded-xl text-base font-body flex items-center justify-between transition-all duration-200"
                    style={active ? {
                      background: 'var(--sidebar-item-active)',
                      color: 'var(--sidebar-item-active-text)',
                      fontWeight: 800,
                      boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                    } : {
                      color: 'var(--sidebar-text)',
                      fontWeight: 700,
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'var(--sidebar-item-hover)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                  >
                    <span className="flex items-center gap-3">
                      {item.page === 'quarantine' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-slate-300 dark:bg-slate-700'}`}></span>
                      )}
                      <span style={{ color: item.page === 'quarantine' && !active ? '#dc2626' : undefined }}>{item.label}</span>
                    </span>
                    {badgeCount > 0 && (
                      <span className="font-body font-bold rounded-lg px-2 py-0.5" style={{
                        fontSize: 10,
                        background: active ? 'rgba(255,255,255,0.2)' : 'rgba(239, 68, 68, 0.15)',
                        color: active ? 'white' : '#ef4444',
                        minWidth: 20,
                        textAlign: 'center',
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
        <div className="px-4 pb-6">
          <button
            onClick={() => handleNav('settings' as PageName)}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-body text-base transition-all duration-200 hover:shadow-lg border border-slate-200 dark:border-slate-800"
            style={{
              background: currentPage === 'settings' ? 'var(--sidebar-item-active)' : 'var(--card-bg)',
              color: currentPage === 'settings' ? 'var(--sidebar-item-active-text)' : 'var(--sidebar-text)',
              fontWeight: 800,
              boxShadow: currentPage === 'settings' ? '0 8px 20px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            <Settings size={18} />
            Settings
          </button>
        </div>
      )}
 
    </aside>
  );
}