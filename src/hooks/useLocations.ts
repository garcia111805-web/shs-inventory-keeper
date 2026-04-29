import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Location {
  id: string;
  name: string;
}

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = useCallback(async () => {
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

    const channel = supabase
      .channel('locations-realtime')
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
