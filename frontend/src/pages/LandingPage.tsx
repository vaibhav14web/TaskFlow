import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Zap, Shield, Globe, Terminal, ArrowRight, Search, Activity, Cpu, Sparkles
} from 'lucide-react';

/* ── Interactive Command Bar Mockup ────────────────── */
function CommandBarMockup() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const items = [
    { label: 'Jump to Projects', key: 'P', icon: '📂' },
    { label: 'Workspace Settings', key: 'S', icon: '⚙️' },
    { label: 'Profile & Identity', key: 'I', icon: '👤' },
    { label: 'View Insights', key: 'N', icon: '📈' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{
        maxWidth: '540px', width: '100%', margin: '40px auto 0',
        background: 'rgba(11, 11, 14, 0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '16px', padding: '16px',
        boxShadow: '0 30px 70px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.01)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: '10px', padding: '10px 14px', marginBottom: '14px'
      }}>
        <Search size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
        <input
          readOnly
          value=""
          placeholder="Search tasks, teams, or documents..."
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit', flex: 1
          }}
        />
        <div style={{ display: 'flex', gap: '3px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>⌘</span>
          <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>K</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {items.map((item, idx) => {
          const active = selectedIdx === idx;
          return (
            <div
              key={idx}
              onMouseEnter={() => setSelectedIdx(idx)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                background: active ? 'rgba(255,255,255,0.03)' : 'transparent',
                border: active ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', width: '18px' }}>{item.icon}</span>
                <span style={{ fontSize: '12.5px', fontWeight: 500, color: active ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                  {item.label}
                </span>
              </div>
              <span style={{
                fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                background: active ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.04)',
                border: active ? '1px solid rgba(168,85,247,0.2)' : '1px solid rgba(255,255,255,0.06)',
                color: active ? '#a855f7' : 'rgba(255,255,255,0.25)', fontFamily: 'monospace'
              }}>{item.key}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Sci-Fi Feature Card ──────────────────────────── */
interface FeatureCardProps {
  title: string;
  desc: string;
  metricLabel1: string;
  metricValue1: string;
  metricLabel2: string;
  metricValue2: string;
  icon: any;
  accent: string;
  bgGlow: string;
  delay: number;
}

function FeatureCard({ title, desc, metricLabel1, metricValue1, metricLabel2, metricValue2, icon: Icon, accent, bgGlow, delay }: FeatureCardProps) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.1)' }}
      style={{
        background: `radial-gradient(180px circle at ${coords.x}px ${coords.y}px, rgba(255,255,255,0.025), transparent 75%), rgba(255,255,255,0.015)`,
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '16px', padding: '24px',
        display: 'flex', flexDirection: 'column', gap: '16px',
        position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s',
      }}
    >
      {/* Accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: accent }} />

      {/* Glow effect */}
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 80, height: 80,
        borderRadius: '50%', background: bgGlow, filter: 'blur(30px)', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: bgGlow.replace('0.2', '0.12').replace('0.15', '0.12'),
          border: `1px solid ${bgGlow.replace('0.2', '0.25').replace('0.15', '0.25')}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} style={{ color: accent }} />
        </div>
        <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          VERIFIED
        </span>
      </div>

      <div>
        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f7', margin: '0 0 6px 0' }}>{title}</h4>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>{desc}</p>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px', marginTop: '4px',
        fontSize: '9.5px', fontFamily: 'monospace', fontWeight: 'bold'
      }}>
        <div style={{ display: 'flex', gap: '5px', color: 'rgba(255,255,255,0.3)' }}>
          <span>{metricLabel1}:</span>
          <span style={{ color: accent }}>{metricValue1}</span>
        </div>
        <div style={{ display: 'flex', gap: '5px', color: 'rgba(255,255,255,0.3)' }}>
          <span>{metricLabel2}:</span>
          <span style={{ color: '#f5f5f7' }}>{metricValue2}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main Landing Page ─────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  return (
    <div
      onMouseMove={e => setCoords({ x: e.clientX, y: e.clientY })}
      style={{
        minHeight: '100vh', background: '#07070a',
        color: '#f5f5f7', fontFamily: 'Inter, sans-serif',
        overflowX: 'hidden', position: 'relative'
      }}
    >
      {/* Background radial highlight follow */}
      <div style={{
        position: 'fixed', left: coords.x - 400, top: coords.y - 400,
        width: 800, height: 800, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168,85,247,0.015) 0%, transparent 80%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* Decorative center ambient orb */}
      <div style={{
        position: 'absolute', top: '25%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.035) 0%, transparent 80%)',
        filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0
      }} />

      {/* ── NAVBAR ────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '64px',
        background: 'rgba(7, 7, 10, 0.7)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', zIndex: 100
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={14} color="#fff" />
          </div>
          <span style={{ fontSize: '14.5px', fontWeight: 800, letterSpacing: '-0.04em' }}>
            Task<span style={{ color: '#a855f7' }}>Flow</span>
          </span>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: '24px', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>
          <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onClick={() => navigate('/pricing')} className="nav-link-hover">Pricing</span>
          <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onClick={() => navigate('/blog')} className="nav-link-hover">Blog</span>
          <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onClick={() => navigate('/docs')} className="nav-link-hover">Docs</span>
        </div>

        {/* Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '12.5px' }}
            >
              Dashboard
            </button>
          ) : (
            <>
              <span
                style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                onClick={() => navigate('/auth')}
              >
                Log In
              </span>
              <button
                onClick={() => navigate('/auth')}
                className="btn-primary"
                style={{
                  padding: '8px 16px', fontSize: '12.5px',
                  boxShadow: '0 4px 15px rgba(99,102,241,0.25)'
                }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO SECTION ─────────────────────────────────── */}
      <section style={{
        padding: '140px 24px 80px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', position: 'relative', zIndex: 1
      }}>
        {/* Chip badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.18)',
            borderRadius: '99px', padding: '4px 12px',
            marginBottom: '24px'
          }}
        >
          <Sparkles size={11} style={{ color: '#818cf8' }} />
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#818cf8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Introducing TaskFlow
          </span>
        </motion.div>

        {/* Main Headline */}
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.05,
          color: '#f5f5f7', margin: '0 0 20px', maxWidth: '680px'
        }}>
          Elevate Your <br />
          <span style={{
            background: 'linear-gradient(135deg, #6366f1 30%, #a855f7 70%, #ec4899 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', display: 'inline-block',
            filter: 'drop-shadow(0 0 30px rgba(99,102,241,0.2))'
          }}>
            Workflow.
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
          color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
          maxWidth: '520px', margin: '0 0 36px'
        }}>
          The Command-Bar First Operating System for Teams. Navigate complex tasks at the speed of thought.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <motion.button
            onClick={() => navigate('/auth')}
            whileHover={{ scale: 1.03, boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              border: 'none', color: '#fff', fontWeight: 700, fontSize: '13px',
              padding: '12px 28px', borderRadius: '10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            Start Building <ArrowRight size={13} />
          </motion.button>
          <motion.button
            onClick={() => navigate('/auth')}
            whileHover={{ scale: 1.03, background: 'rgba(255,255,255,0.06)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#f5f5f7', fontWeight: 600, fontSize: '13px',
              padding: '12px 24px', borderRadius: '10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            Book Demo <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>⌘K</span>
          </motion.button>
        </div>

        {/* Mock Command Bar */}
        <CommandBarMockup />
      </section>

      {/* ── FEATURE CARDS ────────────────────────────────── */}
      <section style={{
        maxWidth: '1000px', margin: '0 auto', padding: '60px 24px 80px',
        position: 'relative', zIndex: 1
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px'
        }}>
          <FeatureCard
            title="Instant Response"
            desc="Built for low-latency interactions across global teams."
            metricLabel1="LATENCY"
            metricValue1="12ms"
            metricLabel2="SLA"
            metricValue2="99.9%"
            icon={Cpu}
            accent="#818cf8"
            bgGlow="rgba(99,102,241,0.15)"
            delay={0}
          />
          <FeatureCard
            title="Real-time Sync"
            desc="State of the art sync to ensure absolute team coordination."
            metricLabel1="SYNC"
            metricValue1="100/SEC"
            metricLabel2="REPL"
            metricValue2="realtime"
            icon={Activity}
            accent="#a855f7"
            bgGlow="rgba(168,85,247,0.15)"
            delay={0.1}
          />
          <FeatureCard
            title="E2E Privacy"
            desc="Your transaction is fully encrypted. Only you hold the keys."
            metricLabel1="CIPHER"
            metricValue1="AES-256"
            metricLabel2="KEY"
            metricValue2="client-side"
            icon={Shield}
            accent="#10b981"
            bgGlow="rgba(16,185,129,0.15)"
            delay={0.2}
          />
        </div>
      </section>

      {/* ── TRUSTED BY LOGOS ─────────────────────────────── */}
      <section style={{
        padding: '30px 24px 50px', borderTop: '1px solid rgba(255,255,255,0.03)',
        textAlign: 'center', position: 'relative', zIndex: 1
      }}>
        <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          POWERING THE WORLD'S BEST TEAMS
        </span>
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '40px', marginTop: '24px',
          alignItems: 'center', opacity: 0.35, filter: 'grayscale(100%)'
        }}>
          {['vercel', 'supabase', 'linear', 'prisma', 'render'].map(logo => (
            <span key={logo} style={{ fontSize: '13.5px', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', fontFamily: 'monospace' }}>
              {logo}
            </span>
          ))}
        </div>
      </section>

      {/* ── CTA ACCELERATE CARD ──────────────────────────── */}
      <section style={{
        maxWidth: '740px', margin: '0 auto', padding: '60px 24px 100px',
        position: 'relative', zIndex: 1
      }}>
        <motion.div
          whileHover={{ borderColor: 'rgba(99,102,241,0.2)' }}
          style={{
            background: 'rgba(255,255,255,0.015)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '20px', padding: '48px 40px',
            textAlign: 'center', position: 'relative', overflow: 'hidden'
          }}
        >
          {/* Ambient glow */}
          <div style={{
            position: 'absolute', bottom: -50, right: -50, width: 140, height: 140,
            borderRadius: '50%', background: 'rgba(99,102,241,0.08)', filter: 'blur(40px)', pointerEvents: 'none'
          }} />

          <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.04em', margin: '0 0 10px 0' }}>
            Ready to accelerate?
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, maxWidth: '440px', margin: '0 auto 28px' }}>
            Join 12,000+ teams shipping faster with the TaskFlow command interface.
          </p>

          <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', gap: '8px', maxWidth: '400px', margin: '0 auto', flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder="work@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                flex: 1, minWidth: '220px', background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px',
                padding: '10px 14px', color: '#fff', fontSize: '13px', outline: 'none'
              }}
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                border: 'none', color: '#fff', fontWeight: 700, fontSize: '12.5px',
                padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(99,102,241,0.25)', whiteSpace: 'nowrap'
              }}
            >
              Get Early Access
            </motion.button>
          </form>
        </motion.div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.03)',
        padding: '32px 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.25)',
        flexWrap: 'wrap', gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 800, color: '#f5f5f7' }}>TaskFlow</span>
          <span>© {new Date().getFullYear()}</span>
        </div>

        <div style={{ display: 'flex', gap: '16px', fontWeight: 500 }}>
          <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
          <span style={{ cursor: 'pointer' }}>Terms of Service</span>
          <span style={{ cursor: 'pointer' }}>Contact</span>
        </div>
      </footer>
    </div>
  );
}
