import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AppUser } from '../types';

function mapUser(row: any): AppUser {
  return {
    id: row.id,
    fullName: row.full_name || '',
    employeeId: row.employee_id || '',
    role: row.role || 'borrower',
    pin: row.pin || '',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('full_name');
    if (!error && data) setUsers(data.map(mapUser));
    if (error) console.error('Users fetch error:', error);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel(`app_users-realtime-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchUsers]);

  const addUser = useCallback(async (user: Omit<AppUser, 'id' | 'createdAt'>) => {
    const { error } = await supabase.from('app_users').insert({
      full_name: user.fullName,
      employee_id: user.employeeId,
      role: user.role,
      pin: user.pin,
    });
    if (error) throw error;
  }, []);

  const updateUser = useCallback(async (id: string, user: Partial<Omit<AppUser, 'id' | 'createdAt'>>) => {
    const updates: any = {};
    if (user.fullName) updates.full_name = user.fullName;
    if (user.employeeId) updates.employee_id = user.employeeId;
    if (user.role) updates.role = user.role;
    if (user.pin) updates.pin = user.pin;

    const { error } = await supabase.from('app_users').update(updates).eq('id', id);
    if (error) throw error;
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    const { error } = await supabase.from('app_users').delete().eq('id', id);
    if (error) throw error;
  }, []);

  return { users, loading, addUser, updateUser, deleteUser, refreshUsers: fetchUsers };
}
