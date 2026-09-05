// PeoplePay360 - Authentication & Role Persona Context

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserResponse, UserRole } from '../types/api';
import { apiService } from '../services/apiService';
import { apiClient } from '../services/apiClient';
import { mockUsers } from '../services/mockData';

interface AuthContextType {
  user: UserResponse | null;
  isAuthenticated: boolean;
  loading: boolean;
  isMockMode: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  toggleMockMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMockMode, setIsMockMode] = useState<boolean>(apiClient.isMock());

  useEffect(() => {
    const unsub = apiClient.subscribeModeChange((mock) => {
      setIsMockMode(mock);
    });
    return unsub;
  }, []);

  useEffect(() => {
    async function initAuth() {
      try {
        const me = await apiService.getMe();
        setUser(me);
      } catch {
        setUser(mockUsers[0]);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await apiService.login(email, pass);
      const me = await apiService.getMe();
      setUser(me);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiClient.clearTokens();
    setUser(null);
  };

  const switchRole = (role: UserRole) => {
    const found = mockUsers.find((u) => u.role === role);
    if (found) {
      setUser(found);
      apiClient.setTokens(`mock-token-${found.id}-${found.role}`);
    } else if (user) {
      setUser({ ...user, role });
    }
  };

  const toggleMockMode = () => {
    apiClient.setMockMode(!isMockMode);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        isMockMode,
        login,
        logout,
        switchRole,
        toggleMockMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
