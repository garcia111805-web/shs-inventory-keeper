export type Category = 'cleaning' | 'office' | 'clinic';
export type ItemStatus = 'in-stock' | 'low-stock' | 'out-of-stock';
export type TransactionType = 'restock' | 'borrow' | 'use';
export type PageName = 'dashboard' | 'cleaning' | 'office' | 'clinic' | 'transactions' | 'reports' | 'settings' | 'portal';
export const UNITS = ['pcs', 'boxes', 'bottles', 'reams', 'sets'] as const;

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  unit: string;
  quantity: number;
  lowStockThreshold: number;
  notes: string;
  lastUpdated: string;
  location?: string;
}

export interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  category: Category;
  type: TransactionType;
  qtyChange: number;
  newStock: number;
  by: string;
  returnDate?: string;
  notes: string;
  date: string;
}

export function getStatus(item: InventoryItem): ItemStatus {
  if (item.quantity === 0) return 'out-of-stock';
  if (item.quantity <= item.lowStockThreshold) return 'low-stock';
  return 'in-stock';
}

export function getCategoryLabel(cat: Category): string {
  if (cat === 'cleaning') return 'Cleaning Materials';
  if (cat === 'office') return 'Office Supplies';
  return 'Clinic Supplies';
}

export function getCategoryColor(cat: Category): string {
  if (cat === 'cleaning') return '#0d1b6e';
  if (cat === 'office') return '#d97706';
  return '#b91c1c';
}


