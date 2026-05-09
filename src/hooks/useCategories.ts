import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface CategoryEntry {
  id: string;
  name: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (!error && data) setCategories(data as CategoryEntry[]);
    if (error) console.error('Categories fetch error:', error);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();

    const channel = supabase
      .channel(`categories-realtime-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchCategories();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCategories]);

  const addCategory = useCallback(async (name: string) => {
    const { error } = await supabase.from('categories').insert({ name: name.toLowerCase() });
    if (error) throw error;
  }, []);

  const updateCategory = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('categories').update({ name: name.toLowerCase() }).eq('id', id);
    if (error) throw error;
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  }, []);

  return { categories, loading, addCategory, updateCategory, deleteCategory };
}
