import { describe, it, expect } from 'vitest';
import {
  csvCell,
  rowsToCsv,
  summarizeBackup,
  backupFileName,
  BACKUP_CSV_HEADERS,
} from '../lib/importBackup';

describe('csvCell', () => {
  it('leaves plain values alone', () => {
    expect(csvCell('Bond Paper')).toBe('Bond Paper');
    expect(csvCell(42)).toBe('42');
  });

  it('returns empty string for null/undefined', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('quotes commas, quotes and newlines (RFC 4180)', () => {
    expect(csvCell('Paper, A4')).toBe('"Paper, A4"');
    expect(csvCell('12" ruler')).toBe('"12"" ruler"');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('rowsToCsv', () => {
  it('writes the header even with no rows', () => {
    expect(rowsToCsv([])).toBe(BACKUP_CSV_HEADERS.join(','));
  });

  it('maps snake_case DB rows into importer column order', () => {
    const csv = rowsToCsv([
      {
        name: 'BOND PAPER A4',
        category: 'office_supplies',
        unit: 'ream',
        quantity: 12,
        location: 'Stock Room',
        low_stock_threshold: 5,
        notes: 'Sealed',
        is_consumable: true,
      },
    ]);
    const [header, row] = csv.split('\r\n');
    expect(header).toBe(BACKUP_CSV_HEADERS.join(','));
    expect(row).toBe('BOND PAPER A4,office_supplies,ream,12,Stock Room,5,Sealed,Yes');
  });

  it('falls back to sane defaults for missing fields', () => {
    const [, row] = rowsToCsv([{ name: 'CHALK' }]).split('\r\n');
    expect(row).toBe('CHALK,,pcs,0,,5,,Yes');
  });

  it('round-trips a value containing a comma without breaking columns', () => {
    const [, row] = rowsToCsv([{ name: 'TAPE, CLEAR', quantity: 3 }]).split('\r\n');
    expect(row.startsWith('"TAPE, CLEAR",')).toBe(true);
  });

  it('renders non-consumable items as No', () => {
    const [, row] = rowsToCsv([{ name: 'LADDER', is_consumable: false }]).split('\r\n');
    expect(row.endsWith('No')).toBe(true);
  });
});

describe('summarizeBackup', () => {
  it('counts rows and totals quantity', () => {
    expect(summarizeBackup([{ quantity: 5 }, { quantity: 10 }, { quantity: '3' }]))
      .toEqual({ rowCount: 3, totalQuantity: 18 });
  });

  it('ignores non-numeric quantities', () => {
    expect(summarizeBackup([{ quantity: 4 }, { quantity: 'n/a' }, {}]))
      .toEqual({ rowCount: 3, totalQuantity: 4 });
  });
});

describe('backupFileName', () => {
  it('builds a dated, extension-free filename', () => {
    expect(backupFileName('2026-11-26T05:30:00.000Z', 'inventory.csv'))
      .toMatch(/^inventory-backup-\d{4}-\d{2}-\d{2}-inventory\.csv$/);
  });

  it('sanitizes spaces and punctuation from the source name', () => {
    expect(backupFileName('2026-01-02T00:00:00.000Z', 'My File (v2).xlsx'))
      .toMatch(/^inventory-backup-2026-01-02-My-File-v2-\.csv$/);
  });

  it('survives an invalid date', () => {
    expect(backupFileName('not-a-date', 'x.csv')).toContain('unknown-date');
  });
});
