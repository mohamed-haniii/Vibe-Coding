import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Shift } from '../types';
import { apiRequest } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  currentShift: Shift | null;
  isLoading: boolean;
  login: (token: string, user: User, currentShift: Shift | null) => void;
  logout: () => void;
  refreshCurrentShift: () => Promise<Shift | null>;
  setCurrentShift: (shift: Shift | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    sessionStorage.getItem('clinic_jwt_token') || localStorage.getItem('clinic_jwt_token')
  );
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = sessionStorage.getItem('clinic_jwt_token') || localStorage.getItem('clinic_jwt_token');

      if (!storedToken) {
        setToken(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const res = await apiRequest('/auth/me');
        setUser(res.user);
        setCurrentShift(res.currentShift);
        setToken(storedToken);
      } catch (err: any) {
        console.error('Failed to restore session:', err);
        // Only clear token if server explicitly rejected auth with 401/403
        if (err.status === 401 || err.status === 403) {
          sessionStorage.removeItem('clinic_jwt_token');
          localStorage.removeItem('clinic_jwt_token');
          setToken(null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();

    const handleUnauthorized = () => {
      sessionStorage.removeItem('clinic_jwt_token');
      localStorage.removeItem('clinic_jwt_token');
      setToken(null);
      setUser(null);
      setCurrentShift(null);
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, []);

  const login = (newToken: string, newUser: User, newShift: Shift | null) => {
    sessionStorage.setItem('clinic_jwt_token', newToken);
    localStorage.setItem('clinic_jwt_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setCurrentShift(newShift);
  };

  const logout = () => {
    sessionStorage.removeItem('clinic_jwt_token');
    localStorage.removeItem('clinic_jwt_token');
    setToken(null);
    setUser(null);
    setCurrentShift(null);
  };

  const refreshCurrentShift = async (): Promise<Shift | null> => {
    try {
      const res = await apiRequest('/shifts/current');
      setCurrentShift(res.currentShift);
      return res.currentShift;
    } catch (err) {
      // Silent catch on network retry or unauthenticated state
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      currentShift,
      isLoading,
      login,
      logout,
      refreshCurrentShift,
      setCurrentShift
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
