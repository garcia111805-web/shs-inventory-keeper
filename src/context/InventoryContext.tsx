import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { InventoryItem, Transaction, PageName, Category } from '../types';
import { supabase } from '../lib/supabase';

interface InventoryContextType {
  items: InventoryItem[];
  transactions: Transaction[];
  currentPage: PageName;
  searchQuery: string;
  loading: boolean;
  setCurrentPage: (page: PageName) => void;
  setSearchQuery: (q: string) => void;
  addItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => Promise<{ merged: boolean }>;
  updateItem: (item: InventoryItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  voidTransaction: (tx: Transaction) => Promise<void>;
  refreshData: () => Promise<void>;
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

// Map Supabase row → frontend InventoryItem
function mapItem(row: any): InventoryItem {
  return {
    id: row.id,
    name: (row.name || '').toUpperCase(),
    category: (row.category || '').toLowerCase() as Category,
    unit: row.unit || 'pcs',
    quantity: row.quantity ?? 0,
    lowStockThreshold: row.low_stock_threshold ?? row.lowStockThreshold ?? 5,
    notes: row.notes || '',
    lastUpdated: row.last_updated || row.lastUpdated || new Date().toISOString().split('T')[0],
    location: row.location || undefined,
    isConsumable: row.is_consumable ?? true,
  };
}

// Map Supabase row → frontend Transaction
function mapTransaction(row: any): Transaction {
  return {
    id: row.id,
    itemId: row.item_id || row.itemId || '',
    itemName: (row.item_name || row.itemName || '').toUpperCase(),
    category: (row.category || '').toLowerCase() as Category,
    type: row.type as any,
    qtyChange: row.qty_change ?? row.qtyChange ?? 0,
    newStock: row.new_stock ?? row.newStock ?? 0,
    by: row.by || row.staff_name || '',
    returnDate: row.return_date || row.returnDate || undefined,
    notes: row.notes || '',
    date: row.date || row.created_at || new Date().toISOString(),
  };
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState<PageName>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [loading, setLoading] = useState(true);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [itemsRes, txRes] = await Promise.all([
        supabase.from('items').select('*').order('name'),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
      ]);

      if (itemsRes.data) setItems(itemsRes.data.map(mapItem));
      if (txRes.data) setTransactions(txRes.data.map(mapTransaction));
      if (itemsRes.error) throw itemsRes.error;
      if (txRes.error) throw txRes.error;
    } catch (err) {
      console.error('Fetch error:', err);
      throw err;
    }
  }, []);

  const addTransaction = useCallback(async (tx: Omit<Transaction, 'id'>) => {
    if (tx.newStock < 0) {
      throw new Error(`Insufficient stock for ${tx.itemName}. Operation cancelled.`);
    }
    // 1. Update item quantity
    const { error: updateErr } = await supabase
      .from('items')
      .update({
        quantity: tx.newStock,
        last_updated: new Date().toISOString().split('T')[0],
      })
      .eq('id', tx.itemId);

    if (updateErr) {
      console.error('Update stock error:', updateErr);
      throw updateErr;
    }

    // 2. Insert transaction record
    const { error: txErr } = await supabase.from('transactions').insert({
      item_id: tx.itemId,
      item_name: tx.itemName.toUpperCase(),
      category: tx.category,
      type: tx.type,
      qty_change: tx.qtyChange,
      new_stock: tx.newStock,
      staff_name: tx.by,
      return_date: tx.returnDate || null,
      notes: tx.notes || '',
      date: tx.date,
    });

    if (txErr) {
      console.error('Insert transaction error:', txErr);
      throw txErr;
    }
    // Realtime handles UI updates
  }, []);

  // ─── Initial fetch ───
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        await refreshData();
      } catch (err) {
        // Error handled in refreshData
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [refreshData]);

  // ─── Realtime subscriptions ───
  useEffect(() => {
    const channel = supabase
      .channel('inventory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => [...prev, mapItem(payload.new)]);
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(i => i.id === payload.new.id ? mapItem(payload.new) : i));
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTransactions(prev => [mapTransaction(payload.new), ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTransactions(prev => prev.map(t => t.id === payload.new.id ? mapTransaction(payload.new) : t));
        } else if (payload.eventType === 'DELETE') {
          setTransactions(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── CRUD operations via Supabase ───
  const addItem = useCallback(async (data: Omit<InventoryItem, 'id' | 'lastUpdated'>): Promise<{ merged: boolean }> => {
    const nameUpper = data.name.toUpperCase().trim();
    
    // 1. Check if an item with this name already exists
    const { data: existing, error: fetchErr } = await supabase
      .from('items')
      .select('*')
      .eq('name', nameUpper)
      .maybeSingle();

    if (fetchErr) {
      console.error('Check existing item error:', fetchErr);
      throw fetchErr;
    }

    if (existing) {
      // 2. If it exists, merge by updating the quantity
      const newQty = (existing.quantity || 0) + data.quantity;
      const { error: updateErr } = await supabase
        .from('items')
        .update({
          quantity: newQty,
          last_updated: new Date().toISOString().split('T')[0],
        })
        .eq('id', existing.id);
      
      if (updateErr) {
        console.error('Merge update error:', updateErr);
        throw updateErr;
      }

      // 3. Log a transaction record for the merge
      await addTransaction({
        itemId: existing.id,
        itemName: nameUpper,
        category: existing.category,
        type: 'restock',
        qtyChange: data.quantity,
        newStock: newQty,
        by: 'System (Auto-merge)',
        notes: 'Merged via Add Item UI',
        date: new Date().toISOString(),
      });
      return { merged: true };
    }

    // 4. If no duplicate, insert as new item
    const { error } = await supabase.from('items').insert({
      name: nameUpper,
      category: data.category,
      unit: data.unit,
      quantity: data.quantity,
      low_stock_threshold: data.lowStockThreshold,
      notes: data.notes,
      location: data.location || null,
      is_consumable: data.isConsumable,
      last_updated: new Date().toISOString().split('T')[0],
    });
    if (error) {
      console.error('Add item error:', error);
      throw error;
    }
    return { merged: false };
  }, [addTransaction]);

  const updateItem = useCallback(async (updated: InventoryItem) => {
    const { error } = await supabase.from('items').update({
      name: updated.name.toUpperCase(),
      category: updated.category,
      unit: updated.unit,
      quantity: updated.quantity,
      low_stock_threshold: updated.lowStockThreshold,
      notes: updated.notes,
      location: updated.location || null,
      is_consumable: updated.isConsumable,
      last_updated: new Date().toISOString().split('T')[0],
    }).eq('id', updated.id);
    if (error) {
      console.error('Update item error:', error);
      throw error;
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) {
      console.error('Delete item error:', error);
      throw error;
    }
  }, []);

  const updateTransaction = useCallback(async (updated: Transaction) => {
    const { error } = await supabase.from('transactions').update({
      staff_name: updated.by,
      return_date: updated.returnDate || null,
      notes: updated.notes || '',
    }).eq('id', updated.id);

    if (error) {
      console.error('Update transaction error:', error);
      throw error;
    }
  }, []);

  const voidTransaction = useCallback(async (tx: Transaction) => {
    // 1. Fetch current stock to revert accurately
    const { data: item, error: fetchErr } = await supabase.from('items').select('quantity').eq('id', tx.itemId).single();
    if (fetchErr || !item) {
      console.error('Fetch item error:', fetchErr);
      throw new Error("Item not found or deleted");
    }

    const revertedStock = item.quantity - tx.qtyChange;

    const { error: updateErr } = await supabase
      .from('items')
      .update({
        quantity: revertedStock,
        last_updated: new Date().toISOString().split('T')[0],
      })
      .eq('id', tx.itemId);

    if (updateErr) {
      console.error('Revert stock error:', updateErr);
      throw updateErr;
    }

    // 2. Delete transaction record
    const { error: txErr } = await supabase.from('transactions').delete().eq('id', tx.id);

    if (txErr) {
      console.error('Delete transaction error:', txErr);
      throw txErr;
    }

    // 3. Instantly remove from local UI to feel responsive
    setTransactions(prev => prev.filter(t => t.id !== tx.id));
  }, []);

  return (
    <InventoryContext.Provider value={{
      items, transactions, currentPage, searchQuery, loading,
      setCurrentPage, setSearchQuery,
      addItem, updateItem, deleteItem, addTransaction, updateTransaction, voidTransaction, refreshData, showToast, toasts,
    }}>
      {children}
    </InventoryContext.Provider>
  );
}
