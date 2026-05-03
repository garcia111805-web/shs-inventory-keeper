import { useInventory } from '../context/InventoryContext';
import { PageName } from '../types';
import { PackagePlus, CornerDownLeft, Search } from 'lucide-react';
import { useState } from 'react';

export default function SelfServicePortal() {
  const { setCurrentPage, setSearchQuery } = useInventory();
  const [showReturnSearch, setShowReturnSearch] = useState(false);
  const [searchName, setSearchName] = useState('');

  const handleReturnSearch = () => {
    if (!searchName.trim()) return;
    setSearchQuery(searchName.trim());
    setCurrentPage('transactions' as PageName);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-heading font-bold mb-2" style={{ fontSize: 28, color: 'var(--heading-color)' }}>
          Welcome, Staff
        </h1>
        <p className="font-body text-lg" style={{ color: 'var(--muted-text)' }}>
          What would you like to do today?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Borrow Option */}
        <button
          onClick={() => setCurrentPage('cleaning' as PageName)}
          className="panel-card p-8 flex flex-col items-center text-center gap-4 transition-all hover:scale-[1.02] hover:shadow-xl group"
          style={{ cursor: 'pointer', border: '2px solid transparent' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#7c3aed'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-6" style={{ background: '#7c3aed', color: 'white' }}>
            <PackagePlus size={40} />
          </div>
          <div>
            <h3 className="font-heading font-bold mb-1" style={{ fontSize: 20, color: 'var(--heading-color)' }}>Borrow Items</h3>
            <p className="font-body text-sm" style={{ color: 'var(--muted-text)' }}>Search the inventory and check out supplies</p>
          </div>
        </button>

        {/* Return Option */}
        <div className="relative">
          {!showReturnSearch ? (
            <button
              onClick={() => setShowReturnSearch(true)}
              className="panel-card p-8 w-full flex flex-col items-center text-center gap-4 transition-all hover:scale-[1.02] hover:shadow-xl group"
              style={{ cursor: 'pointer', border: '2px solid transparent' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#15803d'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
            >
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center transition-transform group-hover:-rotate-6" style={{ background: '#15803d', color: 'white' }}>
                <CornerDownLeft size={40} />
              </div>
              <div>
                <h3 className="font-heading font-bold mb-1" style={{ fontSize: 20, color: 'var(--heading-color)' }}>Return Items</h3>
                <p className="font-body text-sm" style={{ color: 'var(--muted-text)' }}>View and return your active borrows</p>
              </div>
            </button>
          ) : (
            <div className="panel-card p-8 h-full flex flex-col items-center justify-center gap-4 animate-scale-up">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(21,128,61,0.1)', color: '#15803d' }}>
                <Search size={28} />
              </div>
              <div className="w-full">
                <h3 className="font-heading font-bold text-center mb-2" style={{ fontSize: 18, color: 'var(--heading-color)' }}>Find Your Borrows</h3>
                <input
                  autoFocus
                  type="text"
                  placeholder="Enter your full name..."
                  className="modal-input text-center"
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReturnSearch()}
                />
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => setShowReturnSearch(false)}
                    className="flex-1 py-2 font-body font-semibold rounded-xl"
                    style={{ background: 'var(--input-bg)', color: 'var(--muted-text)' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleReturnSearch}
                    disabled={!searchName.trim()}
                    className="flex-1 py-2 font-body font-bold rounded-xl text-white disabled:opacity-50"
                    style={{ background: '#15803d' }}
                  >
                    View My List
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 p-6 rounded-2xl" style={{ background: 'rgba(13,27,110,0.03)', border: '1px dashed var(--card-border)' }}>
        <h4 className="font-heading font-bold mb-2" style={{ fontSize: 16, color: 'var(--heading-color)' }}>Quick Guidelines</h4>
        <ul className="font-body text-sm space-y-2" style={{ color: 'var(--muted-text)' }}>
          <li>• Always ensure item quantities are accurate before confirming a borrow.</li>
          <li>• Return items promptly to keep the inventory available for others.</li>
          <li>• For any issues, please contact the Property Office admin.</li>
        </ul>
      </div>
    </div>
  );
}
