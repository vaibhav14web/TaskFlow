import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { workspaceApi, projectApi } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowRight, Sparkles, Plus, Layers, Clock, Activity, Settings, CheckCircle2 } from 'lucide-react';

import Sidebar from '../components/ui/Sidebar';
import NotificationBell from '../components/dashboard/NotificationBell';
import ProjectsTab from '../components/dashboard/ProjectsTab';
import MembersTab from '../components/dashboard/MembersTab';
import AnalyticsTab from '../components/dashboard/AnalyticsTab';
import SettingsTab from '../components/dashboard/SettingsTab';
import OverviewTab from '../components/dashboard/OverviewTab';

function TFLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="dashLogoG" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" /><stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="url(#dashLogoG)" />
      <rect x="8" y="10" width="24" height="4" rx="2" fill="white" />
      <rect x="17" y="14" width="6" height="10" rx="1" fill="white" />
      <rect x="9" y="27" width="14" height="3.5" rx="1.5" fill="white" opacity="0.9" />
      <rect x="9" y="24" width="10" height="3" rx="1.5" fill="white" opacity="0.6" />
    </svg>
  );
}

/* ── Floating Background Particle ──────────────────────── */
function FloatingParticle({ x, y, size, delay, duration, color = 'rgba(168,85,247,0.3)' }: {
  x: number; y: number; size: number; delay: number; duration: number; color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: [0, 0.6, 0.8, 0.2, 0],
        y: [0, -70, -140],
        x: [0, size * 3, size * -3],
        scale: [0.5, 1.2, 0.7],
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
        boxShadow: `0 0 ${size * 2.5}px ${color}`,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

/* ── Premium Shimmer Button ────────────────────────────── */
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
      whileHover={{ scale: 1.01, boxShadow: '0 8px 30px rgba(168,85,247,0.4), 0 0 0 1px rgba(168,85,247,0.3)' }}
      whileTap={{ scale: 0.98 }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        padding: '12px 16px',
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
        boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
        opacity: disabled ? 0.6 : 1,
        transition: 'opacity 0.2s, box-shadow 0.2s',
      }}
      animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
    >
      <motion.div
        animate={{ x: ['-200%', '200%'] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
          transform: 'skewX(-25deg)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </motion.button>
  );
}

const itemVariants = {
  hidden: { opacity: 0, x: 12, filter: 'blur(4px)' },
  show: (i: number) => ({
    opacity: 1, x: 0, filter: 'blur(0px)',
    transition: { delay: 0.1 + i * 0.05, duration: 0.28, ease: [0.23, 1, 0.32, 1] as any }
  })
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'members' | 'analytics' | 'settings'>('dashboard');
  const [newWsName, setNewWsName] = useState('');
  const [wsCreating, setWsCreating] = useState(false);

  // Mouse tilt states for Onboarding Card
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, rotateX: 0, rotateY: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const xOffset = (clientX - window.innerWidth / 2) / 30;
    const yOffset = (clientY - window.innerHeight / 2) / 30;
    setMousePos({
      x: xOffset,
      y: yOffset,
      rotateX: -yOffset * 0.3,
      rotateY: xOffset * 0.3,
    });
  };

  const [cardCoords, setCardCoords] = useState({ x: 0, y: 0 });
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCardCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const { data: wsRaw, isLoading: wsLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceApi.list().then((r: any) => r.data),
  });
  const workspaces: any[] = wsRaw || [];
  const currentWs = workspaces[0];

  const { data: projRaw, refetch: refetchProjects } = useQuery({
    queryKey: ['projects', currentWs?.id],
    queryFn: () => projectApi.list(currentWs.id).then((r: any) => r.data),
    enabled: !!currentWs?.id,
  });
  const projects: any[] = projRaw || [];

  const { data: membersRaw, refetch: refetchMembers } = useQuery({
    queryKey: ['workspace-members', currentWs?.id],
    queryFn: () => workspaceApi.members(currentWs.id).then((r: any) => r.data),
    enabled: !!currentWs?.id && activeTab === 'members',
  });
  const members: any[] = membersRaw || [];

  const createFirstWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setWsCreating(true);
    try {
      await workspaceApi.create(newWsName.trim());
      toast.success('Workspace created!');
      window.location.reload();
    } catch {
      toast.error('Failed to create workspace');
    } finally {
      setWsCreating(false);
    }
  };

  // Loading skeleton
  if (wsLoading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0b0b0e', flexDirection: 'column', gap: '16px',
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <TFLogo size={40} />
        </motion.div>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: 500 }}>Loading workspace…</p>
      </div>
    );
  }

  // Onboarding — no workspace yet
  if (workspaces.length === 0) {
    const defaultGradients = [
      'linear-gradient(135deg, #818cf8, #c084fc)',
      'linear-gradient(135deg, #c084fc, #f472b6)',
      'linear-gradient(135deg, #60a5fa, #22d3ee)',
      'linear-gradient(135deg, #34d399, #60a5fa)',
    ];
    const charCode = newWsName.trim().charCodeAt(0) || 0;
    const activeGradient = defaultGradients[charCode % defaultGradients.length];
    const displayChar = newWsName.trim().charAt(0).toUpperCase() || null;

    return (
      <div
        onMouseMove={handleMouseMove}
        style={{
          minHeight: '100vh', background: '#0b0b0e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden', padding: '24px',
        }}
      >
        {/* Glow ambient backdrops */}
        <div style={{
          position: 'absolute', top: '15%', left: '15%', width: '380px', height: '380px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          filter: 'blur(90px)', pointerEvents: 'none', zIndex: 0
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', right: '15%', width: '420px', height: '420px',
          background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
          filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0
        }} />

        {/* Floating cyber particles */}
        <FloatingParticle x={12} y={75} size={5} delay={0.1} duration={8} />
        <FloatingParticle x={88} y={25} size={7} delay={1.2} duration={10} color="rgba(99,102,241,0.5)" />
        <FloatingParticle x={52} y={88} size={4} delay={0.6} duration={7} color="rgba(236,72,153,0.4)" />
        <FloatingParticle x={22} y={35} size={6} delay={2.0} duration={9} />

        {/* Interactive dot grid */}
        <motion.div
          animate={{ x: mousePos.x * 0.8, y: mousePos.y * 0.8 }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
          style={{
            position: 'absolute', inset: -30, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.045) 1.2px, transparent 1.2px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          onMouseMove={handleCardMouseMove}
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: '820px',
            background: `radial-gradient(600px circle at ${cardCoords.x}px ${cardCoords.y}px, rgba(168,85,247,0.06), transparent 70%), rgba(255,255,255,0.02)`,
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '24px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(20px)',
            transformStyle: 'preserve-3d',
            rotateX: mousePos.rotateX,
            rotateY: mousePos.rotateY,
            transformPerspective: 1200,
            overflow: 'hidden',
          }}
        >
          {/* Top chrome strip */}
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: '70%', height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          }} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          }}>
            {/* Left side: Setup Form */}
            <div style={{
              padding: '44px',
              borderRight: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <TFLogo size={32} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Setup Workspace</span>
              </div>

              <h1 style={{
                fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.03em',
                color: '#f5f5f7', marginBottom: '8px',
              }}>
                Create your workspace
              </h1>
              <p style={{
                fontSize: '13px', color: 'rgba(255,255,255,0.4)',
                lineHeight: 1.5, marginBottom: '32px',
              }}>
                Think of workspaces as your company or team base. You can invite members, create boards, and track time inside it.
              </p>

              <form onSubmit={createFirstWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Real-time Dynamic Workspace Icon Preview */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                    {/* Rotating outer ring */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                      style={{
                        position: 'absolute', inset: -4,
                        border: '1.5px dashed rgba(168,85,247,0.35)',
                        borderRadius: '50%',
                      }}
                    />
                    {/* Main avatar bubble */}
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={displayChar || 'empty'}
                        initial={{ scale: 0.8, rotate: -15, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0.8, rotate: 15, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        style={{
                          width: '100%', height: '100%',
                          background: displayChar ? activeGradient : 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: displayChar ? '0 8px 24px rgba(168,85,247,0.3)' : 'none',
                        }}
                      >
                        {displayChar ? (
                          <span style={{ fontSize: '22px', fontWeight: 800, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                            {displayChar}
                          </span>
                        ) : (
                          <Plus size={22} style={{ color: 'rgba(255,255,255,0.25)' }} />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Live Icon Preview</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{newWsName.trim() || 'Your Workspace Name'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '10.5px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Workspace Name
                  </label>
                  <input
                    className="tf-input"
                    placeholder="Acme Corp, Engineering, Side Project…"
                    value={newWsName}
                    onChange={e => setNewWsName(e.target.value)}
                    required autoFocus disabled={wsCreating}
                    style={{
                      padding: '12px 14px', background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
                      color: '#fff', fontSize: '13px', width: '100%', outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                  />
                </div>

                <ShimmerButton disabled={wsCreating || !newWsName.trim()}>
                  {wsCreating ? 'Creating…' : <>Continue <ArrowRight size={15} /></>}
                </ShimmerButton>
              </form>
            </div>

            {/* Right side: Feature Showcase */}
            <div style={{
              padding: '44px',
              background: 'rgba(255,255,255,0.005)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
                <Sparkles size={16} style={{ color: '#a855f7' }} />
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#f5f5f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What you'll unlock</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  {
                    icon: Layers,
                    title: 'Kanban & Priority Swimlanes',
                    desc: 'Organize cards into swimlanes grouped dynamically by priority level or team assignee.',
                    color: '#818cf8',
                  },
                  {
                    icon: Clock,
                    title: 'Granular Time Logs',
                    desc: 'Track seconds spent on tasks with an active stopwatch and create manual entry slips.',
                    color: '#c084fc',
                  },
                  {
                    icon: Activity,
                    title: 'Velocity & Billing Analytics',
                    desc: 'Calculate total billable hours and generate print-ready invoice summaries for clients.',
                    color: '#34d399',
                  },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    custom={idx}
                    initial="hidden"
                    animate="show"
                    variants={itemVariants}
                    whileHover={{ x: 4, transition: { duration: 0.2 } }}
                    style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <item.icon size={16} style={{ color: item.color }} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f7', marginBottom: '3px' }}>{item.title}</h4>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.45 }}>{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const tabTitles: Record<string, { title: string; desc: string }> = {
    dashboard: { title: 'Dashboard', desc: 'Real-time system overview and modules' },
    projects:  { title: 'Projects',  desc: `All projects in ${currentWs?.name || 'your workspace'}` },
    members:   { title: 'Members',   desc: 'Manage team access and roles' },
    analytics: { title: 'Analytics', desc: 'Track progress and team velocity' },
    settings:  { title: 'Settings',  desc: 'Workspace configuration' },
  };

  // Generate random particles for the dashboard view
  const dashboardParticles = Array.from({ length: 15 }).map((_, i) => ({
    x: 10 + (i * 22) % 80,
    y: 10 + (i * 17) % 80,
    size: 2 + (i % 3),
    delay: i * 0.4,
    duration: 12 + (i % 4) * 3,
  }));

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#07070a', overflow: 'hidden', position: 'relative' }}>
      {/* Global dot grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Glowing abstract background blobs */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, filter: 'blur(100px)', opacity: 0.35
      }}>
        <div style={{ position: 'absolute', top: '-10%', left: '15%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '10%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
      </div>

      {/* Floating particles */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {dashboardParticles.map((p, idx) => (
          <FloatingParticle key={idx} x={p.x} y={p.y} size={p.size} delay={p.delay} duration={p.duration} />
        ))}
      </div>

      <Sidebar
        activeTab={activeTab}

        onTabChange={tab => setActiveTab(tab as any)}
        user={user}
        onLogout={logout}
      />

      <main style={{
        flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Top header bar */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 28px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            position: 'sticky', top: 0, zIndex: 10,
            background: 'rgba(11,11,14,0.85)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '2px' }}>
              {greeting}, {user?.name?.split(' ')[0]}
            </div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#f5f5f7', margin: 0 }}>
              {tabTitles[activeTab].title}
              <span style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(255,255,255,0.3)', marginLeft: '10px', letterSpacing: 0 }}>
                {tabTitles[activeTab].desc}
              </span>
            </h1>
          </div>
          <NotificationBell />
        </motion.div>

        {/* Tab content */}
        <div style={{ padding: '28px', flex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === 'dashboard' && (
                <OverviewTab projects={projects} />
              )}
              {activeTab === 'projects' && (
                <ProjectsTab projects={projects} currentWs={currentWs} workspaces={workspaces} refetchProjects={refetchProjects} />
              )}
              {activeTab === 'members' && (
                <MembersTab currentWs={currentWs} members={members} refetchMembers={refetchMembers} />
              )}
              {activeTab === 'analytics' && (
                <AnalyticsTab projects={projects} currentWs={currentWs} />
              )}
              {activeTab === 'settings' && (
                <SettingsTab currentWs={currentWs} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
