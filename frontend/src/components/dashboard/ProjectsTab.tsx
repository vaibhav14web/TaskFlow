import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, ArrowRight, Trash2, LayoutGrid, Search, Zap, TrendingUp, Globe } from 'lucide-react';
import api, { projectApi } from '../../api';
import toast from 'react-hot-toast';

const gradients = [
  'linear-gradient(135deg,#6366f1,#a855f7)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
  'linear-gradient(135deg,#10b981,#0ea5e9)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#ec4899,#a855f7)',
  'linear-gradient(135deg,#14b8a6,#6366f1)',
];

interface ProjectsTabProps {
  projects: any[];
  currentWs: any;
  workspaces: any[];
  refetchProjects: () => void;
}

/* ── Animated Counter ──────────────────────────── */
function AnimatedCounter({ value, duration = 1.2 }: { value: number | string; duration?: number }) {
  const [displayed, setDisplayed] = useState(0);
  const isNum = typeof value === 'number';
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !isNum) return;
    const start = 0;
    const end = value as number;
    const steps = 40;
    const stepTime = (duration * 1000) / steps;
    let current = start;
    const timer = setInterval(() => {
      current += end / steps;
      if (current >= end) { setDisplayed(end); clearInterval(timer); }
      else setDisplayed(Math.floor(current));
    }, stepTime);
    return () => clearInterval(timer);
  }, [inView, value, isNum, duration]);

  return <span ref={ref}>{isNum ? displayed : value}</span>;
}

/* ── Dashboard Stat Card with Spotlight + Counter ── */
function DashboardStatCard({ s, i }: { s: any; i: number }) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      style={{
        background: `radial-gradient(180px circle at ${coords.x}px ${coords.y}px, rgba(255,255,255,0.05), transparent 70%), rgba(255,255,255,0.025)`,
        border: `1px solid ${hovered ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '14px', padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: '6px',
        position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.25s, box-shadow 0.25s',
        boxShadow: hovered ? '0 12px 40px rgba(168,85,247,0.1)' : '0 2px 12px rgba(0,0,0,0.2)',
        cursor: 'default',
      }}
    >
      {/* Top gradient accent line */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 0.8 }}
        transition={{ delay: 0.3 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: s.accent, transformOrigin: 'left',
        }}
      />

      {/* Ambient glow on hover */}
      <motion.div
        animate={{ opacity: hovered ? 0.6 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute', bottom: -30, right: -20,
          width: 80, height: 80, borderRadius: '50%',
          background: s.accent, filter: 'blur(30px)', pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.05em', color: '#f5f5f7', lineHeight: 1 }}>
          <AnimatedCounter value={typeof s.value === 'number' ? s.value : s.value} />
        </div>
        {s.label === 'Status' && s.value === 'Online' && (
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ display: 'flex', position: 'relative', width: 10, height: 10, marginTop: 4 }}
          >
            <span style={{ position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', background: '#10b981', opacity: 0.75, animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
            <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', width: 10, height: 10, background: '#10b981' }} />
          </motion.span>
        )}
        {s.label === 'Total Projects' && <Zap size={14} style={{ color: s.accent, marginTop: 4 }} />}
        {s.label === 'Active' && <TrendingUp size={14} style={{ color: s.accent, marginTop: 4 }} />}
        {s.label === 'Workspaces' && <Globe size={14} style={{ color: s.accent, marginTop: 4 }} />}
      </div>

      <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {s.label}
      </div>

      {/* Animated progress bar */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', marginTop: '6px', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: s.label === 'Status' ? '100%' : `${Math.min(100, Math.max(18, (Number(s.rawValue) || 0) * 15))}%` }}
          transition={{ duration: 1, delay: 0.4 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: '100%', background: s.accent, borderRadius: '99px' }}
        />
      </div>
    </motion.div>
  );
}

/* ── Project Grid Card with 3D Tilt Spotlight ───── */
interface ProjectCardProps {
  p: any;
  i: number;
  navigate: any;
  onDeleteClick: (e: React.MouseEvent) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] as any }
  }),
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
};

function ProjectCard({ p, i, navigate, onDeleteClick }: ProjectCardProps) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      custom={i}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={() => navigate(`/board/${p.id}`)}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: `radial-gradient(240px circle at ${coords.x}px ${coords.y}px, rgba(168,85,247,0.08), transparent 70%), rgba(255,255,255,0.025)`,
        border: `1px solid ${hovered ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '14px', padding: '22px',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.25s, box-shadow 0.25s',
        boxShadow: hovered ? '0 12px 40px rgba(168,85,247,0.1)' : '0 2px 8px rgba(0,0,0,0.2)',
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Top gradient bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.2 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: gradients[i % gradients.length], transformOrigin: 'left',
        }}
      />

      {/* Corner glow on hover */}
      <motion.div
        animate={{ opacity: hovered ? 0.5 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute', top: -20, right: -20, width: 80, height: 80,
          borderRadius: '50%', background: gradients[i % gradients.length],
          filter: 'blur(30px)', pointerEvents: 'none',
        }}
      />

      {/* Delete button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        onClick={onDeleteClick}
        style={{
          position: 'absolute', top: '14px', right: '14px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '6px', padding: '5px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ef4444',
        }}
      >
        <Trash2 size={12} />
      </motion.button>

      <div style={{ marginBottom: '14px', paddingTop: '6px' }}>
        <h3 style={{
          fontSize: '14px', fontWeight: 700, color: '#f5f5f7',
          letterSpacing: '-0.02em', marginBottom: '6px',
          paddingRight: '28px',
        }}>
          {p.name}
        </h3>
        {p.description && (
          <p style={{
            fontSize: '12px', color: 'rgba(255,255,255,0.35)',
            lineHeight: 1.5, display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {p.description}
          </p>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <motion.div
          whileHover={{ rotate: 20, scale: 1.2 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          style={{
            width: '26px', height: '26px', borderRadius: '7px',
            background: gradients[i % gradients.length], opacity: 0.85,
          }}
        />
        <motion.span
          animate={{ x: hovered ? 3 : 0 }}
          transition={{ duration: 0.2 }}
          style={{
            fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.45)',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          Open board <ArrowRight size={11} />
        </motion.span>
      </div>
    </motion.div>
  );
}

/* ── Empty State with floating animation ──────── */
function EmptyProjects({ search, onCreateClick }: { search: string; onCreateClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        gridColumn: '1 / -1',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '72px 24px', gap: '18px',
        border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px',
        background: 'rgba(255,255,255,0.01)',
      }}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      >
        <FolderOpen size={52} strokeWidth={1} style={{ color: 'rgba(255,255,255,0.12)' }} />
      </motion.div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
          {search ? 'No matching projects' : 'No projects yet'}
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>
          {search ? 'Try a different search term' : 'Create your first project to get started'}
        </div>
      </div>
      {!search && (
        <motion.button
          className="btn-primary"
          onClick={onCreateClick}
          whileHover={{ scale: 1.04, boxShadow: '0 0 20px rgba(168,85,247,0.3)' }}
          whileTap={{ scale: 0.97 }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '13px' }}
        >
          <Plus size={14} /> Create Project
        </motion.button>
      )}
    </motion.div>
  );
}

export default function ProjectsTab({ projects, currentWs, workspaces, refetchProjects }: ProjectsTabProps) {
  const navigate = useNavigate();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteProjId, setDeleteProjId] = useState('');
  const [deleteProjName, setDeleteProjName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const deleteProject = async () => {
    if (!deleteProjId) return;
    setDeleting(true);
    try {
      await api.delete(`/projects/${deleteProjId}`);
      toast.success('Project deleted');
      refetchProjects();
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteProjId('');
      setDeleteProjName('');
    }
  };

  const createProject = async () => {
    if (!newProjName.trim() || !currentWs?.id) return;
    setCreating(true);
    try {
      await projectApi.create(currentWs.id, newProjName.trim());
      toast.success('Project created!');
      setNewProjName('');
      setShowNewProject(false);
      refetchProjects();
    } catch {
      toast.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const stats = [
    { label: 'Total Projects', value: projects.length, rawValue: projects.length, accent: 'linear-gradient(135deg,#6366f1,#a855f7)' },
    { label: 'Workspaces', value: workspaces.length, rawValue: workspaces.length, accent: 'linear-gradient(135deg,#a855f7,#ec4899)' },
    { label: 'Active', value: projects.length > 0 ? projects.length : 0, rawValue: projects.length, accent: 'linear-gradient(135deg,#10b981,#0ea5e9)' },
    { label: 'Status', value: 'Online', rawValue: 1, accent: 'linear-gradient(135deg,#0ea5e9,#22d3ee)' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}
    >
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {stats.map((s, i) => (
          <DashboardStatCard key={s.label} s={s} i={i} />
        ))}
      </div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        {/* Search */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px', padding: '9px 13px', flex: 1, maxWidth: '320px',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        >
          <Search size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit', flex: 1,
            }}
          />
        </div>
        <div style={{ flex: 1 }} />
        <motion.button
          className="btn-primary"
          onClick={() => setShowNewProject(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '13px' }}
          whileHover={{ scale: 1.03, boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}
          whileTap={{ scale: 0.97 }}
        >
          <motion.span animate={{ rotate: showNewProject ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus size={15} />
          </motion.span>
          New Project
        </motion.button>
      </motion.div>

      {/* New Project inline form */}
      <AnimatePresence>
        {showNewProject && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <motion.div
              initial={{ borderColor: 'rgba(99,102,241,0)' }}
              animate={{ borderColor: 'rgba(99,102,241,0.3)' }}
              style={{
                display: 'flex', gap: '10px', alignItems: 'center',
                background: 'rgba(99,102,241,0.04)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '12px', padding: '14px 16px',
                boxShadow: '0 0 0 4px rgba(99,102,241,0.05)',
              }}
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              >
                <LayoutGrid size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
              </motion.div>
              <input
                className="tf-input"
                placeholder="Project name…"
                value={newProjName}
                onChange={e => setNewProjName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createProject();
                  if (e.key === 'Escape') setShowNewProject(false);
                }}
                autoFocus disabled={creating}
                style={{ flex: 1, background: 'transparent', border: 'none', padding: '0', boxShadow: 'none' }}
              />
              <motion.button
                className="btn-primary"
                onClick={createProject}
                disabled={creating}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                {creating ? 'Creating…' : 'Create'}
              </motion.button>
              <motion.button
                onClick={() => setShowNewProject(false)}
                whileHover={{ scale: 1.1, color: 'rgba(255,255,255,0.6)' }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px', padding: '0 4px', lineHeight: 1 }}
              >
                ✕
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Projects grid */}
      <motion.div
        layout
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}
      >
        <AnimatePresence>
          {filtered.map((p: any, i: number) => (
            <ProjectCard
              key={p.id}
              p={p}
              i={i}
              navigate={navigate}
              onDeleteClick={e => {
                e.stopPropagation();
                setDeleteProjId(p.id);
                setDeleteProjName(p.name);
                setShowDeleteModal(true);
              }}
            />
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <EmptyProjects search={search} onCreateClick={() => setShowNewProject(true)} />
        )}
      </motion.div>

      {/* Delete modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            }}
            onClick={() => { setShowDeleteModal(false); setDeleteProjId(''); setDeleteProjName(''); }}
          >
            <motion.div
              initial={{ scale: 0.88, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.88, y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'rgba(17,17,22,0.98)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '16px', padding: '30px', width: '100%', maxWidth: '400px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(239,68,68,0.1)',
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}
              >
                <Trash2 size={18} style={{ color: '#ef4444' }} />
              </motion.div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f5f5f7', marginBottom: '8px' }}>Delete project?</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '22px' }}>
                <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{deleteProjName}</strong> and all its columns, tasks, and comments will be permanently deleted.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <motion.button
                  className="btn-ghost"
                  onClick={() => { setShowDeleteModal(false); setDeleteProjId(''); setDeleteProjName(''); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ fontSize: '13px', padding: '8px 16px' }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  disabled={deleting}
                  onClick={deleteProject}
                  whileHover={{ scale: 1.02, boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', borderRadius: '9px',
                    color: '#fff', fontWeight: 700, fontSize: '13px',
                    padding: '8px 16px', cursor: 'pointer', opacity: deleting ? 0.6 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {deleting ? 'Deleting…' : 'Delete project'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
