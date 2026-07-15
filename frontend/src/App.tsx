import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import OAuthCallback from './pages/OAuthCallback';
import Dashboard from './pages/Dashboard';
import JoinWorkspace from './pages/JoinWorkspace';
import ProjectBoard from './pages/ProjectBoard';
import Billing from './pages/Billing';
import Analytics from './pages/Analytics';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Landing /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />
        <Route path="/verify-email" element={<PageWrapper><VerifyEmail /></PageWrapper>} />
        <Route path="/password-reset" element={<PageWrapper><ResetPassword /></PageWrapper>} />
        <Route path="/auth/callback/google" element={<PageWrapper><OAuthCallback /></PageWrapper>} />
        <Route path="/auth/callback/github" element={<PageWrapper><OAuthCallback /></PageWrapper>} />
        <Route path="/dashboard" element={<PageWrapper><Dashboard /></PageWrapper>} />
        <Route path="/join" element={<PageWrapper><JoinWorkspace /></PageWrapper>} />
        <Route path="/workspaces/:workspaceId/projects/board" element={<PageWrapper><ProjectBoard /></PageWrapper>} />
        <Route path="/workspaces/:workspaceId/projects/:projectId/board" element={<PageWrapper><ProjectBoard /></PageWrapper>} />
        <Route path="/workspaces/:workspaceId/billing" element={<PageWrapper><Billing /></PageWrapper>} />
        <Route path="/workspaces/:workspaceId/analytics" element={<PageWrapper><Analytics /></PageWrapper>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AnimatedRoutes />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
