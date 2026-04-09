import { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Category, InventoryItem, getStatus, ItemStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import AddEditItemModal from '../components/AddEditItemModal';
import TransactionModal from '../components/TransactionModal';
import BulkRestockModal from '../components/BulkRestockModal';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';

interface Props {
  category: Category;
  onAddItem: () => void;
}

export default function InventoryPage({ category, onAddItem }: Props) {
  const { items, deleteItem, searchQuery, showToast } = useInventory();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [transactionItem, setTransactionItem] = useState<InventoryItem | null>(null);
  const [showBulkRestock, setShowBulkRestock] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;

  const filtered = useMemo(() => {
    let list = items.filter(i => i.category === category);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      list = list.filter(i => getStatus(i) === statusFilter);
    }
    return list;
  }, [items, category, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleDelete = (item: InventoryItem) => {
    if (confirm(`Delete \