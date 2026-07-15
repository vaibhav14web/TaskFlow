import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, setTokens, clearTokens, getUser, getAccessToken } from '../utils/api';


interface User {
  id: string;
  name: string;
  email: string;
  twoFactorEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ twoFactorRequired: boolean; loginTicket?: string; user?: User }>;
  verify2FALogin: (code: string, loginTicket: string) => Promise<User>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, password: string) => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(getUser());
  const [loading, setLoading] = useState(true);

  const refreshUser = async (): Promise<User | null> => {
    if (!getAccessToken()) {
      setUserState(null);
      setLoading(false);
      return null;
    }
    try {
      // /auth/me returns data: user directly (not data: { user })
      const user = await apiRequest<User>('/auth/me');
      setUserState(user);
      localStorage.setItem('taskflow_user', JSON.stringify(user));
      return user;
    } catch (err) {
      clearTokens();
      setUserState(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res.twoFactorRequired) {
        return { twoFactorRequired: true, loginTicket: res.loginTicket };
      }

      const { access_token, refresh_token, user: loggedUser } = res;
      setTokens(access_token, refresh_token, loggedUser);
      setUserState(loggedUser);
      return { twoFactorRequired: false, user: loggedUser };
    } catch (error) {
      throw error;
    }
  };

  const verify2FALogin = async (code: string, loginTicket: string) => {
    try {
      const res = await apiRequest('/auth/2fa/login-verify', {
        method: 'POST',
        body: JSON.stringify({ code, loginTicket }),
      });

      const { access_token, refresh_token, user: loggedUser } = res;
      setTokens(access_token, refresh_token, loggedUser);
      setUserState(loggedUser);
      return loggedUser;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      const refresh_token = localStorage.getItem('taskflow_refresh_token');
      if (refresh_token) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token }),
        }).catch(() => {});
      }
    } finally {
      clearTokens();
      setUserState(null);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  };

  const resendVerification = async (email: string) => {
    await apiRequest('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  const verifyEmail = async (token: string) => {
    await apiRequest('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  };

  const requestPasswordReset = async (email: string) => {
    await apiRequest('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  const confirmPasswordReset = async (token: string, password: string) => {
    await apiRequest('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      verify2FALogin,
      logout, 
      register, 
      resendVerification,
      verifyEmail,
      requestPasswordReset,
      confirmPasswordReset,
      refreshUser 
    }}>
      {children}
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
