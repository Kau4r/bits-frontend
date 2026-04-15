import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, User_Role } from '@/types/user';
import api from '@/services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Restore session on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchUser = async () => {
      try {
        const res = await api.get<User>('/users/me', { headers: { Authorization: `Bearer ${storedToken}` } });
        if (isMounted) setUser(res.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
        }
        console.error('Failed to fetch current user', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUser();

    return () => { isMounted = false; };
  }, []);


  const login = async (username: string, password: string) => {
    try {
      const res = await api.post<LoginResponse>('/auth/login', { username, password });
      const { token: authToken, user: authUser } = res.data;

      localStorage.setItem('userId', authUser.User_ID.toString());
      localStorage.setItem('token', authToken);
      setToken(authToken);
      setUser(authUser);

      return { success: true, user: authUser };
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
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(token && user),
        user,
        token,
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
