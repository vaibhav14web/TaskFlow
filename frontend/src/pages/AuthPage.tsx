import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import api from '../api';

/* ── Keycap Badge ──────────────────────────────────── */
function Key({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '1px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: 600,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
      color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', lineHeight: 1.6,
      boxShadow: '0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.2)',
      userSelect: 'none',
    }}>
      {children}
    </span>
  );
}

/* ── TaskFlow Logo ─────────────────────────────────── */
function TFLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="authLogoG" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      {/* Square base with rounded corners */}
      <rect x="1" y="1" width="38" height="38" rx="10" fill="url(#authLogoG)" />
      {/* T bar */}
      <rect x="8" y="10" width="24" height="4" rx="2" fill="white" />
      {/* T stem */}
      <rect x="17" y="14" width="6" height="10" rx="1" fill="white" />
      {/* F horizontal bars */}
      <rect x="9" y="27" width="14" height="3.5" rx="1.5" fill="white" opacity="0.9" />
      <rect x="9" y="24" width="10" height="3" rx="1.5" fill="white" opacity="0.6" />
    </svg>
  );
}

const fieldVariants = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] }
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

  useEffect(() => {
    if (user) {
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
      navigate(redirect);
    }
  }, [user, navigate]);

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
        // In dev/test: register() auto-logs in (verificationToken returned), so
        // `user` will be set and the useEffect will navigate away automatically.
        // In production: register() resolves without logging in — show the user
        // a message to check their email instead of navigating to / (which would
        // immediately bounce them back to /auth since they aren't logged in yet).
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
    // Redirect to backend OAuth endpoint which will redirect to Google
    window.location.href = `${import.meta.env.VITE_API_URL || ''}/api/v1/auth/oauth/google`;
  };


  const subtitle = mode === 'login' ? 'Sign in to your workspace'
    : mode === 'register' ? 'Create your free account'
    : mode === 'forgot' ? 'Reset your password'
    : 'Set your new password';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0b0e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Dot grid background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
      }} />

      {/* Subtle gradient halo behind card */}
      <div style={{
        position: 'fixed', zIndex: 0, pointerEvents: 'none',
        width: '600px', height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
      }} />

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: '400px',
          margin: '0 var(--space-lg)',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '32px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 32px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Top chrome strip */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
        }} />

        {/* Logo & Title */}
        <motion.div
          custom={0} variants={fieldVariants} initial="hidden" animate="show"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px', gap: '14px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TFLogo size={38} />
            <span style={{
              fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#f5f5f7',
            }}>
              Task<span style={{ color: '#a855f7' }}>Flow</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{subtitle}</span>
            {(mode === 'login' || mode === 'register') && (
              <Key>⌘ K</Key>
            )}
          </div>
        </motion.div>

        {/* Mode toggle */}
        <AnimatePresence mode="wait">
          {(mode === 'login' || mode === 'register') && (
            <motion.div
              custom={1} variants={fieldVariants} initial="hidden" animate="show"
              style={{
                display: 'flex', background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px', padding: '3px', marginBottom: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {(['login', 'register'] as const).map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1, border: 'none', borderRadius: '8px', padding: '7px 0',
                    cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                    transition: 'all 0.2s',
                    background: mode === m
                      ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                      : 'transparent',
                    color: mode === m ? '#fff' : 'rgba(255,255,255,0.35)',
                    boxShadow: mode === m ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                  }}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Name field for register */}
          <AnimatePresence>
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <RaycastInput
                  label="Full Name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  hint={<Key>tab</Key>}
                  focused={focusedField === 'name'}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  required
                  index={2}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email */}
          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <RaycastInput
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              hint={<Key>tab</Key>}
              focused={focusedField === 'email'}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              required
              index={3}
            />
          )}

          {/* Password */}
          {(mode === 'login' || mode === 'register') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    style={{ background: 'none', border: 'none', color: '#a855f7', fontSize: '11px', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${focusedField === 'password' ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '9px', padding: '10px 12px',
                transition: 'border-color 0.2s',
                boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(168,85,247,0.1)' : 'none',
              }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPass(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  required
                  minLength={8}
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: '#f5f5f7', fontSize: '14px', fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', padding: 0 }}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <Key>↵</Key>
                </div>
              </div>
            </div>
          )}

          {/* Two-Factor Authentication Code */}
          {mode === '2fa' && (
            <RaycastInput
              label="2FA Verification Code / Backup Code"
              type="text"
              placeholder="123456 or recovery code"
              value={twoFactorCode}
              onChange={e => setTwoFactorCode(e.target.value)}
              hint={<Key>tab</Key>}
              focused={focusedField === '2fa'}
              onFocus={() => setFocusedField('2fa')}
              onBlur={() => setFocusedField(null)}
              required
              index={3}
            />
          )}

          {/* Reset token + new password */}
          {mode === 'confirm-reset' && (
            <>
              <RaycastInput
                label="Reset Token"
                type="text"
                placeholder="Paste token from email…"
                value={resetToken}
                onChange={e => setResetToken(e.target.value)}
                focused={focusedField === 'token'}
                onFocus={() => setFocusedField('token')}
                onBlur={() => setFocusedField(null)}
                required
                index={3}
              />
              <RaycastInput
                label="New Password"
                type={showNewPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                focused={focusedField === 'newpw'}
                onFocus={() => setFocusedField('newpw')}
                onBlur={() => setFocusedField(null)}
                required
                index={4}
                suffix={
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', padding: 0 }}>
                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />
            </>
          )}

          {/* Submit button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01, boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', padding: '11px 16px', marginTop: '6px',
              border: 'none', borderRadius: '9px', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: '#fff', fontWeight: 700, fontSize: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 16px rgba(99,102,241,0.25)',
              transition: 'opacity 0.2s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', gap: '3px' }}>
                {[0,1,2].map(i => (
                  <motion.span key={i} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i*0.2 }}
                    style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                ))}
              </span>
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : mode === '2fa' ? 'Verify Code' : 'Confirm Reset'}
                <ArrowRight size={15} />
                <Key>↵</Key>
              </>
            )}
          </motion.button>

          {(mode === 'forgot' || mode === 'confirm-reset' || mode === '2fa') && (
            <div style={{ textAlign: 'center' }}>
              <button type="button" onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                ← Back to Sign In
              </button>
            </div>
          )}
        </form>

        {/* Divider + Google */}
        {(mode === 'login' || mode === 'register') && (
          <motion.div custom={6} variants={fieldVariants} initial="hidden" animate="show">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 16px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <motion.button
              type="button"
              whileHover={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleSignInClick}
              style={{
                width: '100%', padding: '10px', background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)', borderRadius: '9px',
                color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                fontFamily: 'inherit', transition: 'all 0.2s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ opacity: 0.5 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </motion.button>
          </motion.div>
        )}

        {/* Footer hint */}
        <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Key>esc</Key>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.18)' }}>dismiss</span>
        </div>
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
  index: number;
}

function RaycastInput({ label, type, placeholder, value, onChange, focused, onFocus, onBlur, required, hint, suffix, index }: RaycastInputProps) {
  return (
    <motion.div
      custom={index}
      variants={fieldVariants}
      initial="hidden"
      animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </label>
        {hint && <span style={{ opacity: 0.6 }}>{hint}</span>}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${focused ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '9px', padding: '10px 12px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: focused ? '0 0 0 3px rgba(168,85,247,0.1)' : 'none',
      }}>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          required={required}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: '#f5f5f7', fontSize: '14px', fontFamily: 'inherit',
          }}
        />
        {suffix && <span style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>{suffix}</span>}
      </div>
    </motion.div>
  );
}
