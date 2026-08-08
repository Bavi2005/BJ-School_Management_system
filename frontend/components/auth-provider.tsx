'use client';

import * as React from 'react';
import { apiClient, setAuthTokens } from '@/lib/api-client';
import { UserRole } from '@school-mgmt/shared';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  permissions: string[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    void refresh();
  }, []);

  const refresh = async () => {
    try {
      const data = await apiClient<{
        data: {
          user: User;
          permissions: string[];
        };
      }>('/auth/me');

      setUser(data.data.user);
      setPermissions(data.data.permissions ?? []);
    } catch {
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await apiClient<{
      data: {
        user: User;
        tokens: { accessToken: string; refreshToken: string };
        permissions: string[];
      };
    }>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });

    setAuthTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
    setUser(data.data.user);
    setPermissions(data.data.permissions ?? []);
  };

  const register = async (data: Record<string, unknown>) => {
    await apiClient('/auth/register', {
      method: 'POST',
      auth: false,
      body: data,
    });
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setPermissions([]);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{ user, permissions, loading, login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}