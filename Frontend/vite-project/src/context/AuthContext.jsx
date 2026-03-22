import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user,            setUser]            = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = authService.getToken();
      if (!token) { setLoading(false); return; }
      try {
        const response    = await authService.getProfile();
        const profileUser = response?.user;
        if (profileUser) {
          setUser(profileUser);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(profileUser));
        } else {
          authService.clearSession();
        }
      } catch {
        try {
          await authService.refreshAccessToken();
          const retry     = await authService.getProfile();
          const retryUser = retry?.user;
          if (retryUser) {
            setUser(retryUser);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(retryUser));
          } else {
            authService.clearSession();
          }
        } catch {
          authService.clearSession();
        }
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  // Returns the logged-in user so the caller can trigger cart sync
  const login = async (email, password) => {
    const response = await authService.login(email, password);
    if (response?.user) {
      setUser(response.user);
      setIsAuthenticated(true);
    }
    return response;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    if (response?.user) {
      setUser(response.user);
      setIsAuthenticated(true);
    }
    return response;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
    localStorage.setItem('user', JSON.stringify({ ...user, ...updatedUser }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};