import { useState } from 'react';
import { useLocations } from '../hooks/useLocations';
import { useUsers } from '../hooks/useUsers';
import { useCategories } from '../hooks/useCategories';
import { useUnits } from '../hooks/useUnits';
import { useInventory } from '../context/InventoryContext';
import { MapPin, Plus, Pencil, Trash2, Check, X, Settings, Loader2, Users, UserPlus, Key, Fingerprint, ShieldCheck, ChevronDown, LayoutGrid, Ruler, CornerDownLeft } from 'lucide-react';
import { UserRole } from '../types';

// ─── Reusable Row Editor ─────────────────────────────────────────────────────
interface EntryRowProps {
  id: string;
  name: string;
  onEdit: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function EntryRow({ id, name, onEdit, onDelete }: EntryRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!value.trim() || value.trim() === name) { setEditing(false); setValue(name); return; }
    setBusy(true);
    try { await onEdit(id, value.trim()); setEditing(false); }
    catch (e) { /* parent shows toast */ }
    finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${name}"?`)) return;
    setBusy(true);
    try { await onDelete(id); }
    catch (e) { /* parent shows toast */ }
    finally { setBusy(false); }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-white/5"
      style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
    >
      {editing ? (
        <>
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none font-body"
            style={{ fontSize: 14, color: 'var(--fg-color)' }}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setValue(name); } }}
          />
          <button
            onClick={handleSave}
            disabled={busy}
            className="flex items-center justify-center rounded-lg transition-all hover:scale-105"
            style={{ width: 28, height: 28, background: '#15803d' }}
          >
            {busy ? <Loader2 size={13} color="white" className="animate-spin" /> : <Check size={13} color="white" />}
          </button>
          <button
            onClick={() => { setEditing(false); setValue(name); }}
            className="flex items-center justify-center rounded-lg transition-all hover:scale-105"
            style={{ width: 28, height: 28, background: 'var(--card-border)' }}
          >
            <X size={13} style={{ color: 'var(--fg-color)' }} />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 font-body font-bold text-sm" style={{ color: 'var(--fg-color)' }}>{name}</span>
          <button
            onClick={() => setEditing(true)}
            disabled={busy}
            className="flex items-center justify-center rounded-lg transition-all hover:scale-105 shadow-sm"
            style={{ width: 28, height: 28, background: 'var(--accent-color)' }}
          >
            <Pencil size={13} color="white" />
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="flex items-center justify-center rounded-lg transition-all hover:scale-105 shadow-sm"
            style={{ width: 28, height: 28, background: '#b71c1c' }}
          >
            {busy ? <Loader2 size={13} color="white" className="animate-spin" /> : <Trash2 size={13} color="white" />}
          </button>
        </>
      )}
    </div>
  );
}

function ModernSelect({ value, onChange, options, label }: { value: string, onChange: (v: string) => void, options: { value: string, label: string }[], label: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentLabel = options.find(o => o.value === value)?.label || label;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl font-body font-semibold transition-all"
        style={{
          fontSize: 14,
          background: 'var(--input-bg)',
          border: '1px solid var(--card-border)',
          color: 'var(--fg-color)',
          boxShadow: isOpen ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none'
        }}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ background: 'var(--dropdown-bg)', border: '1px solid var(--card-border)', minWidth: 180 }}>
            <div className="max-h-60 overflow-y-auto py-1">
              {options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className="w-full text-left px-4 py-3 font-body transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  style={{
                    fontSize: 14,
                    color: value === opt.value ? 'var(--accent-color)' : 'var(--fg-color)',
                    background: value === opt.value ? 'var(--accent-glow)' : 'transparent',
                    fontWeight: value === opt.value ? 700 : 500
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { showToast } = useInventory();
  const { locations, loading: locLoading, addLocation, updateLocation, deleteLocation } = useLocations();
  const [newLocation, setNewLocation] = useState('');
  const [addingLoc, setAddingLoc] = useState(false);

  const { categories, loading: catLoading, addCategory, updateCategory, deleteCategory } = useCategories();
  const [newCategory, setNewCategory] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  const { units, loading: unitLoading, addUnit, updateUnit, deleteUnit } = useUnits();
  const [newUnit, setNewUnit] = useState('');
  const [addingUnit, setAddingUnit] = useState(false);

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return;
    setAddingLoc(true);
    try {
      await addLocation(newLocation.trim());
      setNewLocation('');
      showToast(`Location "${newLocation.trim()}" added`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to add location', 'error');
    } finally {
      setAddingLoc(false);
    }
  };

  const handleEditLocation = async (id: string, name: string) => {
    try {
      await updateLocation(id, name);
      showToast('Location updated', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update location', 'error');
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      await deleteLocation(id);
      showToast('Location deleted', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete location', 'error');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setAddingCat(true);
    try {
      await addCategory(newCategory.trim());
      setNewCategory('');
      showToast(`Category "${newCategory.trim()}" added`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to add category', 'error');
    } finally {
      setAddingCat(false);
    }
  };

  const handleAddUnit = async () => {
    if (!newUnit.trim()) return;
    setAddingUnit(true);
    try {
      await addUnit(newUnit.trim());
      setNewUnit('');
      showToast(`Unit "${newUnit.trim()}" added`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to add unit', 'error');
    } finally {
      setAddingUnit(false);
    }
  };

  return (
    <div className="p-8 md:p-12 space-y-12 max-w-6xl mx-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px)' }}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 className="font-heading font-black text-4xl tracking-tight" style={{ color: 'var(--heading-color)' }}>System Config</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Categories Section */}
        <section className="panel-card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <LayoutGrid size={20} />
              </div>
              <h2 className="font-heading font-bold text-xl" style={{ color: 'var(--heading-color)' }}>Categories</h2>
            </div>
            <span className="font-body font-black text-sm bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full">
              {categories.length}
            </span>
          </div>

          <div className="flex gap-3">
            <input
              className="modal-input flex-1"
              placeholder="Enter category name…"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategory.trim() || addingCat}
              className="modal-btn-confirm flex items-center gap-2"
              style={{ padding: '0.75rem 1.5rem' }}
            >
              {addingCat ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {catLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="font-body text-sm text-slate-400">No categories defined yet</p>
              </div>
            ) : categories.map(cat => (
              <EntryRow
                key={cat.id}
                id={cat.id}
                name={cat.name}
                onEdit={updateCategory}
                onDelete={deleteCategory}
              />
            ))}
          </div>
        </section>

        {/* Units Section */}
        <section className="panel-card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Ruler size={20} />
              </div>
              <h2 className="font-heading font-bold text-xl" style={{ color: 'var(--heading-color)' }}>Measurement Units</h2>
            </div>
            <span className="font-body font-black text-sm bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full">
              {units.length}
            </span>
          </div>

          <div className="flex gap-3">
            <input
              className="modal-input flex-1"
              placeholder="e.g. pieces, kg, boxes…"
              value={newUnit}
              onChange={e => setNewUnit(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddUnit()}
            />
            <button
              onClick={handleAddUnit}
              disabled={!newUnit.trim() || addingUnit}
              className="modal-btn-confirm flex items-center gap-2"
              style={{ padding: '0.75rem 1.5rem', background: '#7c3aed', boxShadow: '0 4px 12px rgba(124,58,237,0.2)' }}
            >
              {addingUnit ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {unitLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={32} className="animate-spin text-purple-500" />
              </div>
            ) : units.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="font-body text-sm text-slate-400">No measurement units defined</p>
              </div>
            ) : units.map(u => (
              <EntryRow
                key={u.id}
                id={u.id}
                name={u.name}
                onEdit={updateUnit}
                onDelete={deleteUnit}
              />
            ))}
          </div>
        </section>

        {/* Locations Section */}
        <section className="panel-card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <MapPin size={20} />
              </div>
              <h2 className="font-heading font-bold text-xl" style={{ color: 'var(--heading-color)' }}>Storage Locations</h2>
            </div>
            <span className="font-body font-black text-sm bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full">
              {locations.length}
            </span>
          </div>

          <div className="flex gap-3">
            <input
              className="modal-input flex-1"
              placeholder="e.g. Cabinet A, Room 101…"
              value={newLocation}
              onChange={e => setNewLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
            />
            <button
              onClick={handleAddLocation}
              disabled={!newLocation.trim() || addingLoc}
              className="modal-btn-confirm flex items-center gap-2"
              style={{ padding: '0.75rem 1.5rem', background: '#10b981', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
            >
              {addingLoc ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {locLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={32} className="animate-spin text-emerald-500" />
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="font-body text-sm text-slate-400">No locations added yet</p>
              </div>
            ) : locations.map(loc => (
              <EntryRow
                key={loc.id}
                id={loc.id}
                name={loc.name}
                onEdit={handleEditLocation}
                onDelete={handleDeleteLocation}
              />
            ))}
          </div>
        </section>

        {/* User Management Section */}
        <UserManagementSection />
      </div>
    </div>
  );
}

function UserManagementSection() {
  const { showToast } = useInventory();
  const { users, loading, addUser, deleteUser } = useUsers();

  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<UserRole>('borrower');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddUser = async () => {
    if (!fullName) {
      showToast('Please fill in the Name', 'error');
      return;
    }

    setIsAdding(true);
    try {
      const finalId = employeeId || `USER-${Date.now()}`;
      const finalPin = role === 'admin' ? pin : '0000';

      if (role === 'admin' && (!pin || pin.length !== 4)) {
        showToast('Admins must have a 4-digit PIN', 'error');
        setIsAdding(false);
        return;
      }

      await addUser({ fullName, employeeId: finalId, pin: finalPin, role });
      setFullName('');
      setEmployeeId('');
      setPin('');
      setRole('borrower');
      showToast(`User ${fullName} added successfully`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to add user', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete user "${name}"?`)) return;
    try {
      await deleteUser(id);
      showToast(`User ${name} deleted`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete user', 'error');
    }
  };

  return (
    <section className="panel-card p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Users size={20} />
          </div>
          <h2 className="font-heading font-bold text-xl" style={{ color: 'var(--heading-color)' }}>Access Control</h2>
        </div>
        <span className="font-body font-black text-sm bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-full">
          {users.length}
        </span>
      </div>

      {/* Add User Form */}
      <div className="space-y-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <UserPlus size={18} className="text-rose-500" />
          <span className="font-heading font-black text-sm uppercase tracking-wider" style={{ color: 'var(--heading-color)' }}>New Account</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Display Name</label>
            <input
              className="modal-input w-full"
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reference ID</label>
            <input
              className="modal-input w-full"
              placeholder="Employee ID / Note"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Access Role</label>
            <ModernSelect
              label="Select Role"
              value={role}
              onChange={(v) => setRole(v as UserRole)}
              options={[
                { value: 'borrower', label: 'Staff Member' },
                { value: 'admin', label: 'System Admin' },
              ]}
            />
          </div>
          {role === 'admin' && (
            <div className="space-y-1.5 animate-in slide-in-from-right-4 duration-300">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Security PIN (4-Digits)</label>
              <input
                className="modal-input w-full font-black tracking-[0.5em]"
                type="password"
                maxLength={4}
                placeholder="0000"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          )}
        </div>

        <button
          onClick={handleAddUser}
          disabled={isAdding}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-body font-black text-white transition-all active:scale-[0.98] shadow-lg shadow-rose-500/20"
          style={{
            background: 'linear-gradient(135deg, #f43f5e, #e11d48)'
          }}
        >
          {isAdding ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
          <span>Create Account</span>
        </button>
      </div>

      {/* Users List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={32} className="animate-spin text-rose-500" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center py-12 text-slate-400 font-body text-sm">No accounts found</p>
        ) : users.map(user => (
          <div
            key={user.id}
            className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-white/5 hover:border-rose-300 dark:hover:border-rose-900/50 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${user.role === 'admin' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
            >
              {user.role === 'admin' ? <ShieldCheck size={22} /> : <Users size={22} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-body font-black text-sm truncate" style={{ color: 'var(--heading-color)' }}>{user.fullName}</div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${user.role === 'admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                  {user.role}
                </span>
                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                  <Fingerprint size={10} /> {user.employeeId.length > 10 ? user.employeeId.slice(0, 10) + '...' : user.employeeId}
                </span>
                {user.role === 'admin' && (
                  <span className="text-[10px] font-black tracking-[0.2em] px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-2 border border-amber-500/20 shadow-sm">
                    <Key size={10} /> PIN: {user.pin}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDeleteUser(user.id, user.fullName)}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 dark:bg-red-500/10 dark:hover:bg-red-600 shadow-sm"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
