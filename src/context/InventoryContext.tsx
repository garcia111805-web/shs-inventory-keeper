import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { InventoryItem, Transaction, PageName, Category } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { initialItems } from '../data/initialItems';

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
  moveItemToQuarantine: (itemId: string, qty: number, notes: string, by: string, isReturn?: boolean) => Promise<void>;
  releaseFromQuarantine: (itemId: string, qty: number, notes: string, by: string) => Promise<void>;
  disposeFromQuarantine: (itemId: string, qty: number, notes: string, by: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  voidTransaction: (tx: Transaction) => Promise<void>;
  refreshData: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  toasts: ToastItem[];
  /**
   * Delete all items and transactions, resetting the inventory.
   * This is used for a full wipe before a fresh import.
   */
  wipeAllItems: () => Promise<void>;
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
    quarantineQuantity: row.quarantine_quantity ?? row.quarantineQuantity ?? 0,
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
  const [items, setItems] = useState<InventoryItem[]>(() => {
    // If the key exists in localStorage (even as []), respect it — don't fall back to seed data.
    // This prevents the demo items from reappearing after a wipe.
    const raw = localStorage.getItem('sucat_items');
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : initialItems;
      } catch { return initialItems; }
    }
    return initialItems;
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadFromLS<Transaction[]>('sucat_transactions', []));
  const [currentPage, setCurrentPage] = useState<PageName>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync to localStorage in offline/unconfigured mode
  useEffect(() => {
    if (!isSupabaseConfigured) {
      try {
        localStorage.setItem('sucat_items', JSON.stringify(items));
      } catch {}
    }
  }, [items]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      try {
        localStorage.setItem('sucat_transactions', JSON.stringify(transactions));
      } catch {}
    }
  }, [transactions]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const refreshData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      const raw = localStorage.getItem('sucat_items');
      if (raw !== null) {
        try {
          const parsed = JSON.parse(raw);
          setItems(Array.isArray(parsed) ? parsed : initialItems);
        } catch {
          setItems(initialItems);
        }
      } else {
        setItems(initialItems);
      }
      const cachedTx = loadFromLS<Transaction[]>('sucat_transactions', []);
      setTransactions(cachedTx);
      return;
    }

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

    if (!isSupabaseConfigured) {
      const newTx: Transaction = {
        ...tx,
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };
      setItems(prev => prev.map(item => item.id === tx.itemId ? { ...item, quantity: tx.newStock, lastUpdated: new Date().toISOString().split('T')[0] } : item));
      setTransactions(prev => [newTx, ...prev]);
      return;
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
    if (!isSupabaseConfigured) return;
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

  // ─── CRUD operations ───
  const addItem = useCallback(async (data: Omit<InventoryItem, 'id' | 'lastUpdated'>): Promise<{ merged: boolean }> => {
    const nameUpper = data.name.toUpperCase().trim();
    
    if (!isSupabaseConfigured) {
      const existing = items.find(i => i.name.toUpperCase() === nameUpper);
      if (existing) {
        const newQty = (existing.quantity || 0) + data.quantity;
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
      const newItem: InventoryItem = {
        ...data,
        name: nameUpper,
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        lastUpdated: new Date().toISOString().split('T')[0],
      };
      setItems(prev => [...prev, newItem]);
      return { merged: false };
    }

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
      quarantine_quantity: data.quarantineQuantity || 0,
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
  }, [items, addTransaction]);

  const updateItem = useCallback(async (updated: InventoryItem) => {
    if (!isSupabaseConfigured) {
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      return;
    }
    const { error } = await supabase.from('items').update({
      name: updated.name.toUpperCase(),
      category: updated.category,
      unit: updated.unit,
      quantity: updated.quantity,
      quarantine_quantity: updated.quarantineQuantity,
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

  const moveItemToQuarantine = useCallback(async (itemId: string, qty: number, notes: string, by: string, isReturn: boolean = false) => {
    const item = items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');
    
    // If it's a return, we don't reduce available stock (it was already out)
    const newAvailable = isReturn ? item.quantity : item.quantity - qty;
    if (!isReturn && item.quantity < qty) throw new Error('Insufficient available stock');
    
    const newQuarantine = (item.quarantineQuantity || 0) + qty;

    if (!isSupabaseConfigured) {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newAvailable, quarantineQuantity: newQuarantine, lastUpdated: new Date().toISOString().split('T')[0] } : i));
      await addTransaction({
        itemId,
        itemName: item.name,
        category: item.category,
        type: 'quarantine',
        qtyChange: isReturn ? qty : -qty,
        newStock: newAvailable,
        by,
        notes: isReturn ? `Damaged Return: ${notes}` : `Marked as Damaged: ${notes}`,
        date: new Date().toISOString(),
      });
      return;
    }

    const { error } = await supabase.from('items').update({
      quantity: newAvailable,
      quarantine_quantity: newQuarantine,
      last_updated: new Date().toISOString().split('T')[0],
    }).eq('id', itemId);

    if (error) throw error;

    await addTransaction({
      itemId,
      itemName: item.name,
      category: item.category,
      type: 'quarantine',
      qtyChange: isReturn ? qty : -qty,
      newStock: newAvailable,
      by,
      notes: isReturn ? `Damaged Return: ${notes}` : `Marked as Damaged: ${notes}`,
      date: new Date().toISOString(),
    });
  }, [items, addTransaction]);

  const releaseFromQuarantine = useCallback(async (itemId: string, qty: number, notes: string, by: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');
    if (item.quarantineQuantity < qty) throw new Error('Insufficient quarantined stock');

    const newAvailable = item.quantity + qty;
    const newQuarantine = item.quarantineQuantity - qty;

    if (!isSupabaseConfigured) {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newAvailable, quarantineQuantity: newQuarantine, lastUpdated: new Date().toISOString().split('T')[0] } : i));
      await addTransaction({
        itemId,
        itemName: item.name,
        category: item.category,
        type: 'release',
        qtyChange: qty,
        newStock: newAvailable,
        by,
        notes: `Repaired/Released from Damaged: ${notes}`,
        date: new Date().toISOString(),
      });
      return;
    }

    const { error } = await supabase.from('items').update({
      quantity: newAvailable,
      quarantine_quantity: newQuarantine,
      last_updated: new Date().toISOString().split('T')[0],
    }).eq('id', itemId);

    if (error) throw error;

    await addTransaction({
      itemId,
      itemName: item.name,
      category: item.category,
      type: 'release',
      qtyChange: qty,
      newStock: newAvailable,
      by,
      notes: `Repaired/Released from Damaged: ${notes}`,
      date: new Date().toISOString(),
    });
  }, [items, addTransaction]);

  const disposeFromQuarantine = useCallback(async (itemId: string, qty: number, notes: string, by: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');
    if (item.quarantineQuantity < qty) throw new Error('Insufficient quarantined stock');

    const newQuarantine = item.quarantineQuantity - qty;

    if (!isSupabaseConfigured) {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, quarantineQuantity: newQuarantine, lastUpdated: new Date().toISOString().split('T')[0] } : i));
      await addTransaction({
        itemId,
        itemName: item.name,
        category: item.category,
        type: 'use',
        qtyChange: -qty,
        newStock: item.quantity,
        by,
        notes: `Disposed Damaged Item: ${notes}`,
        date: new Date().toISOString(),
      });
      return;
    }

    const { error } = await supabase.from('items').update({
      quarantine_quantity: newQuarantine,
      last_updated: new Date().toISOString().split('T')[0],
    }).eq('id', itemId);

    if (error) throw error;

    await addTransaction({
      itemId,
      itemName: item.name,
      category: item.category,
      type: 'use',
      qtyChange: -qty,
      newStock: item.quantity,
      by,
      notes: `Disposed Damaged Item: ${notes}`,
      date: new Date().toISOString(),
    });
  }, [items, addTransaction]);

  const deleteItem = useCallback(async (id: string) => {
    if (!isSupabaseConfigured) {
      setItems(prev => prev.filter(i => i.id !== id));
      return;
    }
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) {
      console.error('Delete item error:', error);
      throw error;
    }
  }, []);

  // Wipe all items and transactions – used before a fresh import
  const wipeAllItems = useCallback(async () => {
    // Always clear localStorage keys completely
    setItems([]);
    setTransactions([]);
    localStorage.setItem('sucat_items', JSON.stringify([]));
    localStorage.setItem('sucat_transactions', JSON.stringify([]));
    localStorage.removeItem('inventory_items');

    if (!isSupabaseConfigured) {
      return;
    }
    // Delete transactions FIRST (they reference items via FK — reversing order causes constraint errors)
    const { error: txErr } = await supabase
      .from('transactions')
      .delete()
      .not('id', 'is', null);
    if (txErr) {
      console.error('Wipe transactions error:', txErr);
      throw new Error('Could not clear transactions: ' + txErr.message);
    }
    // Then delete items
    const { error: itemsErr } = await supabase
      .from('items')
      .delete()
      .not('id', 'is', null);
    if (itemsErr) {
      console.error('Wipe items error:', itemsErr);
      throw new Error('Could not clear items: ' + itemsErr.message);
    }
    setItems([]);
    setTransactions([]);
  }, []);

  const updateTransaction = useCallback(async (updated: Transaction) => {
    if (!isSupabaseConfigured) {
      setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
      return;
    }
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
    if (!isSupabaseConfigured) {
      const item = items.find(i => i.id === tx.itemId);
      if (item) {
        const revertedStock = (tx.type === 'quarantine' || tx.type === 'release') ? item.quantity : item.quantity - tx.qtyChange;
        let revertedQuarantine = item.quarantineQuantity || 0;
        if (tx.type === 'quarantine') revertedQuarantine -= Math.abs(tx.qtyChange);
        if (tx.type === 'release') revertedQuarantine += Math.abs(tx.qtyChange);
        setItems(prev => prev.map(i => i.id === tx.itemId ? { ...i, quantity: revertedStock, quarantineQuantity: revertedQuarantine } : i));
      }
      setTransactions(prev => prev.filter(t => t.id !== tx.id));
      return;
    }

    // 1. Fetch current stock to revert accurately (if item still exists)
    let item = null;
    if (tx.itemId) {
      try {
        const { data } = await supabase.from('items').select('quantity, quarantine_quantity').eq('id', tx.itemId).maybeSingle();
        item = data;
      } catch (e) {
        // Ignore fetch errors (e.g. invalid UUIDs for deleted items)
      }
    }

    // Only attempt to revert stock if the item hasn't been deleted from inventory
    if (item) {
      const revertedStock = (tx.type === 'quarantine' || tx.type === 'release') ? item.quantity : item.quantity - tx.qtyChange;
      let revertedQuarantine = item.quarantine_quantity || 0;
      if (tx.type === 'quarantine') revertedQuarantine -= Math.abs(tx.qtyChange);
      if (tx.type === 'release') revertedQuarantine += Math.abs(tx.qtyChange);

      const { error: updateErr } = await supabase
        .from('items')
        .update({
          quantity: revertedStock,
          quarantine_quantity: revertedQuarantine,
          last_updated: new Date().toISOString().split('T')[0],
        })
        .eq('id', tx.itemId);

      if (updateErr) {
        console.error('Revert stock error:', updateErr);
        throw updateErr;
      }
    }

    // 2. Delete transaction record
    const { error: txErr } = await supabase.from('transactions').delete().eq('id', tx.id);

    if (txErr) {
      console.error('Delete transaction error:', txErr);
      throw txErr;
    }

    // 3. Instantly remove from local UI to feel responsive
    setTransactions(prev => prev.filter(t => t.id !== tx.id));
  }, [items]);

  return (
    <InventoryContext.Provider value={{
      items, transactions, currentPage, searchQuery, loading,
      setCurrentPage, setSearchQuery,
      addItem, updateItem, deleteItem, addTransaction, updateTransaction, voidTransaction, refreshData, showToast, toasts,
      moveItemToQuarantine, releaseFromQuarantine, disposeFromQuarantine, wipeAllItems,
    }}>
      {children}
    </InventoryContext.Provider>
  );
}
