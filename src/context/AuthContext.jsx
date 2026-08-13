import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, getAccessToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAccessToken());
  const [loading, setLoading] = useState(false);

  const login = async (email, password, role, rememberMe = false) => {
    setLoading(true);
    try {
      const data = await authService.signIn(email, password, role);
      const { tokens, user: userData } = data;

      if (rememberMe) {
        localStorage.setItem('accessToken', tokens.access);
        localStorage.setItem('refreshToken', tokens.refresh);
      } else {
        sessionStorage.setItem('accessToken', tokens.access);
        sessionStorage.setItem('refreshToken', tokens.refresh);
      }

      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.detail || 
                      error.response?.data?.non_field_errors?.[0] || 
                      'Authentication failed. Please check your credentials.';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (full_name, email, password, role, companyData = {}) => {
    setLoading(true);
    try {
      const data = await authService.signUp(full_name, email, password, role, companyData);
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.email?.[0] || 
                      error.response?.data?.detail || 
                      'Registration failed. Please check your inputs.';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
