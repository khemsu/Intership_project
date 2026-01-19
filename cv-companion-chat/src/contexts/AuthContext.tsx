// import React, { createContext, useContext, useState, useEffect } from 'react';
// import jwtDecode from 'jwt-decode';

// export type UserRole = 'admin' | 'user';

// interface User {
//   id: string;
//   email: string;
//   role: UserRole;
// }

// interface AuthContextType {
//   user: User | null;
//   login: (email: string, password: string) => Promise<boolean>;
//   logout: () => void;
//   isAuthenticated: boolean;
//   sessionId: string | null;
//   setSessionId: (id: string | null) => void;
//   isLoading: boolean;
// }

// interface JWTToken {
//   sub: string;
//   role: UserRole;
//   exp: number;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

// export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [sessionId, setSessionIdState] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     const storedSessionId = localStorage.getItem('sessionId');

//     if (token) {
//       try {
//         const decoded = jwtDecode<JWTToken>(token);
//         const userData: User = {
//           id: decoded.sub,
//           email: decoded.sub,
//           role: decoded.role,
//         };
//         setUser(userData);
//       } catch (e) {
//         console.error('Invalid token');
//         logout(); // force logout if token is bad
//       }
//     }

//     if (storedSessionId) {
//       setSessionIdState(storedSessionId);
//     }

//     setIsLoading(false);
//   }, []);

//   const login = async (email: string, password: string): Promise<boolean> => {
//     // Check for authorized domain
//     if (!email.toLowerCase().endsWith('@shivautomation.com')) {
//       throw new Error('Organization not authorized');
//     }

//     try {
//       const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/login`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email, password }),
//         credentials: 'include'
//       });

//       if (!res.ok) {
//         return false;
//       }

//       const userData : User = await res.json(); 

//       setUser(userData);
//       return true;
//     } catch (e) {
//       console.error('login error', e);
//       return false;
//     }
//   };

//   const logout = async () => {
//     try{
//     await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/logout`, {
//       method: 'POST',
//       credentials: `include`
//     });

//     localStorage.removeItem('user');

//     setUser(null);
//     setSessionIdState(null);
//   }catch (e) {
//     console.error('Logout failed:', e);
//     }

//   };

//   const setSessionId = (id: string | null) => {
//     setSessionIdState(id);
//     if (id) {
//       localStorage.setItem('sessionId', id);
//     } else {
//       localStorage.removeItem('sessionId');
//     }
//   };

//   const value: AuthContextType = {
//     user,
//     login,
//     logout,
//     isAuthenticated: !!user,
//     sessionId,
//     setSessionId,
//     isLoading,
//   };

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// };



import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'user';

interface User {
  id?: string; // optional, since backend may not return it
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedSessionId = localStorage.getItem('sessionId');
    if (storedSessionId) {
      setSessionIdState(storedSessionId);
    }

    const fetchUser = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/me`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Not authenticated');

        const userData = await res.json();
        setUser(userData);
      } catch (e) {
        setUser(null);
        console.warn("User session not found or expired.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (!res.ok) {
        return false;
      }

      const userData: User = await res.json();
      setUser(userData);
      return true;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      setUser(null);
      setSessionIdState(null);
      localStorage.removeItem('sessionId');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const setSessionId = (id: string | null) => {
    setSessionIdState(id);
    if (id) {
      localStorage.setItem('sessionId', id);
    } else {
      localStorage.removeItem('sessionId');
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    sessionId,
    setSessionId,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
