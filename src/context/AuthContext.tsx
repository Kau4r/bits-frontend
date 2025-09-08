import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type UserRole = 'System Admin' | 'Lab Tech' | 'Lab Head' | 'Faculty' | 'Secretary' | 'Student';

interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

interface UserWithPassword extends User {
  password: string;
}

// Mock user data with password
const MOCK_USERS: UserWithPassword[] = [
  {
    id: '1',
    email: 'admin@bits.edu',
    password: 'admin123',
    role: 'System Admin',
    name: 'Admin User'
  },
  {
    id: '2',
    email: 'labtech@bits.edu',
    password: 'labtech123',
    role: 'Lab Tech',
    name: 'Lab Technician'
  },
  {
    id: '3',
    email: 'labhead@bits.edu',
    password: 'labhead123',
    role: 'Lab Head',
    name: 'Lab Head'
  },
  {
    id: '4',
    email: 'faculty@bits.edu',
    password: 'faculty123',
    role: 'Faculty',
    name: 'Faculty Member'
  },
  {
    id: '5',
    email: 'secretary@bits.edu',
    password: 'secretary123',
    role: 'Secretary',
    name: 'Secretary'
  },
  {
    id: '6',
    email: 'student@bits.edu',
    password: 'student123',
    role: 'Student',
    name: 'Student'
  }
];

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  userRole: UserRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on initial load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse user from localStorage', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const foundUser = MOCK_USERS.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      const userData: User = {
        id: foundUser.id,
        email: foundUser.email,
        role: foundUser.role,
        name: foundUser.name
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData };
    }
    
    return { 
      success: false, 
      error: 'Invalid email or password' 
    };
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        login,
        logout,
        userRole: user?.role || null,
        loading
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher Order Component for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[]
): React.FC<P> => {
  const AuthenticatedComponent: React.FC<P> = (props) => {
    const { isAuthenticated, userRole } = useAuth();

    if (!isAuthenticated) {
      // Redirect to login or show unauthorized
      window.location.href = '/login';
      return null;
    }

    if (userRole && !allowedRoles.includes(userRole)) {
      // Show unauthorized page or redirect to a different route
      return <div>You don't have permission to access this page.</div>;
    }

    return <Component {...props as P} />;
  };

  return AuthenticatedComponent;
};
