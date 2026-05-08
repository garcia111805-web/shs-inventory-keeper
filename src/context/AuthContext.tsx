import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AppUser, UserRole } from '../types';

interface AuthContextType {
  user: AppUser | null;
  role: UserRole | null;
  login: (user: AppUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);

  const login = (u: AppUser) => {
    setUser(u);
    localStorage.setItem('sshs-user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sshs-user');
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
