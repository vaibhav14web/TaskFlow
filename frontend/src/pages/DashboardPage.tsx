import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { workspaceApi, projectApi } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowRight } from 'lucide-react';

import Sidebar from '../components/ui/Sidebar';
import NotificationBell from '../components/dashboard/NotificationBell';
import ProjectsTab from '../components/dashboard/ProjectsTab';
import MembersTab from '../components/dashboard/MembersTab';
import AnalyticsTab from '../components/dashboard/AnalyticsTab';
import SettingsTab from '../components/dashboard/SettingsTab';

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

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'projects' | 'members' | 'analytics' | 'settings'>('projects');
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
      rotateX: -yOffset * 0.45,
      rotateY: xOffset * 0.45,
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
    return (
      <div
        onMouseMove={handleMouseMove}
        style={{
          minHeight: '100vh', background: '#0b0b0e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Interactive dot grid */}
        <motion.div
          animate={{ x: mousePos.x, y: mousePos.y }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
          style={{
            position: 'absolute', inset: -30, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1.2px, transparent 1.2px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          onMouseMove={handleCardMouseMove}
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: '440px', margin: '0 24px',
            background: `radial-gradient(400px circle at ${cardCoords.x}px ${cardCoords.y}px, rgba(168,85,247,0.08), transparent 70%), rgba(255,255,255,0.025)`,
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px', padding: '40px',
            boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)',
            transformStyle: 'preserve-3d',
            rotateX: mousePos.rotateX,
            rotateY: mousePos.rotateY,
            transformPerspective: 1000,
          }}
        >
          {/* Top chrome strip */}
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: '60%', height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          }} />

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
            <TFLogo size={48} />
          </div>

          <h1 style={{
            fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.04em',
            color: '#f5f5f7', textAlign: 'center', marginBottom: '10px',
          }}>
            Create your first workspace
          </h1>
          <p style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center',
            lineHeight: 1.6, marginBottom: '28px',
          }}>
            Workspaces are where your team organises projects, tasks, and conversations.
          </p>

          <form onSubmit={createFirstWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Workspace Name
              </label>
              <input
                className="tf-input"
                placeholder="Acme Corp, Engineering, Side Project…"
                value={newWsName}
                onChange={e => setNewWsName(e.target.value)}
                required autoFocus disabled={wsCreating}
              />
            </div>
            <motion.button
              className="btn-primary"
              type="submit"
              disabled={wsCreating}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              style={{ padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
            >
              {wsCreating ? 'Creating…' : <>Continue <ArrowRight size={15} /></>}
            </motion.button>
          </form>
        </motion.div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const tabTitles: Record<string, { title: string; desc: string }> = {
    projects:  { title: 'Projects',  desc: `All projects in ${currentWs?.name || 'your workspace'}` },
    members:   { title: 'Members',   desc: 'Manage team access and roles' },
    analytics: { title: 'Analytics', desc: 'Track progress and team velocity' },
    settings:  { title: 'Settings',  desc: 'Workspace configuration' },
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0b0b0e', overflow: 'hidden' }}>
      {/* Global dot grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

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
