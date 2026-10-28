// Hook to persist simple import settings (fallback category) using localStorage
// In a real app this would be stored in Supabase or a settings table.
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'importSettings';

type ImportSettings = {
  fallbackCategory: string;
};

export function useImportSettings() {
  const [settings, setSettings] = useState<ImportSettings>({ fallbackCategory: 'office' });

  // Load from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ImportSettings;
        setSettings(parsed);
      } catch (_) {}
    }
  }, []);

  const update = (newSettings: Partial<ImportSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return { settings, update };
}
