import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform, useMotionTemplate } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { Spinner, ShieldCheck, Warning, EnvelopeOpen, ArrowRight } from '@phosphor-icons/react';

export default function JoinWorkspace() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // 3D Card tilt coordinates
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-200, 200], [8, -8]);
  const rotateY = useTransform(x, [-200, 200], [-8, 8]);
  
  const reflectionX = useTransform(x, [-200, 200], ['0%', '100%']);
  const reflectionY = useTransform(y, [-200, 200], ['0%', '100%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No invitation token was provided in the link.');
      return;
    }

    // Force sign in if not authenticated
    if (!authUser) {
      navigate(`/login?redirect=${encodeURIComponent(`/join?token=${token}`)}`);
    }
  }, [token, authUser, navigate]);

  const handleJoin = async () => {
    if (!token) return;
    setStatus('loading');
    setErrorMsg('');

    try {
      await apiRequest('/workspaces/join', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
      setStatus('success');
      
      // Redirect to the newly joined workspace in the dashboard
      setTimeout(() => {
        navigate(`/dashboard`);
      }, 1500);

    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to accept invitation. The link may have expired or is invalid.');
    }
  };

  if (!authUser) return null;

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center bg-zinc-950 text-zinc-100 overflow-hidden px-6 selection:bg-lime-400/30 selection:text-lime-400">
      
      {/* Background aurora spheres */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-lime-500/5 blur-[120px] will-change-transform" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-cyan-500/5 blur-[120px] will-change-transform" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* Logo Monogram */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-lime-400 to-cyan-400 flex items-center justify-center font-black text-zinc-950 shadow-lg shadow-lime-400/20 mb-3">
            T
          </Link>
          <span className="text-xl font-bold tracking-tight text-zinc-100">
            TaskFlow
          </span>
        </div>

        {/* 3D Tilt Card */}
        <motion.div
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="rounded-3xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-md p-8 shadow-2xl relative overflow-hidden text-center transition-all duration-300 hover:border-lime-500/25"
        >
          {/* Light Sweep Reflection */}
          <motion.div
            style={{
              background: useMotionTemplate`radial-gradient(circle 200px at ${reflectionX} ${reflectionY}, rgba(255,255,255,0.05), transparent 80%)`,
              transform: 'translateZ(10px)',
            }}
            className="absolute inset-0 pointer-events-none rounded-3xl z-10"
          />
          
          {/* Top accent light */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-lime-400/20 to-transparent" />

          {status === 'idle' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ transform: 'translateZ(5px)' }}
              className="py-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400 mb-6 mx-auto">
                <EnvelopeOpen size={30} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-100 mb-2">Workspace Invitation</h2>
              <p className="text-xs text-zinc-400 leading-relaxed px-4 mb-8">
                You've been invited to join a collaborative project space. Accept the invitation to register your membership details.
              </p>
              <motion.button
                onClick={handleJoin}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-11 rounded-xl bg-lime-400 text-zinc-950 font-bold text-sm hover:bg-lime-300 transition-all flex items-center justify-center gap-2 shadow-md shadow-lime-400/10"
              >
                <span>Accept & Join Workspace</span>
                <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          )}

          {status === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ transform: 'translateZ(5px)' }}
              className="py-6 flex flex-col items-center"
            >
              <Spinner size={48} className="text-lime-400 animate-spin mb-6" />
              <h2 className="text-xl font-black mb-2">Verifying Token</h2>
              <p className="text-xs text-zinc-500">Setting up secure membership keys...</p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ transform: 'translateZ(5px)' }}
              className="py-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 mx-auto shadow-inner shadow-emerald-500/10 animate-bounce">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-100 mb-3">Membership Verified</h2>
              <p className="text-xs text-zinc-400 leading-relaxed px-4">
                Successfully joined workspace! Forwarding you to the dashboard...
              </p>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ transform: 'translateZ(5px)' }}
              className="py-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-6 mx-auto">
                <Warning size={32} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-100 mb-3">Unable to Join</h2>
              <p className="text-xs text-rose-400 leading-relaxed px-4 mb-8 bg-rose-500/5 py-3 rounded-xl border border-rose-500/10">
                {errorMsg}
              </p>
              <Link
                to="/dashboard"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-zinc-800 text-zinc-350 text-sm font-semibold hover:bg-zinc-850 active:scale-[0.98] transition-all"
              >
                Go to Dashboard
              </Link>
            </motion.div>
          )}

        </motion.div>

      </div>

    </div>
  );
}
