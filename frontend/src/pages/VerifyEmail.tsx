import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useMotionValue, useTransform, useMotionTemplate } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Warning, 
  Spinner,
  ArrowRight
} from '@phosphor-icons/react';

export default function VerifyEmail() {
  const { verifyEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const hasTriggered = useRef(false);

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
      setErrorMsg('No verification token was provided in the link.');
      return;
    }

    if (hasTriggered.current) return;
    hasTriggered.current = true;

    const triggerVerification = async () => {
      setStatus('loading');
      try {
        await verifyEmail(token);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'The verification link is invalid or has expired.');
      }
    };

    triggerVerification();
  }, [token, verifyEmail]);

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

          {status === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ transform: 'translateZ(5px)' }}
              className="py-6 flex flex-col items-center"
            >
              <Spinner size={48} className="text-lime-400 animate-spin mb-6" />
              <h2 className="text-xl font-black mb-2">Verifying Your Email</h2>
              <p className="text-xs text-zinc-500">Checking link security signatures...</p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ transform: 'translateZ(5px)' }}
              className="py-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 mx-auto shadow-inner shadow-emerald-500/10">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-100 mb-3">Account Activated</h2>
              <p className="text-xs text-zinc-400 leading-relaxed px-4 mb-8">
                Your email has been verified successfully. You can now log into your collaborative workspaces.
              </p>
              <Link
                to="/login"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-lime-400 text-zinc-950 text-sm font-bold hover:bg-lime-300 active:scale-[0.98] transition-all shadow-md shadow-lime-400/10"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight size={16} />
              </Link>
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
              <h2 className="text-2xl font-black tracking-tight text-zinc-100 mb-3">Verification Failed</h2>
              <p className="text-xs text-rose-400 leading-relaxed px-4 mb-8 bg-rose-500/5 py-3 rounded-xl border border-rose-500/10">
                {errorMsg}
              </p>
              <Link
                to="/login"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-zinc-800 text-zinc-350 text-sm font-semibold hover:bg-zinc-850 active:scale-[0.98] transition-all"
              >
                Back to Login
              </Link>
            </motion.div>
          )}

        </motion.div>

      </div>

    </div>
  );
}
