import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useMotionTemplate } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  EnvelopeSimple, 
  LockSimple, 
  ArrowRight,
  Warning,
  PaperPlaneTilt,
  Key
} from '@phosphor-icons/react';

export default function ResetPassword() {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword || !token) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await confirmPasswordReset(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

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
          className="rounded-3xl border border-zinc-900 bg-zinc-900/30 backdrop-blur-md p-8 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-lime-500/25"
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

          <AnimatePresence mode="wait">
            {!success ? (
              !token ? (
                
                /* REQUEST PASSWORD RESET (FORGOT PASSWORD) */
                <motion.div
                  key="request-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transform: 'translateZ(5px)' }}
                >
                  <div className="mb-8 text-center">
                    <h2 className="text-2xl font-black tracking-tight text-zinc-100 mb-2">Reset Password</h2>
                    <p className="text-xs text-zinc-400">Enter your email and we'll send a recovery link.</p>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex gap-3 items-start"
                    >
                      <Warning size={16} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handleRequestSubmit} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                          <EnvelopeSimple size={18} />
                        </div>
                        <motion.input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          whileFocus={{ scale: 1.01, borderColor: "rgba(163, 249, 157, 0.4)" }}
                          className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-lime-400/20 text-sm transition-all"
                          placeholder="name@example.com"
                        />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full h-11 mt-2 rounded-xl bg-lime-400 text-zinc-950 font-bold hover:bg-lime-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-lime-400/10"
                    >
                      {loading ? (
                        <span className="w-5 h-5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                      ) : (
                        <>
                          <span>Send Recovery Link</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </motion.button>
                  </form>

                  <p className="mt-8 text-center text-xs text-zinc-500">
                    Remember your password? <Link to="/login" className="text-lime-400 hover:text-lime-300 hover:underline transition-colors font-semibold">Sign In</Link>
                  </p>
                </motion.div>
              ) : (
                
                /* CONFIRM PASSWORD RESET */
                <motion.div
                  key="confirm-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transform: 'translateZ(5px)' }}
                >
                  <div className="mb-8 text-center">
                    <h2 className="text-2xl font-black tracking-tight text-zinc-100 mb-2">New Password</h2>
                    <p className="text-xs text-zinc-400 font-medium">Create a new secure password for your account.</p>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex gap-3 items-start"
                    >
                      <Warning size={16} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handleConfirmSubmit} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                          <LockSimple size={18} />
                        </div>
                        <motion.input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          whileFocus={{ scale: 1.01, borderColor: "rgba(163, 249, 157, 0.4)" }}
                          className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-lime-400/20 text-sm transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                          <Key size={18} />
                        </div>
                        <motion.input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          whileFocus={{ scale: 1.01, borderColor: "rgba(163, 249, 157, 0.4)" }}
                          className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-lime-400/20 text-sm transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full h-11 mt-2 rounded-xl bg-lime-400 text-zinc-950 font-bold hover:bg-lime-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-lime-400/10"
                    >
                      {loading ? (
                        <span className="w-5 h-5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                      ) : (
                        <>
                          <span>Save Password</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              )
            ) : (
              
              /* SUCCESS STATE */
              <motion.div
                key="success-screen"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ transform: 'translateZ(5px)' }}
                className="text-center py-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 mx-auto animate-bounce">
                  <PaperPlaneTilt size={30} />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-100 mb-3">
                  {!token ? 'Email Sent' : 'Password Reset'}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed px-4 mb-8">
                  {!token 
                    ? `We have sent a recovery password reset link to ${email}. Please check your inbox.` 
                    : 'Your password has been successfully reset. You can now use your new password to sign in.'
                  }
                </p>
                <Link
                  to="/login"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-lime-400 text-zinc-950 text-sm font-bold hover:bg-lime-300 active:scale-[0.98] transition-all shadow-md shadow-lime-400/10"
                >
                  Back to Sign In
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>

      </div>

    </div>
  );
}
