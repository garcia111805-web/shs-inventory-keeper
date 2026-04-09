import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { InventoryItem, Transaction, PageName, Category } from '../types';
import { initialItems } from '../data/initialItems';

interface InventoryContextType {
  items: InventoryItem[];
  transactions: Transaction[];
  currentPage: PageName;
  searchQuery: string;
  darkMode: boolean;
  setCurrentPage: (page: PageName) => void;
  setSearchQuery: (q: string) => void;
  toggleDarkMode: () => void;
  addItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
  updateItem: (item: InventoryItem) => void;
  deleteItem: (id: string) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  toasts: ToastItem[];
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning';
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be inside InventoryProvider');
  return ctx;
}

function loadFromLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(() => loadFromLS('sshs-items', initialItems));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadFromLS('sshs-transactions', []));
  const [currentPage, setCurrentPage] = useState<PageName>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(() => loadFromLS('sshs-dark', false));
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => { localStorage.setItem('sshs-items', JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem('sshs-transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => {
    localStorage.setItem('sshs-dark', JSON.stringify(darkMode));
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => setDarkMode(d => !d), []);

  const addItem = useCallback((data: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    const newItem: InventoryItem = { ...data, id: `item-${Date.now()}`, lastUpdated: new Date().toISOString().split('T')[0] };
    setItems(prev => [...prev, newItem]);
  }, []);

  const updateItem = useCallback((updated: InventoryItem) => {
    setItems(prev => prev.map(i => i.id === updated.id ? { ...updated, lastUpdated: new Date().toISOString().split('T')[0] } : i));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { ...tx, id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    setTransactions(prev => [newTx, ...prev]);
    setItems(prev => prev.map(i => i.id === tx.itemId ? { ...i, quantity: tx.newStock, lastUpdated: new Date().toISOString().split('T')[0] } : i));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return (
    <InventoryContext.Provider value={{
      items, transactions, currentPage, searchQuery, darkMode,
      setCurrentPage, setSearchQuery, toggleDarkMode,
      addItem, updateItem, deleteItem, addTransaction, showToast, toasts,
    }}>
      {children}
    </InventoryContext.Provider>
  );
}
