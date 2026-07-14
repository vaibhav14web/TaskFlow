import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowRight, Shield, Zap, Users, CheckCircle, Sparkles, Mail, Lock, User, KeyRound } from 'lucide-react';
import api from '../api';

/* ── Keycap Badge ──────────────────────────────────── */
function Key({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      whileHover={{ y: -2, scale: 1.05, borderColor: 'rgba(168,85,247,0.3)', color: '#a855f7' }}
      whileTap={{ scale: 0.95 }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '1px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: 600,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
        color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', lineHeight: 1.6,
        boxShadow: '0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.2)',
        userSelect: 'none',
        cursor: 'pointer',
        transition: 'color 0.2s, border-color 0.2s',
      }}
    >
      {children}
    </motion.span>
  );
}

/* ── Cyber floating network node lines ──────────────── */
function GridLineNetwork() {
  return null;
}

/* ── Floating Cyber Particle ────────────────────────── */
function Particle({ x, y, size, delay, duration, color = 'rgba(168,85,247,0.6)' }: {
  x: number; y: number; size: number; delay: number; duration: number; color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: [0, 0.7, 0.9, 0.3, 0],
        y: [0, -60, -120, -180],
        x: [0, size * 5, size * -4, size * 6],
        scale: [0.5, 1.2, 0.8, 0.5],
      }}
      transition={{
        delay,
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size * 3}px ${color}`,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

/* ── Shimmer Button ────────────────────────────────── */
function ShimmerButton({
  disabled, children
}: {
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="submit"
      disabled={disabled}
      whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgba(168,85,247,0.5), 0 0 0 1px rgba(168,85,247,0.4)' }}
      whileTap={{ scale: 0.97 }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        padding: '13px 16px',
        border: 'none',
        borderRadius: 12,
        cursor: 'pointer',
        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #4f46e5 100%)',
        backgroundSize: '200% auto',
        color: '#fff',
        fontWeight: 700,
        fontSize: '14px',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
        opacity: disabled ? 0.7 : 1,
        transition: 'opacity 0.2s, box-shadow 0.2s',
      }}
      animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
    >
      <motion.div
        animate={{ x: ['-200%', '200%'] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
          transform: 'skewX(-25deg)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </motion.button>
  );
}

const fieldVariants = {
  hidden: { opacity: 0, x: 20, filter: 'blur(4px)' },
  show: (i: number) => ({
    opacity: 1, x: 0, filter: 'blur(0px)',
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] as any }
  }),
};

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'confirm-reset' | '2fa'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPass] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoad] = useState(false);
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  // 3D Parallax Tilt state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, rotateX: 0, rotateY: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const xOffset = (clientX - window.innerWidth / 2) / 30;
    const yOffset = (clientY - window.innerHeight / 2) / 30;
    setMousePos({
      x: xOffset,
      y: yOffset,
      rotateX: -yOffset * 0.4,
      rotateY: xOffset * 0.4,
    });
  };

  // Coordinates for the form card spotlight
  const [cardCoords, setCardCoords] = useState({ x: 0, y: 0 });
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCardCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Coordinates for the Password input spotlight
  const [pwCoords, setPwCoords] = useState({ x: 0, y: 0 });
  const handlePasswordMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPwCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    if (user) {
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
      navigate(redirect);
    }
  }, [user, navigate]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      const verify = async () => {
        try {
          await api.post('/auth/verify-email', { token });
          toast.success('Email verified successfully! You can now log in. 🎉');
        } catch (err: any) {
          toast.error(err?.response?.data?.error?.message || 'Email verification failed.');
        } finally {
          navigate('/auth', { replace: true });
        }
      };
      verify();
    }
  }, [navigate]);

  useEffect(() => {
    const errorMsg = new URLSearchParams(window.location.search).get('error');
    if (errorMsg) {
      toast.error(`Authentication error: ${errorMsg}`);
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '';
      navigate('/auth' + (redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''), { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const userId = params.get('user_id');

    if (accessToken && refreshToken && userId && !user) {
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      window.location.hash = '';
      toast.success('Logged in with Google! 🎉');
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
      navigate(redirect, { replace: true });
    }
  }, [navigate, user]);

  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loginTicket, setLoginTicket] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoad(true);
    try {
      if (mode === 'login') {
        const loginRes = await login(email, password);
        if (loginRes?.twoFactorRequired) {
          setLoginTicket(loginRes.loginTicket);
          setMode('2fa');
          toast.success('Two-factor verification required 🔒');
          return;
        }
        toast.success('Welcome back! 🎉');
        const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
        navigate(redirect);
      } else if (mode === '2fa') {
        const res = await api.post('/auth/2fa/login-verify', { code: twoFactorCode, loginTicket });
        if (res.data?.data?.access_token) {
          localStorage.setItem('token', res.data.data.access_token);
          localStorage.setItem('refreshToken', res.data.data.refresh_token);
          toast.success('Logged in successfully! 🚀');
          window.location.reload();
        }
      } else if (mode === 'register') {
        await register(name, email, password);
        if (!localStorage.getItem('token')) {
          toast.success('Account created! Check your email to verify before logging in. 📧');
          setMode('login');
        } else {
          toast.success('Account created! 🚀');
          const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
          navigate(redirect);
        }
      } else if (mode === 'forgot') {
        await api.post('/auth/password-reset/request', { email });
        toast.success('Reset link sent — check your email 📧');
        setMode('confirm-reset');
      } else if (mode === 'confirm-reset') {
        await api.post('/auth/password-reset/confirm', { token: resetToken, new_password: newPassword });
        toast.success('Password updated! Please login. 🎉');
        setMode('login');
        setResetToken(''); setNewPassword('');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Something went wrong');
    } finally {
      setLoad(false);
    }
  };

  const handleGoogleSignInClick = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || ''}/api/v1/auth/oauth/google`;
  };

  const heading = mode === 'login' ? 'Welcome back'
    : mode === 'register' ? 'Create an account'
    : mode === 'forgot' ? 'Reset password'
    : mode === '2fa' ? 'Two-factor auth'
    : 'Set new password';

  const subheading = mode === 'login' ? 'Sign in to continue to your workspace'
    : mode === 'register' ? 'Start for free — no credit card needed'
    : mode === 'forgot' ? "We'll send a reset link to your email"
    : mode === '2fa' ? 'Enter the 6-digit code from your authenticator'
    : 'Choose a strong new password';

  const demoTasks = [
    { title: 'Design system tokens v2', tag: 'Design',    pct: 85,  color: '#a855f7', icon: '🎨' },
    { title: 'OAuth 2.0 integration',   tag: 'Backend',   pct: 100, color: '#22c55e', icon: '⚙️' },
    { title: 'Write E2E test suite',    tag: 'Testing',   pct: 38,  color: '#6366f1', icon: '🧪' },
    { title: 'Launch v2 blog post',     tag: 'Marketing', pct: 60,  color: '#f59e0b', icon: '✍️' },
  ];

  const particles = useMemo(() =>
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      x: 5 + (i * 27.3) % 90,
      y: 10 + (i * 35.7) % 80,
      size: 2 + (i % 4),
      delay: (i * 0.3) % 5,
      duration: 3.5 + (i % 3),
      color: i % 2 === 0 ? 'rgba(168,85,247,0.55)' : 'rgba(99,102,241,0.55)',
    })), []);

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        minHeight: '100vh',
        background: '#0b0b0e',
        display: 'flex',
        fontFamily: "'Inter', -apple-system, sans-serif",
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── Scanning Grid lines across screen ── */}
      <GridLineNetwork />

      {/* ══════════════════════════════════════════
          LEFT BRAND PANEL
      ══════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        style={{
          flex: '0 0 52%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '44px 52px',
          overflow: 'hidden',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* ── Dynamic Breathing glow orbs ── */}
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.14, 0.22, 0.14], x: [0, 20, -15, 0], y: [0, -15, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '-22%', left: '-12%',
            width: 720, height: 720, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.55) 0%, transparent 65%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.10, 0.17, 0.10], x: [0, -15, 20, 0], y: [0, 20, -15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          style={{
            position: 'absolute', bottom: '-18%', right: '-8%',
            width: 600, height: 600, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.55) 0%, transparent 65%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />

        {/* ── Floating particles ── */}
        {particles.map(p => <Particle key={p.id} {...p} />)}

        {/* ── Interactive parallax dot grid ── */}
        <motion.div
          animate={{ x: mousePos.x, y: mousePos.y }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
          style={{
            position: 'absolute', inset: -30,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1.2px, transparent 1.2px)',
            backgroundSize: '28px 28px',
            pointerEvents: 'none',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          }}
        />

        {/* ── Logo ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.div
              animate={{ boxShadow: ['0 4px 20px rgba(168,85,247,0.38)', '0 4px 32px rgba(168,85,247,0.6)', '0 4px 20px rgba(168,85,247,0.38)'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Zap size={16} color="white" />
            </motion.div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#f5f5f7' }}>
              Task<span style={{ color: '#a855f7' }}>Flow</span>
            </span>
          </div>
        </motion.div>

        {/* ── Hero content ── */}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 36 }}>

          {/* Headline */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.22)',
                borderRadius: 99, padding: '4px 12px 4px 8px', marginBottom: 20,
              }}
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles size={12} color="#a855f7" />
              </motion.div>
              <span style={{ fontSize: '11px', color: '#c084fc', fontWeight: 600 }}>Trusted by 2,400+ teams</span>
            </motion.div>

            {/* Headline — word-by-word reveal */}
            <div style={{ overflow: 'hidden' }}>
              {['Ship faster,', 'together.'].map((line, li) => (
                <div key={li} style={{ overflow: 'hidden' }}>
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.3 + li * 0.12, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      fontSize: 'clamp(1.9rem, 3vw, 2.75rem)',
                      fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.08,
                      color: li === 0 ? '#f5f5f7' : 'transparent',
                      background: li === 1 ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 60%)' : undefined,
                      WebkitBackgroundClip: li === 1 ? 'text' : undefined,
                      WebkitTextFillColor: li === 1 ? 'transparent' : undefined,
                      backgroundClip: li === 1 ? 'text' : undefined,
                    }}
                  >{line}</motion.div>
                </div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6 }}
              style={{ fontSize: '14px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, margin: '16px 0 0', maxWidth: 380 }}
            >
              Real-time task management, beautiful kanban boards, and team analytics — all in one workspace.
            </motion.p>
          </div>

          {/* Floating task cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxWidth: 430 }}>
            {demoTasks.map((task, i) => (
              <motion.div
                key={task.title}
                initial={{ opacity: 0, x: -22 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Float loop */}
                <motion.div
                  animate={{ y: [0, -(4 + i * 1.5), 0] }}
                  transition={{
                    duration: 3.5 + i * 0.7,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.6,
                  }}
                  whileHover={{ scale: 1.02, x: 6, transition: { duration: 0.18 } }}
                  style={{
                    background: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 11, padding: '11px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
                    backdropFilter: 'blur(12px)',
                    cursor: 'default',
                  }}
                >
                  <motion.div
                    animate={{ rotate: [0, 5, -3, 0] }}
                    transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
                    style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: `${task.color}15`,
                      border: `1px solid ${task.color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '15px', lineHeight: 1,
                    }}
                  >{task.icon}</motion.div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                      <span style={{
                        fontSize: '12px', fontWeight: 600, color: '#e5e5e7',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '62%',
                      }}>{task.title}</span>
                      <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                        background: `${task.color}18`, color: task.color,
                        border: `1px solid ${task.color}28`, flexShrink: 0, marginLeft: 8,
                      }}>{task.tag}</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${task.pct}%` }}
                        transition={{ delay: 0.6 + i * 0.12, duration: 0.85, ease: 'easeOut' }}
                        style={{ height: '100%', background: task.color, borderRadius: 99, opacity: 0.85 }}
                      />
                    </div>
                  </div>

                  <span style={{
                    fontSize: '11px', fontWeight: 700, flexShrink: 0,
                    color: task.pct === 100 ? '#22c55e' : 'rgba(255,255,255,0.28)',
                  }}>
                    {task.pct === 100 ? (
                      <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.5, delay: 0.9 }}>✓</motion.span>
                    ) : `${task.pct}%`}
                  </span>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center' }}
        >
          {[
            { icon: Shield, label: '256-bit encrypted' },
            { icon: CheckCircle, label: 'SOC 2 compliant' },
            { icon: Users, label: '2,400+ teams' },
          ].map(({ icon: Icon, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.08, duration: 0.4 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon size={12} color="rgba(255,255,255,0.22)" />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)', fontWeight: 500 }}>{label}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>


      {/* ══════════════════════════════════════════
          RIGHT FORM PANEL
      ══════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          flex: '0 0 48%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 48px',
          position: 'relative',
          overflowY: 'auto',
        }}
      >
        {/* Floating background glows — right panel */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.10, 0.05], x: [0, -10, 10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '15%', right: '-5%',
            width: 350, height: 350, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 0,
            filter: 'blur(40px)',
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.04, 0.08, 0.04], x: [0, 10, -10, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          style={{
            position: 'absolute', bottom: '10%', left: '0%',
            width: 300, height: 300, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.6) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 0,
            filter: 'blur(40px)',
          }}
        />

        {/* Interactive parallax dot grid on form side */}
        <motion.div
          animate={{ x: -mousePos.x * 0.8, y: -mousePos.y * 0.8 }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
          style={{
            position: 'absolute', inset: -30, zIndex: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1.2px, transparent 1.2px)',
            backgroundSize: '28px 28px',
            pointerEvents: 'none',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 18, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}
          >
            {/* Glass card wrapper with 3D Rotation Tilt effect + Spotlight Glow */}
            <motion.div
              onMouseMove={handleCardMouseMove}
              style={{
                transformStyle: 'preserve-3d',
                rotateX: mousePos.rotateX,
                rotateY: mousePos.rotateY,
                transformPerspective: 1000,
                background: `radial-gradient(400px circle at ${cardCoords.x}px ${cardCoords.y}px, rgba(168,85,247,0.075), transparent 70%), rgba(255,255,255,0.025)`,
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: '32px 28px',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 0 0 1px rgba(168,85,247,0.06), 0 32px 64px rgba(0,0,0,0.5), 0 0 80px rgba(99,102,241,0.06)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'box-shadow 0.2s',
              }}
              whileHover={{ boxShadow: '0 0 0 1px rgba(168,85,247,0.15), 0 40px 80px rgba(0,0,0,0.65), 0 0 90px rgba(99,102,241,0.12)' }}
            >
              {/* Top gradient line */}
              <div style={{
                position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5), rgba(99,102,241,0.5), transparent)',
              }} />
              {/* Corner accent — top right */}
              <div style={{
                position: 'absolute', top: -1, right: -1,
                width: 80, height: 80,
                background: 'radial-gradient(circle at top right, rgba(168,85,247,0.12) 0%, transparent 70%)',
                borderRadius: '0 20px 0 0',
                pointerEvents: 'none',
              }} />
              {/* Corner accent — bottom left */}
              <div style={{
                position: 'absolute', bottom: -1, left: -1,
                width: 80, height: 80,
                background: 'radial-gradient(circle at bottom left, rgba(99,102,241,0.10) 0%, transparent 70%)',
                borderRadius: '0 0 0 20px',
                pointerEvents: 'none',
              }} />

              {/* Heading */}
              <div style={{ marginBottom: 24 }}>
                <h2 style={{
                  fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em',
                  color: '#f5f5f7', margin: '0 0 4px',
                }}>{heading}</h2>
                {/* Animated accent underline */}
                <motion.div
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    height: 2, width: 40, borderRadius: 99,
                    background: 'linear-gradient(90deg, #a855f7, #6366f1)',
                    marginBottom: 8,
                    transformOrigin: 'left',
                  }}
                />
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.5 }}>{subheading}</p>
              </div>

              {/* Sign In / Sign Up toggle */}
              {(mode === 'login' || mode === 'register') && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.35 }}
                  style={{
                    display: 'flex',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: 10, padding: 3, marginBottom: 20,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {(['login', 'register'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setMode(m)} style={{
                      flex: 1, border: 'none', borderRadius: 8, padding: '8px 0',
                      cursor: 'pointer', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit',
                      transition: 'all 0.22s',
                      background: mode === m ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'transparent',
                      color: mode === m ? '#fff' : 'rgba(255,255,255,0.32)',
                      boxShadow: mode === m ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
                    }}>
                      {m === 'login' ? 'Sign In' : 'Sign Up'}
                    </button>
                  ))}
                </motion.div>
              )}

              {/* Google OAuth — enhanced */}
              {(mode === 'login' || mode === 'register') && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.35 }}
                >
                  <motion.button
                    type="button"
                    whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.15)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGoogleSignInClick}
                    style={{
                      width: '100%', padding: '11px', marginBottom: 16,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 10,
                      color: 'rgba(255,255,255,0.75)', fontWeight: 600, fontSize: '13px',
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      transition: 'all 0.2s',
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 10,
                      background: 'linear-gradient(135deg, rgba(66,133,244,0.06), rgba(234,67,53,0.04), rgba(52,168,83,0.04), rgba(251,188,5,0.04))',
                      pointerEvents: 'none',
                    }} />
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </motion.button>
                </motion.div>
              )}

              {/* OR divider */}
              {(mode === 'login' || mode === 'register') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}
                >
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.2))', transformOrigin: 'left' }}
                  />
                  <span style={{
                    fontSize: '10px', color: 'rgba(255,255,255,0.2)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '2px 8px', borderRadius: 99,
                  }}>or</span>
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(99,102,241,0.2), transparent)', transformOrigin: 'right' }}
                  />
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>

                {/* Name (register only) */}
                <AnimatePresence>
                  {mode === 'register' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}
                    >
                      <RaycastInput
                        label="Full Name" type="text" placeholder="John Doe"
                        value={name} onChange={e => setName(e.target.value)}
                        prefixIcon={<User size={14} />}
                        focused={focusedField === 'name'}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        required index={2}
                        autoComplete="name"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email */}
                {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
                  <RaycastInput
                    label="Email" type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    prefixIcon={<Mail size={14} />}
                    focused={focusedField === 'email'}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    required index={3}
                    autoComplete="username"
                  />
                )}

                {/* Password */}
                {(mode === 'login' || mode === 'register') && (
                  <motion.div
                    custom={4} variants={fieldVariants} initial="hidden" animate="show"
                    style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                        Password
                      </label>
                      {mode === 'login' && (
                        <motion.button
                          type="button"
                          whileHover={{ color: '#c084fc' }}
                          onClick={() => setMode('forgot')}
                          style={{ background: 'none', border: 'none', color: '#a855f7', fontSize: '11px', cursor: 'pointer', fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
                          Forgot password?
                        </motion.button>
                      )}
                    </div>
                    <motion.div
                      onMouseMove={handlePasswordMouseMove}
                      whileHover={{ borderColor: 'rgba(168,85,247,0.2)' }}
                      animate={focusedField === 'password'
                        ? { boxShadow: '0 0 0 3px rgba(168,85,247,0.14)', borderColor: 'rgba(168,85,247,0.55)' }
                        : { boxShadow: '0 0 0 0px rgba(168,85,247,0)', borderColor: 'rgba(255,255,255,0.07)' }}
                      transition={{ duration: 0.2 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: `radial-gradient(120px circle at ${pwCoords.x}px ${pwCoords.y}px, rgba(168,85,247,0.12), transparent 70%), rgba(255,255,255,0.03)`,
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 9, padding: '10px 12px',
                      }}
                    >
                      <Lock size={14} color={focusedField === 'password' ? 'rgba(168,85,247,0.7)' : 'rgba(255,255,255,0.2)'}
                        style={{ flexShrink: 0, transition: 'color 0.2s' }}
                      />
                      <input
                        type={showPw ? 'text' : 'password'} placeholder="••••••••"
                        value={password} onChange={e => setPass(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        required minLength={8}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '14px', fontFamily: 'inherit' }}
                      />
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        onClick={() => setShowPw(!showPw)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', display: 'flex', padding: 0 }}>
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </motion.button>
                    </motion.div>
                  </motion.div>
                )}

                {/* 2FA */}
                {mode === '2fa' && (
                  <RaycastInput
                    label="2FA Code / Backup Code" type="text" placeholder="123456 or recovery code"
                    value={twoFactorCode} onChange={e => setTwoFactorCode(e.target.value)}
                    prefixIcon={<KeyRound size={14} />}
                    focused={focusedField === '2fa'}
                    onFocus={() => setFocusedField('2fa')}
                    onBlur={() => setFocusedField(null)}
                    required index={3}
                  />
                )}

                {/* Reset */}
                {mode === 'confirm-reset' && (
                  <>
                    <RaycastInput
                      label="Reset Token" type="text" placeholder="Paste token from email…"
                      value={resetToken} onChange={e => setResetToken(e.target.value)}
                      focused={focusedField === 'token'}
                      onFocus={() => setFocusedField('token')}
                      onBlur={() => setFocusedField(null)}
                      required index={3}
                    />
                    <RaycastInput
                      label="New Password" type={showNewPw ? 'text' : 'password'} placeholder="••••••••"
                      value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      prefixIcon={<Lock size={14} />}
                      focused={focusedField === 'newpw'}
                      onFocus={() => setFocusedField('newpw')}
                      onBlur={() => setFocusedField(null)}
                      required index={4}
                      suffix={
                        <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={() => setShowNewPw(!showNewPw)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', padding: 0 }}>
                          {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </motion.button>
                      }
                    />
                  </>
                )}

                {/* Submit button with shimmer */}
                <motion.div
                  custom={5} variants={fieldVariants} initial="hidden" animate="show"
                  style={{ marginTop: 6 }}
                >
                  <ShimmerButton disabled={loading}>
                    {loading ? (
                      <span style={{ display: 'inline-flex', gap: 3 }}>
                        {[0,1,2].map(i => (
                          <motion.span key={i}
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
                            style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', display: 'inline-block' }}
                          />
                        ))}
                      </span>
                    ) : (
                      <>
                        {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : mode === '2fa' ? 'Verify Code' : 'Confirm Reset'}
                        <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
                          <ArrowRight size={15} />
                        </motion.span>
                      </>
                    )}
                  </ShimmerButton>
                </motion.div>

                {(mode === 'forgot' || mode === 'confirm-reset' || mode === '2fa') && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    style={{ textAlign: 'center' }}
                  >
                    <button type="button" onClick={() => setMode('login')}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '12px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                      ← Back to Sign In
                    </button>
                  </motion.div>
                )}
              </form>
            </motion.div>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              style={{ marginTop: 18, textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.18)', lineHeight: 1.6 }}
            >
              By continuing, you agree to our{' '}
              <span style={{ color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>Terms</span>{' '}and{' '}
              <span style={{ color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>Privacy Policy</span>
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ── Reusable Input Row ────────────────────────────── */
interface RaycastInputProps {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  required?: boolean;
  hint?: React.ReactNode;
  suffix?: React.ReactNode;
  prefixIcon?: React.ReactNode;
  index: number;
  autoComplete?: string;
}

function RaycastInput({ label, type, placeholder, value, onChange, focused, onFocus, onBlur, required, hint, suffix, prefixIcon, index, autoComplete }: RaycastInputProps) {
  const [inputCoords, setInputCoords] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setInputCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };
  return (
    <motion.div
      custom={index} variants={fieldVariants} initial="hidden" animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          {label}
        </label>
        {hint && <span style={{ opacity: 0.5 }}>{hint}</span>}
      </div>
      <motion.div
        onMouseMove={handleMouseMove}
        whileHover={{ borderColor: 'rgba(168,85,247,0.2)' }}
        animate={focused
          ? { boxShadow: '0 0 0 3px rgba(168,85,247,0.14)', borderColor: 'rgba(168,85,247,0.55)' }
          : { boxShadow: '0 0 0 0px rgba(168,85,247,0)', borderColor: 'rgba(255,255,255,0.07)' }}
        transition={{ duration: 0.2 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: `radial-gradient(120px circle at ${inputCoords.x}px ${inputCoords.y}px, rgba(168,85,247,0.12), transparent 70%), rgba(255,255,255,0.03)`,
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '9px', padding: '10px 12px',
        }}
      >
        {prefixIcon && (
          <span style={{
            display: 'flex', flexShrink: 0,
            color: focused ? 'rgba(168,85,247,0.75)' : 'rgba(255,255,255,0.2)',
            transition: 'color 0.2s',
          }}>{prefixIcon}</span>
        )}
        <input
          type={type} placeholder={placeholder} value={value}
          onChange={onChange} onFocus={onFocus} onBlur={onBlur} required={required}
          autoComplete={autoComplete}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '14px', fontFamily: 'inherit' }}
        />
        {suffix && <span style={{ display: 'flex', alignItems: 'center' }}>{suffix}</span>}
      </motion.div>
    </motion.div>
  );
}
