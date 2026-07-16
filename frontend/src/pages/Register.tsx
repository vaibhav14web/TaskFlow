import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useMotionTemplate } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  User,
  EnvelopeSimple, 
  LockSimple, 
  ArrowRight,
  Warning,
  PaperPlaneTilt,
  GoogleLogo,
  GithubLogo,
  Info
} from '@phosphor-icons/react';
import authShowcase from '../assets/auth_showcase_asset.png';

export default function Register() {
  const { register } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setLoading(true);
    setError(null);

    try {
      await register(name, email, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://taskflow-j39g.onrender.com';
    window.location.href = `${API_BASE_URL}/api/v1/auth/oauth/google?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleGithubLogin = () => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://taskflow-j39g.onrender.com';
    window.location.href = `${API_BASE_URL}/api/v1/auth/oauth/github?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center bg-zinc-950 text-zinc-100 overflow-hidden px-6 selection:bg-lime-400/30 selection:text-lime-400 py-12">
      
      {/* Background aurora spheres */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-lime-500/5 blur-[120px] will-change-transform" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-cyan-500/5 blur-[120px] will-change-transform" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Premium Feature Showcase */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-center text-left space-y-6">
          <div className="relative rounded-3xl border border-zinc-900/60 bg-zinc-900/10 p-8 overflow-hidden shadow-2xl backdrop-blur-sm">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent" />
            
            <motion.div
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-zinc-800"
            >
              <img 
                src={authShowcase} 
                alt="Secure sign-in illustration" 
                className="w-full h-full object-cover select-none pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 via-transparent to-transparent pointer-events-none" />
            </motion.div>

            <div className="mt-8 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400 shrink-0">
                <Info size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Secure collaboration spaces</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-[42ch]">
                  Enter credentials or select single-sign-on (Google/GitHub) to safely access team metrics, time-logs, and Kanban task boards.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Card */}
        <div className="col-span-1 lg:col-span-6 w-full max-w-md mx-auto">
          {/* Logo Monogram */}
          <div className="flex flex-col items-center mb-8">
            <Link to="/" className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-lime-400 to-cyan-400 flex items-center justify-center font-black text-zinc-950 shadow-lg shadow-lime-400/20 mb-3 active:scale-95 transition-transform">
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
                
                /* REGISTER FORM */
                <motion.div
                  key="register-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transform: 'translateZ(5px)' }}
                >
                  <div className="mb-8 text-center">
                    <h2 className="text-2xl font-black tracking-tight text-zinc-100 mb-2">Create Workspace</h2>
                    <p className="text-xs text-zinc-400">Join TaskFlow and collaborate with your team.</p>
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

                  <form onSubmit={handleRegisterSubmit} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                          <User size={18} />
                        </div>
                        <motion.input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          whileFocus={{ scale: 1.01, borderColor: "rgba(163, 249, 157, 0.4)" }}
                          className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-lime-400/20 text-sm transition-all"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>

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

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                        Password
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
                          <span>Register Account</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </motion.button>
                  </form>

                  {/* Social Login Section */}
                  <div className="relative flex py-4 items-center">
                    <div className="flex-grow border-t border-zinc-900" />
                    <span className="flex-shrink mx-4 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                      or continue with
                    </span>
                    <div className="flex-grow border-t border-zinc-900" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <motion.button
                      type="button"
                      onClick={handleGoogleLogin}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="h-11 rounded-xl border border-zinc-800 bg-zinc-950/40 flex items-center justify-center gap-2 text-xs font-semibold hover:bg-zinc-900 transition-colors"
                    >
                      <GoogleLogo size={16} className="text-red-400" />
                      <span>Google</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={handleGithubLogin}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="h-11 rounded-xl border border-zinc-800 bg-zinc-950/40 flex items-center justify-center gap-2 text-xs font-semibold hover:bg-zinc-900 transition-colors"
                    >
                      <GithubLogo size={16} />
                      <span>GitHub</span>
                    </motion.button>
                  </div>

                  <p className="mt-8 text-center text-xs text-zinc-500">
                    Already have an account? <Link to="/login" className="text-lime-400 hover:text-lime-300 hover:underline transition-colors font-semibold">Sign In</Link>
                  </p>
                </motion.div>
              ) : (
                
                /* SUCCESS STATE */
                <motion.div
                  key="register-success"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transform: 'translateZ(5px)' }}
                  className="text-center py-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400 mb-6 mx-auto animate-bounce">
                    <PaperPlaneTilt size={30} />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-zinc-100 mb-3">Check Your Inbox</h2>
                  <p className="text-xs text-zinc-400 leading-relaxed px-4 mb-8">
                    We have sent a verification link to <strong className="text-zinc-200">{email}</strong>. Please click the link to activate your account.
                  </p>
                  <Link
                    to="/login"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-zinc-300 text-sm font-semibold hover:bg-zinc-850 active:scale-[0.98] transition-all"
                  >
                    Back to Sign In
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </div>

      </div>

    </div>
  );
}
