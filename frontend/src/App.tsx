import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// Lazy load pages for chunk splitting
const AuthPage = lazy(() => import('./pages/AuthPage'));
const GoogleCallbackPage = lazy(() => import('./pages/GoogleCallbackPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const BoardPage = lazy(() => import('./pages/BoardPage'));
const JoinPage = lazy(() => import('./pages/JoinPage'));
const PrototypeDemoPage = lazy(() => import('./pages/PrototypeDemoPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const DocsPage = lazy(() => import('./pages/DocsPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// A premium visual loading fallback component for Suspense
function PageLoader() {
  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#0b0b0e',
      fontFamily: 'Inter, sans-serif', gap: 16, overflow: 'hidden'
    }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Animated glowing back ring */}
        <div style={{
          position: 'absolute', width: 48, height: 48, borderRadius: '50%',
          border: '2px solid rgba(168,85,247,0.1)', borderTopColor: '#a855f7',
          animation: 'spin 1s linear infinite'
        }} />
        {/* Inner slow reverse pulsing ring */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2px dashed rgba(99,102,241,0.2)', borderBottomColor: '#6366f1',
          animation: 'spin-reverse 2s linear infinite'
        }} />
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Loading TaskFlow
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}

function Guard({ children }: { children: React.ReactElement }): React.ReactElement {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  return user ? children : <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
}

function LandingOrDashboard(): React.ReactElement {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <DashboardPage /> : <LandingPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback/google" element={<GoogleCallbackPage />} />
      <Route path="/join" element={<Guard><JoinPage /></Guard>} />
      <Route path="/prototypes" element={<PrototypeDemoPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/docs/:section" element={<DocsPage />} />
      <Route path="/pricing" element={<PricingPage />} />
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
          <Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </Suspense>
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
