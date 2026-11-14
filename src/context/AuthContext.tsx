import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiRequest, clearStoredToken, getStoredToken, setStoredToken } from '../lib/api';
import { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    educationLevel: string;
    institution: string;
    domain?: string;
    level?: string;
  }) => Promise<User>;
  enterFromIntake: (payload: {
    domain: string;
    level: string;
    fullName?: string;
  }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ user: User }>('/api/auth/me');
      setUser(data.user);
    } catch {
      clearStoredToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string, rememberMe = true) => {
    const data = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    });
    setStoredToken(data.token, rememberMe);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    educationLevel: string;
    institution: string;
    domain?: string;
    level?: string;
  }) => {
    const data = await apiRequest<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(data.token, true);
    setUser(data.user);
    return data.user;
  };

  const enterFromIntake = async (payload: { domain: string; level: string; fullName?: string }) => {
    const data = await apiRequest<{ token: string; user: User }>('/api/intake/enter', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(data.token, true);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, enterFromIntake, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
