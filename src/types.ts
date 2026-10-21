export type Category = string;
export type ItemStatus = 'in-stock' | 'low-stock' | 'out-of-stock';
export type TransactionType = 'restock' | 'borrow' | 'use' | 'return' | 'quarantine' | 'release';
export type UserRole = 'admin' | 'staff' | 'borrower';


export type PageName = string;
export interface AppUser {
  id: string;
  fullName: string;
  employeeId: string;
  role: UserRole;
  pin: string;
  createdAt: string;
}

export const DEFAULT_UNITS = ['pcs', 'boxes', 'bottles', 'reams', 'sets'] as const;


export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  unit: string;
  quantity: number;
  quarantineQuantity: number;
  lowStockThreshold: number;
  notes: string;
  lastUpdated: string;
  location?: string;
  isConsumable: boolean;
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

export function getCategoryLabel(cat: string): string {
  if (!cat) return 'Uncategorized';
  if (cat.toLowerCase() === 'cleaning') return 'Cleaning Materials';
  if (cat.toLowerCase() === 'office') return 'Office Supplies';
  if (cat.toLowerCase() === 'clinic') return 'Clinic Supplies';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export function getCategoryColor(cat: string): string {
  const c = cat.toLowerCase();
  if (c === 'cleaning') return '#0d1b6e';
  if (c === 'office') return '#d97706';
  if (c === 'clinic') return '#b91c1c';
  
  // Hash function for random but consistent colors for new categories
  let hash = 0;
  for (let i = 0; i < c.length; i++) {
    hash = c.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 70%, 45%)`;
}


