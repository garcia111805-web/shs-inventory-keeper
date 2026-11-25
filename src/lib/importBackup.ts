import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Pre-import backups.
 *
 * The CSV import is a FULL REPLACE: it wipes every item first, then loads the file. That has no
 * undo, so every destructive path takes a snapshot of `items` into `import_backups` first.
 * If the snapshot fails, the caller must ABORT — never wipe without a backup.
 */

export interface BackupRow {
  [key: string]: unknown;
}

export interface ImportBackup {
  id: string;
  fileName: string;
  rowCount: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export type BackupReason = 'import' | 'manual-clear' | 'pre-restore';

/** Column order for the downloadable CSV — matches what the importer expects. */
export const BACKUP_CSV_HEADERS = [
  'Name',
  'Category',
  'Unit',
  'Quantity',
  'Location',
  'Low Stock Threshold',
  'Notes',
  'Consumable',
] as const;

/** Quote a CSV cell: escape embedded quotes, wrap anything containing a comma/quote/newline. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Map raw `items` rows (snake_case, straight from Supabase) into an importer-compatible CSV.
 * Round-trip property: downloading a backup and re-importing it restores the same items.
 */
export function rowsToCsv(rows: BackupRow[]): string {
  const lines = [BACKUP_CSV_HEADERS.join(',')];
  for (const row of rows) {
    lines.push(
      [
        csvCell(row.name),
        csvCell(row.category),
        csvCell(row.unit ?? 'pcs'),
        csvCell(row.quantity ?? 0),
        csvCell(row.location ?? ''),
        csvCell(row.low_stock_threshold ?? 5),
        csvCell(row.notes ?? ''),
        csvCell(row.is_consumable === false ? 'No' : 'Yes'),
      ].join(',')
    );
  }
  return lines.join('\r\n');
}

export function summarizeBackup(rows: BackupRow[]): { rowCount: number; totalQuantity: number } {
  let totalQuantity = 0;
  for (const row of rows) {
    const q = Number(row.quantity);
    if (Number.isFinite(q)) totalQuantity += q;
  }
  return { rowCount: rows.length, totalQuantity };
}

/** Filename for a downloaded backup, e.g. `inventory-backup-2026-11-26-0530.csv`. */
export function backupFileName(createdAt: string, fileName: string): string {
  const d = new Date(createdAt);
  const safeDate = isNaN(d.getTime())
    ? 'unknown-date'
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const base = (fileName || 'inventory').replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 40);
  return `inventory-backup-${safeDate}-${base || 'manual'}.csv`;
}

/**
 * Snapshot the current `items` table into `import_backups`.
 * Throws if the snapshot could not be written — callers must not wipe in that case.
 * Returns null (and does nothing) when Supabase isn't configured (localStorage-only mode).
 */
export async function createImportBackup(opts: {
  fileName: string;
  reason: BackupReason;
  createdBy?: string;
}): Promise<ImportBackup | null> {
  if (!isSupabaseConfigured) return null;

  const { data: rows, error: readErr } = await supabase.from('items').select('*');
  if (readErr) {
    throw new Error(`Could not read current inventory to back it up: ${readErr.message}`);
  }

  const payload = (rows ?? []) as BackupRow[];
  const now = new Date().toISOString();

  const { data: inserted, error: insertErr } = await supabase
    .from('import_backups')
    .insert({
      file_name: opts.fileName || 'Manual backup',
      row_count: payload.length,
      payload,
      reason: opts.reason,
      created_by: opts.createdBy || 'System',
      created_at: now,
    })
    .select('id, file_name, row_count, reason, created_by, created_at')
    .single();

  if (insertErr) {
    throw new Error(`Could not save the backup — import cancelled: ${insertErr.message}`);
  }

  return {
    id: inserted.id,
    fileName: inserted.file_name,
    rowCount: inserted.row_count,
    reason: inserted.reason,
    createdBy: inserted.created_by,
    createdAt: inserted.created_at,
  };
}

/** Shape of a row from the `import_backups` list query (snake_case, as stored). */
interface BackupListRow {
  id: string;
  file_name: string;
  row_count: number;
  reason: string;
  created_by: string;
  created_at: string;
}

export async function listImportBackups(limit = 20): Promise<ImportBackup[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('import_backups')
    .select('id, file_name, row_count, reason, created_by, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as BackupListRow[]).map((r) => ({
    id: r.id,
    fileName: r.file_name,
    rowCount: r.row_count,
    reason: r.reason,
    createdBy: r.created_by,
    createdAt: r.created_at,
  }));
}

export async function getBackupPayload(id: string): Promise<BackupRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('import_backups')
    .select('payload')
    .eq('id', id)
    .single();
  if (error) throw new Error(`Could not load backup: ${error.message}`);
  return (data?.payload ?? []) as BackupRow[];
}

/**
 * Restore a backup: snapshot the CURRENT state first (so a restore is itself reversible),
 * then wipe transactions + items, then re-insert the snapshot rows verbatim.
 */
export async function restoreImportBackup(id: string, createdBy = 'System'): Promise<number> {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

  const rows = await getBackupPayload(id);
  if (!rows.length) throw new Error('That backup is empty — nothing to restore.');

  // Guard: keep a snapshot of what we're about to destroy.
  await createImportBackup({ fileName: 'Pre-restore safety net', reason: 'pre-restore', createdBy });

  // Same order as wipeAllItems: transactions first (FK), then items.
  const { error: txErr } = await supabase.from('transactions').delete().not('id', 'is', null);
  if (txErr) throw new Error(`Could not clear transactions: ${txErr.message}`);

  const { error: itemErr } = await supabase.from('items').delete().not('id', 'is', null);
  if (itemErr) throw new Error(`Could not clear items: ${itemErr.message}`);

  const { error: insertErr } = await supabase.from('items').insert(rows);
  if (insertErr) throw new Error(`Could not restore items: ${insertErr.message}`);

  return rows.length;
}

export function downloadCsvFile(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
