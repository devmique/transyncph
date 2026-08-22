'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface OperatorInfo {
  id: string;
  name: string;
  email: string;
  companyName: string;
  tier: string;
}

interface AuthContextType {
  operator: OperatorInfo | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  companyName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [operator, setOperator] = useState<OperatorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Rehydrate from /api/auth/me on mount — cookie is sent automatically
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setOperator(data))
      .catch(() => setOperator(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    // Cookie is set by the server — we just store the non-sensitive operator info
    setOperator(data.operator);
  };

  const register = async (data: RegisterData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const result = await response.json();
    setOperator(result.operator);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setOperator(null);
    // Hard navigation rather than router.push. A soft navigation is served by
    // the client router, which can race the cookie deletion and get bounced
    // back to /dashboard by the proxy. Once that happens the dashboard layout
    // renders null with no way to recover, because its redirect effect only
    // reruns when `operator` changes and it was already null. A full document
    // request re-reads cookie state from scratch and cannot get stuck.
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ operator, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}