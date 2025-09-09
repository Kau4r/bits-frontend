import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, UserWithPassword, User_Role } from '../types/user';

const MOCK_USERS: UserWithPassword[] = [
  {
    User_ID: 1,
    User_Role: 'System Admin',
    First_Name: 'Admin',
    Last_Name: 'User',
    Email: 'admin@bits.edu',
    Is_Active: true,
    password: 'admin123'
  },
  {
    User_ID: 2,
    User_Role: 'Lab Tech',
    First_Name: 'Lab',
    Last_Name: 'Technician',
    Email: 'labtech@bits.edu',
    Is_Active: true,
    password: 'labtech123'
  },
  {
    User_ID: 3,
    User_Role: 'Lab Head',
    First_Name: 'Lab',
    Last_Name: 'Head',
    Email: 'labhead@bits.edu',
    Is_Active: true,
    password: 'labhead123'
  },
  {
    User_ID: 4,
    User_Role: 'Faculty',
    First_Name: 'Faculty',
    Last_Name: 'Member',
    Email: 'faculty@bits.edu',
    Is_Active: true,
    password: 'faculty123'
  },
  {
    User_ID: 5,
    User_Role: 'Secretary',
    First_Name: 'Secretary',
    Last_Name: 'User',
    Email: 'secretary@bits.edu',
    Is_Active: true,
    password: 'secretary123'
  },
  {
    User_ID: 6,
    User_Role: 'Student',
    First_Name: 'Student',
    Last_Name: 'User',
    Email: 'student@bits.edu',
    Is_Active: true,
    password: 'student123'
  }
];


interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  userRole: User_Role | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    const foundUser = MOCK_USERS.find(u => u.Email === email && u.password === password);

    if (foundUser) {
      const userData: User = {
        User_ID: foundUser.User_ID,
        User_Role: foundUser.User_Role,
        First_Name: foundUser.First_Name,
        Last_Name: foundUser.Last_Name,
        Email: foundUser.Email,
        Is_Active: foundUser.Is_Active
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
        userRole: user?.User_Role || null,
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
  allowedRoles: User_Role[]
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
