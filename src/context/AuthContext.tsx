import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, User_Role } from '@/types/user';
import api from '@/services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  userRole: User_Role | null;
  loading: boolean;
}

interface LoginResponse {
  token: string;
  user: User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchUser = async () => {
      try {
        const res = await api.get<User>('/users/me', { headers: { Authorization: `Bearer ${token}` } });
        if (isMounted) setUser(res.data);
      } catch (err: any) {
        if (err.response?.status === 401) localStorage.removeItem('token');
        console.error('Failed to fetch current user', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUser();

    return () => { isMounted = false; };
  }, []);


  const login = async (email: string, password: string) => {
    try {
      const res = await api.post<LoginResponse>('/auth/login', { email, password });
      const { token, user } = res.data;

      localStorage.setItem("userId", res.data.user.User_ID.toString()); // ✅ store as string
      localStorage.setItem('token', token);
      setUser(user);

      return { success: true, user };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || err.response?.data?.message || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Call backend to log the logout action
        await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } });
      }
    } catch (err) {
      console.error('Logout API call failed:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        token: localStorage.getItem('token'),
        login,
        logout,
        userRole: user?.User_Role || null,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
