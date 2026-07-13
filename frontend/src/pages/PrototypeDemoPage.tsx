import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Clock, MessageSquare, Paperclip, BarChart2, Home, Layers, Settings, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// ----------------------------------------------------
// PROTOTYPE 1: Fluid Kanban Card (Hover & grab tilt)
// ----------------------------------------------------
interface CardProps {
  title: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  commentsCount: number;
  attachmentsCount: number;
}

const PremiumKanbanCard: React.FC<CardProps> = ({ title, priority, dueDate, commentsCount, attachmentsCount }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-60, 60], [15, -15]);
  const rotateY = useTransform(x, [-60, 60], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const getPriorityColor = () => {
    if (priority === 'high') return '#ef4444';
    if (priority === 'medium') return '#f59e0b';
    return '#10b981';
  };

  return (
    <motion.div
      style={{
        rotateX, rotateY,
        transformStyle: 'preserve-3d' as any,
        perspective: 800,
        padding: '1.25rem',
        borderRadius: '12px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'grab',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}
      whileHover={{ scale: 1.03, y: -5 }}
      whileTap={{ scale: 0.97, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="glow-backdrop" style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
        background: `radial-gradient(circle at center, ${getPriorityColor()}12 0%, transparent 70%)`
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', position: 'relative', zIndex: 1 }}>
        <span style={{
          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '99px',
          backgroundColor: `${getPriorityColor()}1c`, color: getPriorityColor(), border: `1px solid ${getPriorityColor()}33`
        }}>
          {priority}
        </span>
        <span style={{ color: 'var(--color-text-dim)', fontSize: '12px' }}>•••</span>
      </div>

      <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', margin: '0 0 16px 0', lineHeight: 1.4, position: 'relative', zIndex: 1 }}>
        {title}
      </h4>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-dim)', fontSize: '11px', position: 'relative', zIndex: 1 }}>
        {dueDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} />
            <span>{dueDate}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <MessageSquare size={12} />
            <span>{commentsCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Paperclip size={12} />
            <span>{attachmentsCount}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ----------------------------------------------------
// PROTOTYPE 2: Elastic Sidebar Navigation
// ----------------------------------------------------
const ElasticSidebarDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('board');
  const tabs = [
    { id: 'home', label: 'Dashboard', icon: <Home size={16} /> },
    { id: 'board', label: 'Kanban Board', icon: <Layers size={16} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={16} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
  ];

  return (
    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '8px', width: '240px' }}>
      {tabs.map(t => {
        const active = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
              padding: '10px 14px', background: 'transparent', border: 'none', borderRadius: '8px',
              color: active ? 'var(--color-primary)' : 'var(--color-text-dim)', fontWeight: 600,
              fontSize: '13px', cursor: 'pointer', textAlign: 'left', transition: 'color 0.2s', outline: 'none'
            }}
          >
            <span style={{ position: 'relative', zIndex: 2 }}>{t.icon}</span>
            <span style={{ position: 'relative', zIndex: 2 }}>{t.label}</span>

            {active && (
              <motion.div
                layoutId="elastic-nav-indicator"
                transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.12) 0%, transparent 100%)',
                  borderLeft: '3px solid var(--color-primary)', borderRadius: '0 8px 8px 0', zIndex: 1
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

// ----------------------------------------------------
// PROTOTYPE 3: Checklist Completion Splash
// ----------------------------------------------------
const CompletionSplashDemo: React.FC = () => {
  const [active, setActive] = useState(false);
  const [checked, setChecked] = useState(false);

  const toggleCheck = () => {
    const nextVal = !checked;
    setChecked(nextVal);
    if (nextVal) {
      setActive(true);
      setTimeout(() => setActive(false), 800);
    }
  };

  const particles = Array.from({ length: 16 }).map((_, i) => ({
    id: i,
    angle: (i / 16) * 360,
    dist: 50 + Math.random() * 40,
    size: 4 + Math.random() * 6,
  }));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
      <div
        onClick={toggleCheck}
        style={{
          width: '24px', height: '24px', borderRadius: '6px', border: '2px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          background: checked ? 'var(--grad-primary)' : 'transparent', borderColor: checked ? 'var(--color-primary)' : 'var(--color-border)',
          transition: 'all 0.2s', position: 'relative'
        }}
      >
        {checked && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>✓</motion.div>}
      </div>
      <span style={{ fontSize: '14px', color: checked ? 'var(--color-text-dim)' : 'var(--color-text)', textDecoration: checked ? 'line-through' : 'none', transition: 'all 0.2s' }}>
        Review documentation & assets
      </span>

      <AnimatePresence>
        {active && (
          <div style={{ position: 'absolute', left: '12px', top: '12px', pointerEvents: 'none' }}>
            {particles.map(p => {
              const rad = (p.angle * Math.PI) / 180;
              const targetX = Math.cos(rad) * p.dist;
              const targetY = Math.sin(rad) * p.dist;
              return (
                <motion.div
                  key={p.id}
                  initial={{ x: 0, y: 0, scale: 0.8, opacity: 1 }}
                  animate={{ x: targetX, y: targetY, scale: 0, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{
                    position: 'absolute', width: p.size, height: p.size, borderRadius: '50%',
                    background: 'var(--grad-primary)', transform: 'translate(-50%, -50%)'
                  }}
                />
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ----------------------------------------------------
// PROTOTYPE 4: Staggered Activity Log Feed
// ----------------------------------------------------
const StaggeredActivityDemo: React.FC = () => {
  const [visible, setVisible] = useState(true);
  const logs = [
    { id: '1', user: 'vaibhav', action: "created task 'Setup express backend'", time: '2 hours ago' },
    { id: '2', user: 'sarah', action: "uploaded file 'database_schema.png'", time: '1 hour ago' },
    { id: '3', user: 'jake', action: "moved task 'Authentication' to 'In Progress'", time: '30 mins ago' },
    { id: '4', user: 'vaibhav', action: "added a comment: 'Refactoring token interceptors'", time: '5 mins ago' },
  ];

  return (
    <div>
      <button className="btn-ghost" onClick={() => setVisible(!visible)} style={{ marginBottom: '16px', fontSize: '12px' }}>
        {visible ? 'Collapse Stream' : 'Animate Stream'}
      </button>

      <AnimatePresence>
        {visible && (
          <motion.div
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.08 } }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {logs.map(log => (
              <motion.div
                key={log.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 22 } }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                  background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '8px'
                }}
              >
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', background: 'var(--grad-primary)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '11px', textTransform: 'uppercase'
                }}>
                  {log.user[0]}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{log.user}</span> {log.action}
                  </p>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-dim)' }}>{log.time}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ----------------------------------------------------
// PROTOTYPE 5: Drawing Path Line Graph (Analytics)
// ----------------------------------------------------
const DrawingGraphDemo: React.FC = () => {
  const [key, setKey] = useState(0);
  const points = [
    { x: 30, y: 120 },
    { x: 100, y: 100 },
    { x: 170, y: 110 },
    { x: 240, y: 40 },
    { x: 310, y: 80 },
    { x: 380, y: 30 },
    { x: 450, y: 10 },
  ];

  const width = 480;
  const height = 140;
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div>
      <button className="btn-ghost" onClick={() => setKey(k => k + 1)} style={{ marginBottom: '16px', fontSize: '12px' }}>
        Re-Draw Line Path
      </button>

      <div style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
        <svg key={key} viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="protoTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area under the line (animated) */}
          <motion.path
            d={`${pathD} L ${points[points.length-1].x} ${height} L ${points[0].x} ${height} Z`}
            fill="url(#protoTrendGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.2 }}
          />

          {/* Path line drawing */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />

          {/* Circle indicators */}
          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="5.5"
              fill="#0b0b1e"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 14, delay: i * 0.08 + 0.6 }}
              whileHover={{ scale: 1.6 }}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// NEW PROTOTYPE: Animated SVG Orbital Brand Logo
// ----------------------------------------------------
export const BrandLogo: React.FC<{ size?: number; animate?: boolean }> = ({ size = 42, animate = true }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <motion.div
          animate={animate ? { scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] } : {}}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: -4, borderRadius: '50%',
            background: 'var(--grad-primary)', filter: 'blur(8px)', zIndex: 0
          }}
        />
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: 'relative', zIndex: 1, overflow: 'visible' }}>
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <motion.circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke="url(#logoGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            initial={animate ? { strokeDasharray: '60 200', rotate: 0 } : {}}
            animate={animate ? { rotate: 360 } : {}}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
          <motion.path
            d="M 55 15 L 35 52 L 52 52 L 45 85 L 65 48 L 48 48 Z"
            fill="#fff"
            filter="drop-shadow(0 2px 8px rgba(168,85,247,0.5))"
            initial={animate ? { scale: 0.9, opacity: 0.8 } : {}}
            animate={animate ? { scale: [0.9, 1.05, 0.9], opacity: [0.8, 1, 0.8] } : {}}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
      </div>
      <span style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em' }}>
        Task<span className="grad-text">Flow</span>
      </span>
    </div>
  );
};

// ----------------------------------------------------
// NEW PROTOTYPE: Liquid Mesh Redesigned Login Page Overlay
// ----------------------------------------------------
const LoginRedesignPreview: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: '#02020a',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', filter: 'blur(120px)', opacity: 0.45 }}>
          <motion.div
            animate={{
              x: [-100, 150, -50],
              y: [-150, 100, 150],
              scale: [1, 1.25, 0.95],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
              background: 'radial-gradient(circle, #6366f1 0%, transparent 80%)',
              top: '10%', left: '15%'
            }}
          />
          <motion.div
            animate={{
              x: [150, -100, 50],
              y: [100, -150, -50],
              scale: [1.2, 0.9, 1.15],
            }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', width: '450px', height: '450px', borderRadius: '50%',
              background: 'radial-gradient(circle, #ec4899 0%, transparent 80%)',
              bottom: '15%', right: '10%'
            }}
          />
          <motion.div
            animate={{
              x: [50, 150, -100],
              y: [120, -50, 100],
              scale: [0.9, 1.1, 0.95],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
              background: 'radial-gradient(circle, #06b6d4 0%, transparent 80%)',
              top: '40%', right: '35%'
            }}
          />
        </div>

        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 16px',
            borderRadius: '99px', cursor: 'pointer', zIndex: 10, fontWeight: 600, fontSize: '13px',
            backdropFilter: 'blur(10px)', transition: 'background 0.2s'
          }}
        >
          Exit Preview
        </button>

        <motion.div
          initial={{ scale: 0.95, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.15 }}
          style={{
            width: '100%', maxWidth: '400px', padding: '2.5rem',
            background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '20px', backdropFilter: 'blur(30px)', zIndex: 5,
            boxShadow: '0 30px 60px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05)',
            position: 'relative'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <BrandLogo size={46} />
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '12px' }}>
              {mode === 'login' ? 'Welcome back! Sign in to continue' : 'Join TaskFlow and supercharge your team'}
            </p>
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '4px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <button
              onClick={() => setMode('login')}
              style={{
                flex: 1, background: mode === 'login' ? 'var(--grad-primary)' : 'transparent',
                border: 'none', color: mode === 'login' ? '#fff' : 'var(--color-text-dim)',
                padding: '6px', borderRadius: '7px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              style={{
                flex: 1, background: mode === 'register' ? 'var(--grad-primary)' : 'transparent',
                border: 'none', color: mode === 'register' ? '#fff' : 'var(--color-text-dim)',
                padding: '6px', borderRadius: '7px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 700 }}>Email Address</label>
              <input
                type="email"
                className="tf-input"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '10px', padding: '10px 14px', outline: 'none', color: '#fff', fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 700 }}>Password</label>
                {mode === 'login' && <span style={{ fontSize: '11px', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}>Forgot password?</span>}
              </div>
              <input
                type="password"
                className="tf-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '10px', padding: '10px 14px', outline: 'none', color: '#fff', fontSize: '13px'
                }}
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%', padding: '11px', border: 'none', borderRadius: '10px',
                background: 'var(--grad-primary)', color: '#fff', fontWeight: 700, fontSize: '14px',
                cursor: 'pointer', marginTop: '8px', boxShadow: '0 8px 24px rgba(168,85,247,0.3)'
              }}
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </motion.button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: '11px', color: 'var(--color-text-dim)' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <button
            style={{
              width: '100%', padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ----------------------------------------------------
// MAIN DEMO PAGE COMPONENT
// ----------------------------------------------------
export default function PrototypeDemoPage() {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: 'var(--space-3xl) 0', color: 'var(--color-text)', fontFamily: 'Inter, sans-serif' }}>
      <LoginRedesignPreview isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} />
      
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 var(--space-xl)' }}>
        
        {/* Back Link */}
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-dim)', textDecoration: 'none', fontSize: '14px', marginBottom: '24px', fontWeight: 500, transition: 'color 0.2s' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div>
            <h1 className="grad-text" style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 8px 0' }}>Animation Prototypes</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', margin: 0 }}>
              Interact with these high-fidelity micro-animation concepts designed for TaskFlow.
            </p>
          </div>
          <button
            onClick={() => setIsPreviewOpen(true)}
            style={{
              padding: '12px 24px', background: 'var(--grad-primary)', border: 'none', color: '#fff',
              fontWeight: 700, borderRadius: '12px', cursor: 'pointer', fontSize: '14px',
              boxShadow: '0 8px 24px rgba(168,85,247,0.3)', transition: 'transform 0.2s'
            }}
            className="btn-hover"
          >
            Live Redesign Preview (Full Screen) ✨
          </button>
        </div>

        {/* Grid layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '30px' }}>
          
          {/* Prototype 1 */}
          <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />
              1. 3D Hover & Grab Kanban Card
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Drag, tilt, and interact with the card to experience realistic perspective physics using coordinate-tracking transforms.
            </p>
            <div style={{ padding: '20px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '320px' }}>
                <PremiumKanbanCard
                  title="Integrate social sign-in with Google OAuth authentication"
                  priority="high"
                  dueDate="Jul 12"
                  commentsCount={4}
                  attachmentsCount={2}
                />
              </div>
            </div>
          </div>

          {/* Prototype 2 */}
          <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />
              2. Elastic Navigation Slide
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Switch between tabs to see the layout-linked background indicator slide and stretch with physical spring characteristics.
            </p>
            <div style={{ padding: '20px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', display: 'flex', justifyContent: 'center' }}>
              <ElasticSidebarDemo />
            </div>
          </div>

          {/* Prototype 3 */}
          <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />
              3. Checklist Confetti Explosion
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Click the checkbox to complete a task sub-item. Trigger a high-performance vector particle explosion on completion.
            </p>
            <div style={{ padding: '30px 20px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', display: 'flex', justifyContent: 'center' }}>
              <CompletionSplashDemo />
            </div>
          </div>

          {/* Prototype 4 */}
          <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />
              4. Staggered Feed Activity Stream
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Activities enter the stream sequentially. Fades and lifts items smoothly rather than snapping them open.
            </p>
            <div style={{ padding: '20px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px' }}>
              <StaggeredActivityDemo />
            </div>
          </div>

          {/* Prototype 5 */}
          <div className="glass" style={{ padding: '24px', borderRadius: '16px', gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />
              5. Draw Path SVG Analytics Graph
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              Graph trends draw vectors dynamically upon rendering. Nodes expand bouncy on hover with interactive detail tooltips.
            </p>
            <div style={{ padding: '20px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px' }}>
              <DrawingGraphDemo />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
