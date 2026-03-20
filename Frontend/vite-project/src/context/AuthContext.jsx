import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const initAuth = async () => {
      const token = authService.getToken();

      if (token) {
        try {
          const response = await authService.getProfile();
          const profileUser = response?.user;

          if (profileUser) {
            setUser(profileUser);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(profileUser));
          } else {
            authService.clearSession();
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch {
          try {
            await authService.refreshAccessToken();
            const retryResponse = await authService.getProfile();
            const retryUser = retryResponse?.user;

            if (retryUser) {
              setUser(retryUser);
              setIsAuthenticated(true);
              localStorage.setItem('user', JSON.stringify(retryUser));
            } else {
              authService.clearSession();
              setUser(null);
              setIsAuthenticated(false);
            }
          } catch {
            authService.clearSession();
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    setIsAuthenticated(true);
    return response;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    setUser(response.user);
    setIsAuthenticated(true);
    return response;
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if API call fails
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
