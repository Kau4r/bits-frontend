import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in on initial load
    const user = localStorage.getItem('user');
    if (user) {
      setUser(JSON.parse(user));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, _password: string) => {
    setError(null);
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock response
      const mockUser = {
        id: '1',
        email,
        name: email.split('@')[0],
      };
      
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
      navigate('/inventory');
    } catch (err) {
      setError('Invalid email or password');
      throw err;
    }
  };

  const register = async (name: string, email: string, _password: string) => {
    setError(null);
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock response
      const mockUser = {
        id: '1',
        email,
        name,
      };
      
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
      navigate('/inventory');
    } catch (err) {
      setError('Registration failed. Please try again.');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, error }}>
      {!loading && children}
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
