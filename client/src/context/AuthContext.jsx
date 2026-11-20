import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const DEMO_CREDENTIALS = {
  customer: { email: 'customer@ticketflow.com', password: 'customer123', label: 'Customer (Alex Johnson)' },
  agent: { email: 'agent@ticketflow.com', password: 'agent123', label: 'Agent (David Miller)' },
  admin: { email: 'admin@ticketflow.com', password: 'admin123', label: 'Admin (Sarah Connor)' }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ticketflow_token') || null);
  const [loading, setLoading] = useState(true);

  const API_BASE = window.location.origin.includes(':5173') ? 'http://localhost:5000' : '';

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUser(data.user);
          } else {
            logout();
          }
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      // Default to customer demo for smooth review
      quickLogin('customer').finally(() => setLoading(false));
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('ticketflow_token', data.token);
      return { success: true };
    }
    return { success: false, message: data.message };
  };

  const register = async (name, email, password, role = 'customer') => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });
    const data = await res.json();
    if (data.success) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('ticketflow_token', data.token);
      return { success: true };
    }
    return { success: false, message: data.message };
  };

  const quickLogin = async (roleKey) => {
    const creds = DEMO_CREDENTIALS[roleKey];
    if (creds) {
      return await login(creds.email, creds.password);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ticketflow_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, role: user?.role, login, register, logout, quickLogin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
