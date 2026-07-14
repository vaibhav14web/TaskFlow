import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Users, BarChart2, Layers, CheckCircle, ArrowRight,
  Star, Shield, Clock, Sparkles, Globe, ChevronRight
} from 'lucide-react';

/* ── Floating Glass Card ──────────────────────────── */
function GlassCard({
  children,
  style = {},
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5, boxShadow: '0 12px 40px rgba(168,85,247,0.12), inset 0 1px 0 rgba(255,255,255,0.12)' }}
      style={{
        background: 'rgba(255,255,255,0.035)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        transition: 'box-shadow 0.3s, border-color 0.3s',
        ...style,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated radial glow orb ─────────────────────── */
function GlowOrb({ initialX, initialY, color, size = 600, duration = 8, delay = 0 }: {
  initialX: string; initialY: string; color: string; size?: number; duration?: number; delay?: number;
}) {
  return (
    <motion.div
      animate={{
        x: [0, 40, -30, 0],
        y: [0, -30, 40, 0],
        scale: [1, 1.15, 0.9, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
      style={{
        position: 'absolute',
        left: initialX,
        top: initialY,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(30px)',
      }}
    />
  );
}

/* ── Floating task card mockup ─────────────────────── */
function FloatingTaskCard({ title, tag, tag2, avatar, progress, delay }: {
  title: string; tag: string; tag2?: string; avatar: string; progress: number; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ x: 6, scale: 1.01 }}
      style={{
        background: 'rgba(255,255,255,0.045)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f7', lineHeight: 1.4 }}>{title}</div>
        <div style={{ fontSize: '20px', marginLeft: 8 }}>{avatar}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: 99,
          background: 'rgba(168,85,247,0.18)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)'
        }}>{tag}</span>
        {tag2 && (
          <span style={{
            fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: 99,
            background: 'rgba(99,102,241,0.18)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)'
          }}>{tag2}</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ delay: delay + 0.4, duration: 0.9, ease: 'easeOut' }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #a855f7, #6366f1)', borderRadius: 99 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ── Feature card ─────────────────────────────────── */
function FeatureCard({ icon: Icon, title, desc, gradient, delay }: {
  icon: React.ElementType; title: string; desc: string; gradient: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{
        y: -6,
        borderColor: 'rgba(168,85,247,0.3)',
        boxShadow: '0 12px 40px rgba(168,85,247,0.12), inset 0 1px 0 rgba(255,255,255,0.12)',
      }}
      style={{
        background: 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 18,
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        cursor: 'pointer',
        transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* top gradient line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.3), transparent)'
      }} />
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}>
        <Icon size={20} color="white" />
      </div>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#f5f5f7', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{desc}</div>
      </div>
    </motion.div>
  );
}

/* ── Stat card ─────────────────────────────────────── */
function StatCard({ number, label, delay }: { number: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.03, borderColor: 'rgba(99,102,241,0.2)' }}
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '24px 20px',
        textAlign: 'center',
        transition: 'all 0.2s',
      }}
    >
      <div style={{
        fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.04em',
        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: 4,
      }}>{number}</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{label}</div>
    </motion.div>
  );
}

/* ── Navbar ────────────────────────────────────────── */
function Navbar({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64,
        background: 'rgba(11,11,14,0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'linear-gradient(135deg, #a855f7, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={16} color="white" />
        </div>
        <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f5f5f7' }}>
          Task<span style={{ color: '#a855f7' }}>Flow</span>
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {['Features', 'Pricing', 'Blog', 'Docs'].map(item => (
          <span key={item} style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 500,
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f5f5f7')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >{item}</span>
        ))}
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onGetStarted}
          style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '7px 16px', color: 'rgba(255,255,255,0.7)',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)';
            (e.currentTarget as HTMLButtonElement).style.color = '#f5f5f7';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)';
          }}
        >Sign in</button>
        <button
          onClick={onGetStarted}
          style={{
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            border: 'none', borderRadius: 8, padding: '7px 18px',
            color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(168,85,247,0.35)', transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
        >Get Started</button>
      </div>
    </motion.nav>
  );
}

/* ── MAIN LANDING PAGE ─────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);

  // Mouse Parallax coordinates for grid Tilt
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    setMousePos({
      x: (clientX - window.innerWidth / 2) / 35,
      y: (clientY - window.innerHeight / 2) / 35,
    });
  };

  const goToAuth = () => navigate('/auth');

  const features = [
    { icon: Layers, title: 'Kanban Boards', desc: 'Drag-and-drop task management with real-time sync across your entire team.', gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)', delay: 0 },
    { icon: Users, title: 'Team Workspaces', desc: 'Create collaborative spaces with role-based permissions and invite management.', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', delay: 0.1 },
    { icon: BarChart2, title: 'Analytics', desc: 'Track velocity, completion rates and team performance with beautiful dashboards.', gradient: 'linear-gradient(135deg, #0ea5e9, #6366f1)', delay: 0.2 },
    { icon: Zap, title: 'Automations', desc: 'Set triggers and actions to automate repetitive workflows without any code.', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', delay: 0.3 },
    { icon: Shield, title: 'Enterprise Security', desc: '2FA, JWT rotation, rate limiting and end-to-end encryption built in.', gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', delay: 0.4 },
    { icon: Clock, title: 'Time Tracking', desc: 'Log time per task, view individual reports and export for billing.', gradient: 'linear-gradient(135deg, #ec4899, #a855f7)', delay: 0.5 },
  ];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        minHeight: '100vh',
        background: '#0b0b0e',
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: '#f5f5f7',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <Navbar onGetStarted={goToAuth} />

      {/* ── HERO SECTION ─────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        
        {/* Animated Floating Glow orbs */}
        <GlowOrb initialX="15%" initialY="35%" color="#a855f7" size={650} duration={12} delay={0} />
        <GlowOrb initialX="85%" initialY="45%" color="#6366f1" size={550} duration={14} delay={2} />
        <GlowOrb initialX="50%" initialY="80%" color="#3b82f6" size={500} duration={16} delay={4} />

        {/* Interactive parallax dot grid */}
        <motion.div
          animate={{ x: mousePos.x, y: mousePos.y }}
          transition={{ type: 'easeOut', duration: 0.4 }}
          style={{
            position: 'absolute', inset: -40, zIndex: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1.2px, transparent 1.2px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)',
          }}
        />

        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '100px 24px 60px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center',
          position: 'relative', zIndex: 1, width: '100%',
        }}>
          {/* Left: Headline & CTAs */}
          <motion.div style={{ y: heroY }}>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.25)',
                borderRadius: 99, padding: '4px 14px 4px 8px',
                marginBottom: 28,
              }}
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles size={13} color="#a855f7" />
              </motion.div>
              <span style={{ fontSize: '11px', color: '#c084fc', fontWeight: 600 }}>
                Introducing TaskFlow v2.0
              </span>
            </motion.div>

            {/* Headline with word-by-word fade reveal */}
            <h1 style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              marginBottom: 20,
              margin: '0 0 20px',
            }}>
              <motion.span
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                style={{ display: 'inline-block' }}
              >Work smarter,</motion.span>{' '}
              <motion.span
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.6 }}
                style={{
                  background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #3b82f6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  display: 'inline-block',
                }}
              >ship faster</motion.span>
            </h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontSize: '1.05rem', color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.7, maxWidth: 440, margin: '0 0 36px',
              }}
            >
              TaskFlow brings your team, tasks, and timelines into one beautiful
              workspace — with real-time collaboration, smart automations,
              and analytics that actually make sense.
            </motion.p>

            {/* CTA buttons with micro-interaction */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <motion.button
                onClick={goToAuth}
                whileHover={{ scale: 1.03, y: -2, boxShadow: '0 12px 35px rgba(168,85,247,0.5)' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                  border: 'none', borderRadius: 10, padding: '12px 28px',
                  color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'box-shadow 0.2s',
                }}
              >
                Start for free <ArrowRight size={15} />
              </motion.button>
              <motion.button
                onClick={goToAuth}
                whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.07)', color: '#f5f5f7' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '12px 24px',
                  color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                Watch demo
              </motion.button>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 32 }}
            >
              <div style={{ display: 'flex' }}>
                {['🧑‍💻','👩‍💼','🧑‍🎨','👨‍🔬','🧑‍💼'].map((em, i) => (
                  <div key={i} style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: `hsl(${i * 40 + 240},60%,30%)`,
                    border: '2px solid #0b0b0e',
                    marginLeft: i > 0 ? -8 : 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px',
                  }}>{em}</div>
                ))}
              </div>
              <div>
                <div style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
                  {[1,2,3,4,5].map(i => <Star key={i} size={11} color="#f59e0b" fill="#f59e0b" />)}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                  Trusted by <b style={{ color: 'rgba(255,255,255,0.7)' }}>2,400+</b> teams worldwide
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Floating Glass UI Mockup with Staggered floating layers */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'relative', minHeight: 520 }}
          >
            {/* Main dashboard card — gently floats up and down */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <GlassCard delay={0.3} style={{ padding: 20 }}>
                {/* Mini top bar */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 16, paddingBottom: 12,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Zap size={11} color="white" />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#f5f5f7' }}>TaskFlow</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['#ef4444','#f59e0b','#22c55e'].map(c => (
                      <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.6 }} />
                    ))}
                  </div>
                </div>

                {/* Sprint header */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Sprint 3 • Q3 2025</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f7' }}>Website Redesign</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                      background: 'rgba(168,85,247,0.15)', color: '#c084fc',
                      border: '1px solid rgba(168,85,247,0.2)',
                    }}>Active</span>
                  </div>
                </div>

                {/* Task cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <FloatingTaskCard title="Design new dashboard layout" tag="Design" tag2="In Progress" avatar="🎨" progress={72} delay={0.5} />
                  <FloatingTaskCard title="Implement OAuth 2.0 flow" tag="Backend" avatar="⚙️" progress={100} delay={0.6} />
                  <FloatingTaskCard title="Write unit tests for API" tag="Testing" tag2="Todo" avatar="🧪" progress={24} delay={0.7} />
                </div>
              </GlassCard>
            </motion.div>

            {/* Floating analytics mini card — floats at different speed */}
            <motion.div
              animate={{ y: [0, 8, 0], x: [0, -4, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              style={{ position: 'absolute', top: -28, right: -24, zIndex: 2 }}
            >
              <GlassCard
                delay={0.6}
                style={{
                  padding: '14px 18px', minWidth: 180,
                  boxShadow: '0 12px 48px rgba(168,85,247,0.15)',
                  background: 'rgba(11,11,14,0.7)',
                }}
              >
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Team Velocity</div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 36 }}>
                  {[40, 60, 45, 80, 65, 90, 75].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: h * 0.4 }}
                      transition={{ delay: 0.8 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
                      style={{
                        flex: 1, borderRadius: 3,
                        background: i === 5
                          ? 'linear-gradient(180deg, #a855f7, #6366f1)'
                          : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e' }}>↑ 23%</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>vs last sprint</span>
                </div>
              </GlassCard>
            </motion.div>

            {/* Floating notification mini card — floats at third speed */}
            <motion.div
              animate={{ y: [0, -8, 0], x: [0, 5, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              style={{ position: 'absolute', bottom: -20, left: -24, zIndex: 2 }}
            >
              <GlassCard
                delay={0.7}
                style={{
                  padding: '12px 16px', minWidth: 210,
                  boxShadow: '0 8px 32px rgba(99,102,241,0.15)',
                  background: 'rgba(11,11,14,0.7)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CheckCircle size={15} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#f5f5f7' }}>Task completed!</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>OAuth flow • just now</div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────── */}
      <section style={{ position: 'relative', padding: '60px 24px', zIndex: 1 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <GlassCard delay={0.1} style={{ padding: '32px 40px' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, textAlign: 'center',
            }}>
              {[
                { number: '99.9%', label: 'Uptime SLA' },
                { number: '2,400+', label: 'Teams Active' },
                { number: '< 80ms', label: 'API Latency' },
                { number: '5M+', label: 'Tasks Managed' },
              ].map((s, i) => (
                <StatCard key={i} {...s} delay={i * 0.08} />
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────── */}
      <section style={{ position: 'relative', padding: '80px 24px', zIndex: 1 }}>
        <GlowOrb initialX="50%" initialY="50%" color="rgba(99,102,241,0.4)" size={750} duration={14} />
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: 56 }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 99, padding: '4px 14px 4px 8px',
              marginBottom: 20,
            }}>
              <Globe size={12} color="#818cf8" />
              <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600 }}>Everything you need</span>
            </div>
            <h2 style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.04em',
              margin: '0 0 14px',
            }}>
              Built for modern teams
            </h2>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.45)', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
              Every feature is designed to reduce friction, improve visibility, and help your team ship consistently.
            </p>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 18,
          }}>
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ──────────────────────────────── */}
      <section style={{ padding: '80px 24px 100px', position: 'relative', zIndex: 1 }}>
        <GlowOrb initialX="50%" initialY="50%" color="rgba(168,85,247,0.4)" size={600} duration={12} />
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <GlassCard delay={0.1} style={{
            padding: '56px 48px',
            boxShadow: '0 16px 64px rgba(168,85,247,0.1), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', margin: '0 0 16px' }}>
                Ready to transform your workflow?
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: '0 0 32px', lineHeight: 1.6 }}>
                Join thousands of developers and teams who use TaskFlow to manage projects, log progress, and collaborate seamlessly.
              </p>
              <motion.button
                onClick={goToAuth}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                  border: 'none', borderRadius: 10, padding: '12px 32px',
                  color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 8px 32px rgba(168,85,247,0.4)',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}
              >
                Get Started Now <ArrowRight size={15} />
              </motion.button>
            </motion.div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
