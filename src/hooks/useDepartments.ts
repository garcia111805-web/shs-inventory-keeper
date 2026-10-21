import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Department {
  id: string;
  name: string;
}

const defaultDepartments: Department[] = [
  { id: 'dept-1', name: 'Cleaning' },
  { id: 'dept-2', name: 'Office' },
  { id: 'dept-3', name: 'Clinic' },
];

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>(defaultDepartments);
  const [loading, setLoading] = useState(false);

  const fetchDepartments = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setDepartments(defaultDepartments);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');
    if (!error && data) setDepartments(data as Department[]);
    if (error) console.error('Departments fetch error:', error);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDepartments();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('departments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => {
        fetchDepartments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDepartments]);

  const addDepartment = useCallback(async (name: string) => {
    const { error } = await supabase.from('departments').insert({ name });
    if (error) throw error;
  }, []);

  const updateDepartment = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('departments').update({ name }).eq('id', id);
    if (error) throw error;
  }, []);

  const deleteDepartment = useCallback(async (id: string) => {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) throw error;
  }, []);

  return { departments, loading, addDepartment, updateDepartment, deleteDepartment };
}
