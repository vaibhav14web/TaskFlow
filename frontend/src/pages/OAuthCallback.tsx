import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { setTokens } from '../utils/api';
import { Spinner, ShieldCheck, Warning } from '@phosphor-icons/react';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    const processCallback = async () => {
      try {
        const errorParam = searchParams.get('error');
        if (errorParam) {
          setStatus('error');
          setErrorMsg(decodeURIComponent(errorParam));
          return;
        }

        // Parse fragment parameters
        const hash = window.location.hash.substring(1);
        if (!hash) {
          setStatus('error');
          setErrorMsg('No authentication payload found in URL.');
          return;
        }

        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const userId = params.get('user_id');
        const userName = params.get('user_name');
        const userEmail = params.get('user_email');
        const userAvatar = params.get('user_avatar');

        if (!accessToken || !refreshToken || !userId) {
          setStatus('error');
          setErrorMsg('Authentication payload is incomplete or corrupt.');
          return;
        }

        // Save tokens
        setTokens(accessToken, refreshToken, {
          id: userId,
          name: userName ? decodeURIComponent(userName) : 'Social User',
          email: userEmail ? decodeURIComponent(userEmail) : '',
          avatarUrl: userAvatar ? decodeURIComponent(userAvatar) : undefined
        });

        // Sync context user state
        await refreshUser();
        setStatus('success');

        // Forward to redirect query parameter or default dashboard
        const redirect = searchParams.get('redirect') || '/dashboard';
        setTimeout(() => {
          navigate(redirect);
        }, 1200);

      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'An unexpected error occurred during social login.');
      }
    };

    processCallback();
  }, [navigate, searchParams, refreshUser]);

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center bg-zinc-950 text-zinc-100 overflow-hidden px-6 selection:bg-lime-400/30 selection:text-lime-400">
      
      {/* Background aurora spheres */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-lime-500/5 blur-[120px] will-change-transform" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-cyan-500/5 blur-[120px] will-change-transform" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* Logo Monogram */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-lime-400 to-cyan-400 flex items-center justify-center font-black text-zinc-950 shadow-lg shadow-lime-400/20 mb-3">
            T
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-100">
            TaskFlow
          </span>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-md p-8 shadow-2xl relative overflow-hidden text-center">
          
          {/* Top accent light */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-lime-400/20 to-transparent" />

          {status === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-6 flex flex-col items-center"
            >
              <Spinner size={48} className="text-lime-400 animate-spin mb-6" />
              <h2 className="text-xl font-black mb-2">Establishing Session</h2>
              <p className="text-xs text-zinc-500">Syncing secure login keys...</p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 mx-auto shadow-inner shadow-emerald-500/10">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-100 mb-3">Securely Authenticated</h2>
              <p className="text-xs text-zinc-400 leading-relaxed px-4">
                Social login successful. Redirecting you to your workspaces...
              </p>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6 mx-auto">
                <Warning size={32} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-100 mb-3">Authentication Failed</h2>
              <p className="text-xs text-rose-400 leading-relaxed px-4 mb-8 bg-rose-500/5 py-3 rounded-xl border border-rose-500/10">
                {errorMsg}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-lime-400 text-zinc-950 text-sm font-bold hover:bg-lime-300 active:scale-[0.98] transition-all shadow-md shadow-lime-400/10"
              >
                Back to Login
              </button>
            </motion.div>
          )}

        </div>

      </div>

    </div>
  );
}
