import { useState } from 'react';
import { useLocations } from '../hooks/useLocations';
import { useInventory } from '../context/InventoryContext';
import { MapPin, Plus, Pencil, Trash2, Check, X, Settings, Loader2 } from 'lucide-react';

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
    <div className="p-4 md:p-8 space-y-8 max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div
          className="rounded-2xl flex items-center justify-center"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #0d1b6e, #1a0a3e)' }}
        >
          <Settings size={24} color="#e8b400" />
        </div>
        <div>
          <h1 className="font-heading font-bold" style={{ fontSize: 24, color: 'var(--heading-color)' }}>Settings</h1>
          <p className="font-body" style={{ fontSize: 14, color: 'var(--muted-text)' }}>Manage Locations</p>
        </div>
      </div>

        <section
          className="rounded-2xl panel-card p-6 space-y-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={18} style={{ color: '#0d1b6e' }} />
            <h2 className="font-heading font-bold" style={{ fontSize: 16, color: 'var(--heading-color)' }}>Locations</h2>
            <span
              className="ml-auto font-body font-bold rounded-full px-2.5 py-0.5"
              style={{ fontSize: 12, background: 'rgba(13,27,110,0.12)', color: '#0d1b6e' }}
            >
              {locations.length}
            </span>
          </div>

          {/* Add new */}
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-body font-semibold text-white transition-opacity"
              style={{ fontSize: 13, background: '#0d1b6e', opacity: !newLocation.trim() || addingLoc ? 0.6 : 1 }}
            >
              {addingLoc ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add
            </button>
          </div>

          {/* List */}
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
    </div>
  );
}
