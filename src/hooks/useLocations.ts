import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Location {
  id: string;
  name: string;
}

const defaultLocations: Location[] = [
  { id: 'loc-1', name: 'Storage Room A' },
  { id: 'loc-2', name: 'Storage Room B' },
  { id: 'loc-3', name: 'Main Office' },
  { id: 'loc-4', name: 'Clinic' },
];

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>(defaultLocations);
  const [loading, setLoading] = useState(false);

  const fetchLocations = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLocations(defaultLocations);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (!error && data) setLocations(data as Location[]);
    if (error) console.error('Locations fetch error:', error);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLocations();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel(`locations-realtime-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        fetchLocations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLocations]);

  const addLocation = useCallback(async (name: string) => {
    const { error } = await supabase.from('locations').insert({ name });
    if (error) throw error;
  }, []);

  const updateLocation = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('locations').update({ name }).eq('id', id);
    if (error) throw error;
  }, []);

  const deleteLocation = useCallback(async (id: string) => {
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) throw error;
  }, []);

  return { locations, loading, addLocation, updateLocation, deleteLocation };
}
