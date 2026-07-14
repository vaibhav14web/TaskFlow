import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import DashboardPage from './pages/DashboardPage';
import BoardPage from './pages/BoardPage';
import JoinPage from './pages/JoinPage';
import PrototypeDemoPage from './pages/PrototypeDemoPage';
import LandingPage from './pages/LandingPage';
import './index.css';

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function Guard({ children }: { children: React.ReactElement }): React.ReactElement {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div className="spinner" />
    </div>
  );
  return user ? children : <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
}

function LandingOrDashboard(): React.ReactElement {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div className="spinner" />
    </div>
  );
  return user ? <DashboardPage /> : <LandingPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback/google" element={<GoogleCallbackPage />} />
      <Route path="/join" element={<Guard><JoinPage /></Guard>} />
      <Route path="/prototypes" element={<PrototypeDemoPage />} />
      <Route path="/" element={<LandingOrDashboard />} />
      <Route path="/board/:projectId" element={<Guard><BoardPage /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={qc}>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgba(17,17,40,0.97)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                borderRadius: 12,
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: 'white' } },
              error: { iconTheme: { primary: '#ef4444', secondary: 'white' } },
            }}
          />
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
