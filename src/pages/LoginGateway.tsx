import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, ChevronRight, CornerDownLeft, Loader2, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { AppUser } from '../types';

export default function LoginGateway() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'select' | 'pin'>('select');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [shake, setShake] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .order('full_name');

      if (!error && data) {
        setUsers(data.map(d => ({
          id: d.id,
          fullName: d.full_name,
          employeeId: d.employee_id,
          role: d.role,
          pin: d.pin,
          createdAt: d.created_at
        })));
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleUserSelect = (user: AppUser) => {
    if (user.role === 'admin') {
      setSelectedUser(user);
      setMode('pin');
      setPin('');
      setError('');
    } else {
      // Fast login for staff/borrowers
      login(user);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (pin === selectedUser.pin) {
      login(selectedUser);
    } else {
      setError('Incorrect PIN');
      triggerShake();
      setPin('');
    }
  };

  const reset = () => {
    setMode('select');
    setSelectedUser(null);
    setPin('');
    setError('');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300"
      style={{
        background: theme === 'dark'
          ? 'var(--app-bg)'
          : 'linear-gradient(135deg, #e8edf5 0%, #f1f5f9 50%, #e2e8f0 100%)',
      }}
    >
      {/* Top Toggle */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          className="w-12 h-12 rounded-2xl bg-white/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="w-full" style={{ maxWidth: 440 }}>
        {/* Logo + Title */}
        <div className="text-center mb-10">
          <div className="relative inline-block">
            <img
              src="/images/349022250_260267146537592_5468556789585259072_n-removebg-preview.png"
              alt="Sucat Elementary School Logo"
              className="rounded-full mx-auto"
              style={{
                width: 90,
                height: 90,
                border: '3px solid #e8b400',
                boxShadow: '0 0 32px rgba(232,180,0,0.3)',
              }}
            />
            <div className="absolute -bottom-2 -right-2 bg-[#e8b400] text-[#0d1b6e] rounded-full p-1.5 border-2 border-[#060c2a]">
              <ShieldCheck size={18} />
            </div>
          </div>
          <h1 className="font-heading font-bold mt-6" style={{ fontSize: 32, color: '#e8b400' }}>
            Inventory Gateway
          </h1>
          <p className="font-body mt-1 font-bold" style={{ fontSize: 16, color: 'var(--muted-text)' }}>
            Sucat Elementary School Portal
          </p>
        </div>

        <div
          className={`rounded-[2rem] p-8 transition-all duration-300 ${shake ? 'animate-shake' : ''}`}
          style={{
            background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff',
            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
            backdropFilter: 'blur(20px)',
            boxShadow: theme === 'dark' ? '0 25px 50px -12px rgba(0,0,0,0.5)' : '0 20px 40px -8px rgba(0,0,0,0.12), 0 8px 16px -4px rgba(0,0,0,0.06)'
          }}
        >
          {mode === 'select' ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-heading font-bold text-slate-800 dark:text-white">Who is logging in?</h2>
                <p className="text-base text-slate-600 dark:text-white/60 font-body">Select your name to continue</p>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin" size={32} color="#e8b400" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-white/20 rounded-2xl">
                  <p className="text-white/60 font-body text-sm">No users registered.</p>
                  <p className="text-white/40 font-body text-xs mt-1 italic">Please contact Admin to create your account.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all hover:bg-white/10 active:scale-[0.98] border border-white/5 hover:border-white/20"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user.role === 'admin' ? 'bg-[#e8b400]/20 text-[#e8b400]' : 'bg-[#7c3aed]/20 text-[#7c3aed]'}`}>
                        {user.role === 'admin' ? <ShieldCheck size={20} /> : <User size={20} />}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-slate-800 dark:text-white font-body font-bold text-base">{user.fullName}</div>
                        <div className="text-slate-500 dark:text-white/50 font-body text-xs uppercase tracking-wider font-bold">{user.role}</div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 dark:text-white/20" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div className="text-center space-y-2">
                <div className="flex justify-center -space-x-3 mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 relative z-10 ${selectedUser?.role === 'admin' ? 'bg-[#0d1b6e]' : 'bg-[#7c3aed]'}`}>
                    <User size={24} color="white" />
                  </div>
                  <div className="w-12 h-12 bg-[#060c2a] rounded-2xl flex items-center justify-center border border-white/10 translate-y-2">
                    <Lock size={20} color="#e8b400" />
                  </div>
                </div>
                <h2 className="text-2xl font-heading font-bold text-slate-800 dark:text-white">{selectedUser?.fullName}</h2>
                <p className="text-xs text-[#e8b400] font-body uppercase tracking-widest font-bold">Identity Verification</p>
              </div>

              <div className="space-y-4">
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={e => {
                    setPin(e.target.value.replace(/\D/g, ''));
                    setError('');
                  }}
                  autoFocus
                  placeholder="● ● ● ●"
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-4 text-slate-800 dark:text-white font-body text-center focus:outline-none focus:border-[#e8b400]/50 transition-all tracking-[1em] text-2xl"
                />

                {error && (
                  <p className="text-red-400 text-xs text-center font-body">{error}</p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={reset}
                    className="flex-1 bg-white/10 text-white/70 py-4 rounded-xl font-body font-bold hover:bg-white/20 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={pin.length < 4}
                    className="flex-[2] bg-[#e8b400] text-[#0d1b6e] py-4 rounded-xl font-body font-bold hover:bg-[#ffc800] transition-colors disabled:opacity-50"
                  >
                    Unlock
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        <p className="text-center mt-10 text-slate-500 dark:text-white/40 text-sm font-body font-medium">
          Authorized Access Only • Sucat Elementary School
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(232,180,0,0.3);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
