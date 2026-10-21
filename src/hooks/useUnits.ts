import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface UnitEntry {
  id: string;
  name: string;
}

const defaultUnits: UnitEntry[] = [
  { id: 'u-1', name: 'pcs' },
  { id: 'u-2', name: 'bottle' },
  { id: 'u-3', name: 'box' },
  { id: 'u-4', name: 'pack' },
  { id: 'u-5', name: 'ream' },
  { id: 'u-6', name: 'set' },
  { id: 'u-7', name: 'pair' },
];

export function useUnits() {
  const [units, setUnits] = useState<UnitEntry[]>(defaultUnits);
  const [loading, setLoading] = useState(false);

  const fetchUnits = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setUnits(defaultUnits);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .order('name');
    if (!error && data) setUnits(data as UnitEntry[]);
    if (error) console.error('Units fetch error:', error);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUnits();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel(`units-realtime-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, () => {
        fetchUnits();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchUnits]);

  const addUnit = useCallback(async (name: string) => {
    const { error } = await supabase.from('units').insert({ name: name.toLowerCase() });
    if (error) throw error;
  }, []);

  const updateUnit = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('units').update({ name: name.toLowerCase() }).eq('id', id);
    if (error) throw error;
  }, []);

  const deleteUnit = useCallback(async (id: string) => {
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) throw error;
  }, []);

  return { units, loading, addUnit, updateUnit, deleteUnit };
}
