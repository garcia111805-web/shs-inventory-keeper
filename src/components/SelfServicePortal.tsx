import React from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { PageName } from '../types';
import { 
  PackagePlus, 
  CornerDownLeft, 
  User, 
  ClipboardList, 
  ShoppingBag, 
  ArrowRight, 
  ArrowLeftRight 
} from 'lucide-react';

interface PortalProps {
  onAction?: (mode: 'borrow' | 'use' | 'return') => void;
}

export default function SelfServicePortal({ onAction }: PortalProps) {
  const { setCurrentPage, setSearchQuery } = useInventory();
  const { user, logout } = useAuth();

  const handleGoToBorrow = () => {
    onAction?.('borrow');
    setCurrentPage('all' as PageName);
  };

  const handleGoToMyReturns = () => {
    onAction?.('return');
    setCurrentPage('all' as PageName);
  };

  const handleGoToUse = () => {
    onAction?.('use');
    setCurrentPage('all' as PageName);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[#e8b400]/15 text-[#e8b400] text-[10px] font-bold uppercase tracking-wider border border-[#e8b400]/30">
              Staff Portal Active
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white/80 text-xs font-semibold transition-all border border-slate-200 dark:border-white/10 shadow-sm"
              title="Not your account? Click here to switch"
            >
              <ArrowLeftRight size={12} />
              <span>Not {user?.fullName?.split(' ')[0] || 'you'}? Switch User</span>
            </button>
          </div>
          <h1 className="font-heading font-bold" style={{ fontSize: 48, color: '#e8b400', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Hello, {user?.fullName || 'Staff'}!
          </h1>
          <p className="font-body text-2xl" style={{ color: 'var(--fg-color)', opacity: 0.8 }}>
            What are you working on today?
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Borrow Option */}
        <button
          onClick={handleGoToBorrow}
          className="panel-card p-8 flex flex-col items-center text-center gap-5 transition-all hover:translate-y-[-4px] hover:shadow-2xl group border-2 border-transparent hover:border-[#7c3aed]/30"
          style={{ cursor: 'pointer' }}
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg transition-all group-hover:scale-110 group-hover:rotate-3" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white' }}>
            <ShoppingBag size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="font-heading font-bold" style={{ fontSize: 20, color: 'var(--heading-color)' }}>Borrow Items</h3>
            <p className="font-body text-xs opacity-50 leading-relaxed">For non-consumable tools like brooms and garden tools.</p>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[#7c3aed] font-body font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            View Inventory <ArrowRight size={14} />
          </div>
        </button>

        {/* Use Option */}
        <button
          onClick={handleGoToUse}
          className="panel-card p-8 flex flex-col items-center text-center gap-5 transition-all hover:translate-y-[-4px] hover:shadow-2xl group border-2 border-transparent hover:border-[#d97706]/30"
          style={{ cursor: 'pointer' }}
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg transition-all group-hover:scale-110 group-hover:rotate-0" style={{ background: 'linear-gradient(135deg, #d97706, #ea580c)', color: 'white' }}>
            <PackagePlus size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="font-heading font-bold" style={{ fontSize: 20, color: 'var(--heading-color)' }}>Use Consumables</h3>
            <p className="font-body text-xs opacity-50 leading-relaxed">For single-use items like paper, chalk, or cleaning supplies.</p>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[#d97706] font-body font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            Open List <ArrowRight size={14} />
          </div>
        </button>

        {/* Return Option */}
        <button
          onClick={handleGoToMyReturns}
          className="panel-card p-8 flex flex-col items-center text-center gap-5 transition-all hover:translate-y-[-4px] hover:shadow-2xl group border-2 border-transparent hover:border-[#15803d]/30"
          style={{ cursor: 'pointer' }}
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg transition-all group-hover:scale-110 group-hover:-rotate-3" style={{ background: 'linear-gradient(135deg, #15803d, #16a34a)', color: 'white' }}>
            <ClipboardList size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="font-heading font-bold" style={{ fontSize: 20, color: 'var(--heading-color)' }}>Return Items</h3>
            <p className="font-body text-xs opacity-50 leading-relaxed">Check your active borrows and bring them back to stock.</p>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[#15803d] font-body font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            My Records <ArrowRight size={14} />
          </div>
        </button>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 flex items-start gap-4 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0">
            <User size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-heading font-bold text-lg" style={{ color: 'var(--heading-color)' }}>Account Active</h4>
              <button
                onClick={logout}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold inline-flex items-center gap-1"
              >
                <ArrowLeftRight size={11} /> Switch
              </button>
            </div>
            <p className="text-sm font-body leading-tight" style={{ color: 'var(--fg-color)', opacity: 0.8 }}>
              Actions will be recorded under <strong>{user?.fullName}</strong>.
            </p>
          </div>
        </div>
        
        <div className="p-6 rounded-2xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 flex items-start gap-4 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400 shrink-0">
            <ArrowLeftRight size={24} />
          </div>
          <div>
            <h4 className="font-heading font-bold text-lg mb-1" style={{ color: 'var(--heading-color)' }}>Fast Processing</h4>
            <p className="text-sm font-body leading-tight" style={{ color: 'var(--fg-color)', opacity: 0.8 }}>Stock is updated in real-time across all devices.</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 flex items-start gap-4 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500 dark:text-purple-400 shrink-0">
            <CornerDownLeft size={24} />
          </div>
          <div>
            <h4 className="font-heading font-bold text-lg mb-1" style={{ color: 'var(--heading-color)' }}>Stay Accountable</h4>
            <p className="text-sm font-body leading-tight" style={{ color: 'var(--fg-color)', opacity: 0.8 }}>Please return items by the end of the day.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
