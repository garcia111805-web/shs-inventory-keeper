import { useState } from 'react';
import { useLocations } from '../hooks/useLocations';
import { useUsers } from '../hooks/useUsers';
import { useInventory } from '../context/InventoryContext';
import { MapPin, Plus, Pencil, Trash2, Check, X, Settings, Loader2, Users, UserPlus, Key, Fingerprint, ShieldCheck } from 'lucide-react';
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
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
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
            className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
            style={{ width: 28, height: 28, background: '#15803d' }}
          >
            {busy ? <Loader2 size={13} color="white" className="animate-spin" /> : <Check size={13} color="white" />}
          </button>
          <button
            onClick={() => { setEditing(false); setValue(name); }}
            className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
            style={{ width: 28, height: 28, background: 'var(--card-border)' }}
          >
            <X size={13} style={{ color: 'var(--fg-color)' }} />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 font-body font-medium" style={{ fontSize: 14, color: 'var(--fg-color)' }}>{name}</span>
          <button
            onClick={() => setEditing(true)}
            disabled={busy}
            className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
            style={{ width: 28, height: 28, background: '#0d1b6e' }}
          >
            <Pencil size={13} color="white" />
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
            style={{ width: 28, height: 28, background: '#b71c1c' }}
          >
            {busy ? <Loader2 size={13} color="white" className="animate-spin" /> : <Trash2 size={13} color="white" />}
          </button>
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

  return (
    <div className="p-4 md:p-8 space-y-10 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div
          className="rounded-2xl flex items-center justify-center shadow-lg"
          style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #0d1b6e, #1a0a3e)' }}
        >
          <Settings size={28} color="#e8b400" />
        </div>
        <div>
          <h1 className="font-heading font-bold" style={{ fontSize: 28, color: 'var(--heading-color)' }}>Settings</h1>
          <p className="font-body" style={{ fontSize: 14, color: 'var(--muted-text)' }}>System configuration and user management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Locations Section */}
        <section className="rounded-2xl panel-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={20} style={{ color: '#0d1b6e' }} />
            <h2 className="font-heading font-bold" style={{ fontSize: 18, color: 'var(--heading-color)' }}>Locations</h2>
            <span
              className="ml-auto font-body font-bold rounded-full px-2.5 py-0.5 text-xs"
              style={{ background: 'rgba(13,27,110,0.12)', color: '#0d1b6e' }}
            >
              {locations.length}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              className="modal-input flex-1"
              placeholder="New location name…"
              value={newLocation}
              onChange={e => setNewLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
            />
            <button
              onClick={handleAddLocation}
              disabled={!newLocation.trim() || addingLoc}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-body font-semibold text-white transition-all active:scale-95"
              style={{ fontSize: 13, background: '#0d1b6e', opacity: !newLocation.trim() || addingLoc ? 0.6 : 1 }}
            >
              {addingLoc ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {locLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--muted-text)' }} />
              </div>
            ) : locations.length === 0 ? (
              <p className="text-center py-6 font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>
                No locations yet. Add one above.
              </p>
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
    if (!fullName || !pin) {
      showToast('Please fill in Name and PIN', 'error');
      return;
    }
    if (pin.length !== 4) {
      showToast('PIN must be exactly 4 digits', 'error');
      return;
    }

    setIsAdding(true);
    try {
      // Use timestamp if employeeId is empty to keep it unique in DB if needed
      const finalId = employeeId || `USER-${Date.now()}`;
      await addUser({ fullName, employeeId: finalId, pin, role });
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
    <section className="rounded-2xl panel-card p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Users size={20} style={{ color: '#7c3aed' }} />
        <h2 className="font-heading font-bold" style={{ fontSize: 18, color: 'var(--heading-color)' }}>User Accounts</h2>
        <span
          className="ml-auto font-body font-bold rounded-full px-2.5 py-0.5 text-xs"
          style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}
        >
          {users.length}
        </span>
      </div>

      {/* Add User Form */}
      <div className="space-y-3 p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)', border: '1px dashed var(--card-border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <UserPlus size={16} style={{ color: '#7c3aed' }} />
          <span className="font-heading font-bold text-sm" style={{ color: 'var(--heading-color)' }}>Register New Account</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider opacity-50 ml-1">Full Name</label>
            <input
              className="modal-input w-full"
              placeholder="e.g. Juan Dela Cruz"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider opacity-50 ml-1">Note / ID (Optional)</label>
            <input
              className="modal-input w-full"
              placeholder="Any reference"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider opacity-50 ml-1">Account Role</label>
            <select
              className="modal-input w-full"
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
            >
              <option value="borrower">Staff / Borrower</option>
              <option value="admin">Admin / Property Office</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider opacity-50 ml-1">4-Digit PIN</label>
            <input
              className="modal-input w-full"
              type="password"
              maxLength={4}
              placeholder="● ● ● ●"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        <button
          onClick={handleAddUser}
          disabled={isAdding}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-body font-bold text-white transition-all active:scale-[0.98]"
          style={{ 
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            boxShadow: '0 4px 12px rgba(124,58,237,0.2)'
          }}
        >
          {isAdding ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          Create Account
        </button>
      </div>

      {/* Users List */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--muted-text)' }} />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center py-6 font-body" style={{ fontSize: 13, color: 'var(--muted-text)' }}>
            No accounts registered yet.
          </p>
        ) : users.map(user => (
          <div
            key={user.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)' }}
          >
            <div 
              className="rounded-lg flex items-center justify-center" 
              style={{ 
                width: 36, 
                height: 36, 
                background: user.role === 'admin' ? 'rgba(232,180,0,0.1)' : 'rgba(124,58,237,0.1)',
                color: user.role === 'admin' ? '#e8b400' : '#7c3aed'
              }}
            >
              {user.role === 'admin' ? <ShieldCheck size={18} /> : <Users size={18} />}
            </div>
            <div className="flex-1">
              <div className="font-body font-bold" style={{ fontSize: 14, color: 'var(--fg-color)' }}>{user.fullName}</div>
              <div className="flex items-center gap-2 font-body" style={{ fontSize: 11, color: 'var(--muted-text)' }}>
                <Fingerprint size={10} /> {user.employeeId}
                <span className="opacity-30">•</span>
                <Key size={10} /> PIN: {user.pin.replace(/./g, '*')}
                <span className="ml-1 opacity-60 uppercase font-bold" style={{ color: user.role === 'admin' ? '#e8b400' : '#7c3aed' }}>
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleDeleteUser(user.id, user.fullName)}
              className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
              style={{ width: 32, height: 32, background: '#fee2e2' }}
            >
              <Trash2 size={14} color="#dc2626" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
