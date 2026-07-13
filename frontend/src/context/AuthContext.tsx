import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { authApi } from '../api';
import type { User } from '../api';

interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<any>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]   = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      authApi.me()
        .then((r: any) => setUser(r.data))
        .catch(() => { localStorage.removeItem('token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const r: any = await authApi.login({ email, password });
    if (r.data?.twoFactorRequired) {
      return r.data;
    }
    localStorage.setItem('token', r.data.access_token);
    localStorage.setItem('refreshToken', r.data.refresh_token);
    setToken(r.data.access_token);
    setUser(r.data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const r: any = await authApi.register({ name, email, password });

    // In production, the backend does NOT return verificationToken in the response
    // (only returned in dev/test mode for convenience). In production, user must
    // verify their email manually before logging in.
    if (r.data?.verificationToken) {
      // Dev / test only: auto-verify email and auto-login so devs don't need
      // to check their email every time they test registration.
      await api.post('/auth/verify-email', { token: r.data.verificationToken });
      const loginRes: any = await authApi.login({ email, password });
      localStorage.setItem('token', loginRes.data.access_token);
      localStorage.setItem('refreshToken', loginRes.data.refresh_token);
      setToken(loginRes.data.access_token);
      setUser(loginRes.data.user);
    }
    // In production: register() simply resolves. The caller (AuthPage) is
    // responsible for showing the "check your email" message. No auto-login.
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    // Send refresh_token so backend can blacklist it too
    authApi.logout().catch(() => {});
    // Fire-and-forget: tell backend to revoke the refresh token
    if (refreshToken) {
      api.post('/auth/logout', { refresh_token: refreshToken }).catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </Ctx.Provider>
  );
}
