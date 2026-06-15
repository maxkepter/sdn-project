import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local authentication state on load
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await apiClient.get('/users/profile');
          setUser(res.data.data);
        } catch (err) {
          console.error('Auto login check failed:', err);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    // Stub login request. Replace with your actual api endpoint (e.g. apiClient.post('/auth/login'))
    const mockToken = 'stub-jwt-token';
    const mockUser = { id: 'test-user-id', username: 'dev_user', email };

    localStorage.setItem('token', mockToken);
    setUser(mockUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
