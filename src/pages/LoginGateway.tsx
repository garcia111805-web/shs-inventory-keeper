import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, ChevronRight, CornerDownLeft, Loader2, User, Sun, Moon, ArrowLeft, Search, CheckCircle2, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AppUser } from '../types';

export default function LoginGateway() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'select' | 'confirm' | 'pin'>('select');
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [shake, setShake] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    async function fetchUsers() {
      if (!isSupabaseConfigured) {
        setUsers([
          {
            id: 'admin-1',
            fullName: 'Administrator',
            employeeId: 'ADM-001',
            role: 'admin',
            pin: '1234',
            createdAt: new Date().toISOString()
          },
          {
            id: 'staff-1',
            fullName: 'Staff User',
            employeeId: 'STF-001',
            role: 'staff',
            pin: '',
            createdAt: new Date().toISOString()
          }
        ]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .order('full_name');

        if (!error && data && data.length > 0) {
          setUsers(data.map(d => ({
            id: d.id,
            fullName: d.full_name,
            employeeId: d.employee_id,
            role: d.role,
            pin: d.pin,
            createdAt: d.created_at
          })));
        } else {
          // Default fallback account so portal remains usable
          setUsers([
            {
              id: 'admin-1',
              fullName: 'Administrator',
              employeeId: 'ADM-001',
              role: 'admin',
              pin: '1234',
              createdAt: new Date().toISOString()
            },
            {
              id: 'staff-1',
              fullName: 'Staff User',
              employeeId: 'STF-001',
              role: 'staff',
              pin: '',
              createdAt: new Date().toISOString()
            }
          ]);
        }
      } catch {
        setUsers([
          {
            id: 'admin-1',
            fullName: 'Administrator',
            employeeId: 'ADM-001',
            role: 'admin',
            pin: '1234',
            createdAt: new Date().toISOString()
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase().trim();
    return users.filter(u => 
      u.fullName.toLowerCase().includes(q) || 
      (u.employeeId && u.employeeId.toLowerCase().includes(q))
    );
  }, [users, userSearch]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleUserSelect = (user: AppUser) => {
    setSelectedUser(user);
    if (user.role === 'admin' || (user.pin && user.pin.trim().length > 0)) {
      setMode('pin');
      setPin('');
      setError('');
    } else {
      // Require staff confirmation to prevent misclicks in large user lists
      setMode('confirm');
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
              src="/images/sucat-elementary-logo.png"
              alt="Sucat Elementary School Logo"
              className="rounded-full mx-auto object-contain bg-white p-0.5"
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
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-3xl font-heading font-bold text-slate-800 dark:text-white">Who is logging in?</h2>
                <p className="text-sm text-slate-600 dark:text-white/60 font-body">Select your name to continue</p>
              </div>

              {/* User search bar to easily find account in long staff lists */}
              {!loading && users.length > 0 && (
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search name or ID..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e8b400]/30 transition-all font-body"
                  />
                  {userSearch && (
                    <button
                      onClick={() => setUserSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 rounded-full"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin" size={32} color="#e8b400" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-slate-300 dark:border-white/20 rounded-2xl">
                  <p className="text-slate-700 dark:text-white/60 font-body text-sm">No users registered.</p>
                  <p className="text-slate-500 dark:text-white/40 font-body text-xs mt-1 italic">Please contact Admin to create your account.</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 px-4 border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02]">
                  <p className="text-slate-700 dark:text-white/70 font-body text-sm font-semibold">No matches for "{userSearch}"</p>
                  <button
                    onClick={() => setUserSearch('')}
                    className="mt-2 text-xs text-[#e8b400] font-bold hover:underline"
                  >
                    Clear search filter
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/10 active:scale-[0.98] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-left group"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${user.role === 'admin' ? 'bg-[#e8b400]/20 text-[#e8b400]' : 'bg-[#7c3aed]/20 text-[#7c3aed]'}`}>
                        {user.role === 'admin' ? <ShieldCheck size={20} /> : <User size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-800 dark:text-white font-body font-bold text-sm sm:text-base truncate">{user.fullName}</div>
                        <div className="text-slate-500 dark:text-white/50 font-body text-[11px] uppercase tracking-wider font-semibold">
                          {user.role} {user.employeeId ? `• ${user.employeeId}` : ''}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 dark:text-white/30 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : mode === 'confirm' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between -mt-2 pb-2 border-b border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-white/60 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Choose Another User</span>
                </button>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-white/30">
                  Staff Confirmation
                </span>
              </div>

              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl mx-auto bg-[#7c3aed]/15 border-2 border-[#7c3aed]/30 flex items-center justify-center text-[#7c3aed] shadow-md">
                  <User size={32} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest font-bold text-slate-400 dark:text-white/40">Log in as</p>
                  <h2 className="text-2xl font-heading font-bold text-slate-800 dark:text-white mt-0.5">
                    {selectedUser?.fullName}
                  </h2>
                  {selectedUser?.employeeId && (
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70">
                      ID: {selectedUser.employeeId}
                    </span>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-body leading-relaxed">
                    ⚠️ Items borrowed or used will be recorded under <strong>{selectedUser?.fullName}</strong>. Please ensure this is you.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={() => selectedUser && login(selectedUser)}
                  className="w-full bg-[#e8b400] text-[#0d1b6e] py-4 rounded-xl font-body font-bold hover:bg-[#ffc800] transition-colors shadow-md text-base flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <CheckCircle2 size={18} />
                  Yes, Continue as {selectedUser?.fullName?.split(' ')[0]}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/20 py-3.5 rounded-xl font-body font-bold border border-slate-200 dark:border-white/10 transition-all text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <ArrowLeft size={16} />
                  No, that's not me (Go Back)
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div className="flex items-center justify-between -mt-2 pb-2 border-b border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-white/60 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Switch User</span>
                </button>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-white/30">
                  {selectedUser?.role === 'admin' ? 'Admin Access' : 'User Verification'}
                </span>
              </div>

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
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-4 text-slate-800 dark:text-white font-body text-center focus:outline-none focus:border-[#e8b400] dark:focus:border-[#e8b400]/60 transition-all tracking-[1em] text-2xl shadow-inner"
                />

                {error && (
                  <p className="text-red-400 text-xs text-center font-body">{error}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={reset}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/90 dark:hover:bg-white/20 py-4 rounded-xl font-body font-bold border border-slate-300/80 dark:border-white/10 transition-all active:scale-[0.98] shadow-sm"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={pin.length < 4}
                    className="flex-[2] bg-[#e8b400] text-[#0d1b6e] py-4 rounded-xl font-body font-bold hover:bg-[#ffc800] transition-colors disabled:opacity-50 shadow-md active:scale-[0.98]"
                  >
                    Unlock
                  </button>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={reset}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:text-white/50 dark:hover:text-white transition-colors underline-offset-4 hover:underline font-medium"
                  >
                    Picked the wrong user? Choose another
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
