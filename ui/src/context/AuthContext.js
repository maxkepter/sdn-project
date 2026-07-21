import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await apiClient.get('/auth/profile');
          setUser(res.data.data);
        } catch (err) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const bypassLogin = async () => {
    const res = await apiClient.get('/auth/bypass');
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const register = async (firstName, lastName, email, password, accountType) => {
    const res = await apiClient.post('/auth/register', { firstName, lastName, email, password, accountType });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const upgradeToSeller = async () => {
    const res = await apiClient.post('/auth/upgrade');
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const value = { user, loading, login, bypassLogin, logout, register, upgradeToSeller };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
