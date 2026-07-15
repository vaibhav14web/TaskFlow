import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowRight, Shield, Zap, Mail, Lock, User, KeyRound, Sparkles, Cpu, Activity } from 'lucide-react';
import api from '../api';

const fieldVariants = {
  hidden: { opacity: 0, x: 18, filter: 'blur(4px)' },
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

  // Mouse Parallax coordinates
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    setMousePos({
      x: (clientX - window.innerWidth / 2) / 35,
      y: (clientY - window.innerHeight / 2) / 35,
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

  useEffect(() => {
    if (user) {
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
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
    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
    window.location.href = `${import.meta.env.VITE_API_URL || ''}/api/v1/auth/oauth/google?redirect=${encodeURIComponent(redirect)}`;
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

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        minHeight: '100vh', background: '#07070a',
        display: 'flex', fontFamily: 'Inter, sans-serif',
        overflow: 'hidden', position: 'relative',
        justifyContent: 'center', alignItems: 'center',
        padding: '24px'
      }}
    >
      {/* Background radial highlight follow */}
      <div style={{
        position: 'fixed', left: mousePos.x * 20 - 400 + window.innerWidth / 2, top: mousePos.y * 20 - 400 + window.innerHeight / 2,
        width: 800, height: 800, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.02) 0%, transparent 80%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* ── NAVBAR BRANDING ── */}
      <div
        onClick={() => navigate('/')}
        style={{
          position: 'absolute', top: '24px', left: '24px',
          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
          zIndex: 10
        }}
      >
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Zap size={14} color="#fff" />
        </div>
        <span style={{ fontSize: '14.5px', fontWeight: 850, letterSpacing: '-0.04em', color: '#f5f5f7' }}>
          Task<span style={{ color: '#a855f7' }}>Flow</span>
        </span>
      </div>

      <div style={{
        width: '100%', maxWidth: '980px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '40px', alignItems: 'center', position: 'relative', zIndex: 1
      }}>
        {/* Left Side: Brand Pitch & Metrics */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}
        >
          {/* Outlined Chip */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)',
            borderRadius: '99px', padding: '4px 12px', width: 'fit-content'
          }}>
            <Sparkles size={11} style={{ color: '#818cf8' }} />
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#818cf8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              SECURE ACCESS
            </span>
          </div>

          <h2 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900,
            letterSpacing: '-0.04em', lineHeight: 1.1, color: '#f5f5f7', margin: 0
          }}>
            Ship faster, <br />
            <span style={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', display: 'inline-block'
            }}>
              together.
            </span>
          </h2>

          <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: '380px', margin: 0 }}>
            Real-time task management, beautiful kanban boards, and team analytics — all in one workspace.
          </p>

          {/* Micro Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '380px' }}>
            {/* Latency card */}
            <div style={{
              background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', fontSize: '11px', fontFamily: 'monospace'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)' }}>
                <Cpu size={12} style={{ color: '#818cf8' }} />
                <span>Instant Response</span>
              </div>
              <div style={{ fontWeight: 'bold' }}>
                <span style={{ color: 'rgba(255,255,255,0.25)' }}>LATENCY:</span> <span style={{ color: '#818cf8' }}>12ms</span>
              </div>
            </div>

            {/* Sync card */}
            <div style={{
              background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', fontSize: '11px', fontFamily: 'monospace'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)' }}>
                <Activity size={12} style={{ color: '#a855f7' }} />
                <span>Real-time Sync</span>
              </div>
              <div style={{ fontWeight: 'bold' }}>
                <span style={{ color: 'rgba(255,255,255,0.25)' }}>REPL:</span> <span style={{ color: '#a855f7' }}>realtime</span>
              </div>
            </div>

            {/* Privacy card */}
            <div style={{
              background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', fontSize: '11px', fontFamily: 'monospace'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)' }}>
                <Shield size={12} style={{ color: '#10b981' }} />
                <span>E2E Security</span>
              </div>
              <div style={{ fontWeight: 'bold' }}>
                <span style={{ color: 'rgba(255,255,255,0.25)' }}>KEY:</span> <span style={{ color: '#10b981' }}>client-side</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Glassmorphic Auth Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          onMouseMove={handleCardMouseMove}
          style={{
            background: `radial-gradient(300px circle at ${cardCoords.x}px ${cardCoords.y}px, rgba(255,255,255,0.025), transparent 75%), rgba(255,255,255,0.012)`,
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '20px', padding: '36px 32px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
            position: 'relative', overflow: 'hidden'
          }}
        >
          {/* Top accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
            background: 'linear-gradient(90deg, #6366f1, #a855f7)'
          }} />

          {/* Heading */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#f5f5f7', margin: '0 0 6px 0' }}>
              {heading}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.38)', margin: 0 }}>
              {subheading}
            </p>
          </div>

          {/* Toggle buttons (login/register) */}
          {(mode === 'login' || mode === 'register') && (
            <div style={{
              display: 'flex', background: 'rgba(0,0,0,0.2)',
              borderRadius: '10px', padding: '3px', marginBottom: '20px',
              border: '1px solid rgba(255,255,255,0.04)'
            }}>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  flex: 1, border: 'none', borderRadius: '7px', padding: '7px 0',
                  cursor: 'pointer', fontWeight: 600, fontSize: '12.5px', fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  background: mode === 'login' ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'transparent',
                  color: mode === 'login' ? '#fff' : 'rgba(255,255,255,0.35)',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{
                  flex: 1, border: 'none', borderRadius: '7px', padding: '7px 0',
                  cursor: 'pointer', fontWeight: 600, fontSize: '12.5px', fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  background: mode === 'register' ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'transparent',
                  color: mode === 'register' ? '#fff' : 'rgba(255,255,255,0.35)',
                }}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Full Name (register only) */}
            <AnimatePresence>
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}
                >
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Full Name</label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '9px', padding: '10px 12px'
                  }}>
                    <User size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      placeholder="John Doe"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '13px' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Address */}
            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Email Address</label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '9px', padding: '10px 12px'
                }}>
                  <Mail size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>
            )}

            {/* Password */}
            {(mode === 'login' || mode === 'register') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Password</label>
                  {mode === 'login' && (
                    <span
                      onClick={() => setMode('forgot')}
                      style={{ fontSize: '11px', color: '#a855f7', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Forgot password?
                    </span>
                  )}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '9px', padding: '10px 12px'
                }}>
                  <Lock size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPass(e.target.value)}
                    required
                    minLength={8}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '13px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', padding: 0 }}
                  >
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            )}

            {/* 2FA input */}
            {mode === '2fa' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Verification Code</label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '9px', padding: '10px 12px'
                }}>
                  <KeyRound size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    placeholder="6-digit code or backup code"
                    value={twoFactorCode}
                    onChange={e => setTwoFactorCode(e.target.value)}
                    required
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '13px', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                  />
                </div>
              </div>
            )}

            {/* Reset confirmation */}
            {mode === 'confirm-reset' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Reset Token</label>
                  <input
                    placeholder="Paste token from email"
                    value={resetToken}
                    onChange={e => setResetToken(e.target.value)}
                    required
                    style={{
                      background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '9px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>New Password</label>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '9px', padding: '10px 12px'
                  }}>
                    <Lock size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '13px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', padding: 0 }}
                    >
                      {showNewPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02, boxShadow: '0 4px 18px rgba(99,102,241,0.3)' }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%', padding: '11px', border: 'none', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff',
                fontWeight: 700, fontSize: '13px', cursor: 'pointer', marginTop: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              {loading ? 'Processing…' : (
                <>
                  {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : mode === '2fa' ? 'Verify Code' : 'Confirm Reset'}
                  <ArrowRight size={13} />
                </>
              )}
            </motion.button>

            {/* Back button */}
            {(mode === 'forgot' || mode === 'confirm-reset' || mode === '2fa') && (
              <span
                onClick={() => setMode('login')}
                style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', cursor: 'pointer', marginTop: '4px', display: 'inline-block' }}
              >
                ← Back to Sign In
              </span>
            )}
          </form>

          {/* Google Sign In Option */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 16px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
              </div>

              <motion.button
                onClick={handleGoogleSignInClick}
                whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.03)' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%', padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </motion.button>
            </>
          )}

          <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '10.5px', color: 'rgba(255,255,255,0.18)', margin: '24px 0 0 0' }}>
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
