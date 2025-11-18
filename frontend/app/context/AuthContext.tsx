'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, getToken, getUser, setToken, setUser, removeToken } from '@/lib/api';

/**
 * Authentication Context
 *
 * Provides global authentication state and methods across the app
 */

export interface User {
  id: number;
  email: string;
  name?: string;
  role: 'admin' | 'school' | 'catering';
  is_active: boolean;
  created_at: string;
  // field tambahan dari backend
  school_id?: number;
  school_name?: string;
  catering_id?: number;
  catering_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    try {
      const storedToken = getToken();
      const storedUser = getUser();

      if (storedToken && storedUser) {
        setTokenState(storedToken);
        setUserState(storedUser);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      removeToken();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);

      if (response.token && response.user) {
        setToken(response.token);
        setUser(response.user);
        setTokenState(response.token);
        setUserState(response.user);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, role: string, name: string) => {
    try {
      const response = await authApi.register(email, password, role, name);

      if (response.token && response.user) {
        setToken(response.token);
        setUser(response.user);
        setTokenState(response.token);
        setUserState(response.user);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = () => {
    authApi.logout();
    setTokenState(null);
    setUserState(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default AuthContext;
