import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import * as Sentry from "@sentry/react";
import './index.css';

// Initialize Sentry React SDK
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://e138a4d46ea3dbb4d081f21db59779df@o4507000000000000.ingest.us.sentry.io/4507000000000000",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

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

// Custom Glassmorphic Cyberpunk Fallback for Sentry Error Boundary
function CyberFallbackComponent({ error, resetError }: { error: any; resetError: () => void }) {
  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#07070a',
      fontFamily: 'Inter, sans-serif', padding: '24px', boxSizing: 'border-box'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(239,68,68,0.18)',
        borderRadius: '16px', padding: '36px', maxWidth: '520px', width: '100%',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)'
      }}>
        {/* Glow accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg, #ef4444, #f59e0b)'
        }} />
        
        <div style={{
          width: '48px', height: '48px', borderRadius: '10px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
        </div>

        <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#f5f5f7', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          CRITICAL RUNTIME EXCEPTION
        </h2>
        <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
          An unhandled error occurred in the React core. Sentry telemetry has captured the diagnostic logs and dispatched a telemetry alert.
        </p>

        {/* Error Details */}
        <div style={{
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '8px', padding: '12px 16px', margin: '0 0 24px 0', textAlign: 'left',
          maxHeight: '120px', overflowY: 'auto'
        }}>
          <div style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: '4px' }}>
            ERROR_MESSAGE
          </div>
          <code style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ef4444', wordBreak: 'break-all' }}>
            {error?.toString() || 'Unknown runtime error'}
          </code>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px', padding: '8px 18px', color: '#f5f5f7',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.2s'
            }}
          >
            Reload Window
          </button>
          <button
            onClick={resetError}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #f59e0b)', border: 'none',
              borderRadius: '8px', padding: '8px 18px', color: '#fff',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 18px rgba(239,68,68,0.2)', transition: 'all 0.2s'
            }}
          >
            Restart Session
          </button>
        </div>
      </div>
    </div>
  );
}

function Guard({ children }: { children: React.ReactElement }): React.ReactElement {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  return user ? children : <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
}

function AnimatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, filter: 'blur(5px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -15, filter: 'blur(5px)' }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </motion.div>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={<AnimatedRoute><AuthPage /></AnimatedRoute>} />
        <Route path="/auth/callback/google" element={<AnimatedRoute><GoogleCallbackPage /></AnimatedRoute>} />
        <Route path="/join" element={<Guard><AnimatedRoute><JoinPage /></AnimatedRoute></Guard>} />
        <Route path="/prototypes" element={<AnimatedRoute><PrototypeDemoPage /></AnimatedRoute>} />
        <Route path="/blog" element={<AnimatedRoute><BlogPage /></AnimatedRoute>} />
        <Route path="/blog/:slug" element={<AnimatedRoute><BlogPage /></AnimatedRoute>} />
        <Route path="/docs" element={<AnimatedRoute><DocsPage /></AnimatedRoute>} />
        <Route path="/docs/:section" element={<AnimatedRoute><DocsPage /></AnimatedRoute>} />
        <Route path="/pricing" element={<AnimatedRoute><PricingPage /></AnimatedRoute>} />
        <Route path="/" element={<AnimatedRoute><LandingPage /></AnimatedRoute>} />
        <Route path="/dashboard" element={<Guard><AnimatedRoute><DashboardPage /></AnimatedRoute></Guard>} />
        <Route path="/board/:projectId" element={<Guard><AnimatedRoute><BoardPage /></AnimatedRoute></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={({ error, resetError }) => <CyberFallbackComponent error={error} resetError={resetError} />}>
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
    </Sentry.ErrorBoundary>
  );
}
