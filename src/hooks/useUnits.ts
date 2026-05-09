import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface UnitEntry {
  id: string;
  name: string;
}

export function useUnits() {
  const [units, setUnits] = useState<UnitEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
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

    const channel = supabase
      .channel('units-realtime')
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
