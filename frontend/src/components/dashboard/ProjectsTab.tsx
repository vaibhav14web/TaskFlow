import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, ArrowRight, Trash2, LayoutGrid, Search, Layers, Calendar, Users, SlidersHorizontal, Sparkles } from 'lucide-react';
import api, { projectApi } from '../../api';
import toast from 'react-hot-toast';

const gradients = [
  'linear-gradient(135deg, #6366f1, #a855f7)',
  'linear-gradient(135deg, #0ea5e9, #6366f1)',
  'linear-gradient(135deg, #10b981, #0ea5e9)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #ec4899, #a855f7)',
  'linear-gradient(135deg, #14b8a6, #6366f1)',
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
    const steps = 30;
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

/* ── Stat Card with Sci-Fi Border Glow ── */
function StatCard({ label, value, subText, accent, icon: Icon, i }: { label: string; value: any; subText: string; accent: string; icon: any; i: number }) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -3 }}
      style={{
        background: `radial-gradient(160px circle at ${coords.x}px ${coords.y}px, rgba(255,255,255,0.04), transparent 75%), rgba(255,255,255,0.015)`,
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: '12px', padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: '4px',
        position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: accent, opacity: 0.8,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <Icon size={12} style={{ color: accent, opacity: 0.8 }} />
      </div>

      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f5f5f7', letterSpacing: '-0.04em', lineHeight: 1.2 }}>
        <AnimatedCounter value={value} />
      </div>

      <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', fontWeight: 'bold' }}>
        {subText}
      </div>
    </motion.div>
  );
}

/* ── Sci-Fi Project Card ── */
interface ProjectCardProps {
  p: any;
  i: number;
  navigate: any;
  onDeleteClick: (e: React.MouseEvent) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] as any }
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

function ProjectCard({ p, i, navigate, onDeleteClick }: ProjectCardProps) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  
  // Calculate mock progress and status derived from project metadata
  const progressVal = Math.round(55 + (p.name.charCodeAt(0) % 35));
  const isSync = p.name.length % 2 === 0;

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
      whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}
      style={{
        background: `radial-gradient(220px circle at ${coords.x}px ${coords.y}px, rgba(255,255,255,0.03), transparent 70%), rgba(255,255,255,0.015)`,
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '16px', padding: '24px',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: '16px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: gradients[i % gradients.length],
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: '14.5px', fontWeight: 700, color: '#f5f5f7',
            letterSpacing: '-0.02em', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {p.name}
          </h3>
          <span style={{
            fontSize: '8px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
            background: isSync ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.05)',
            color: isSync ? '#818cf8' : 'rgba(255,255,255,0.4)',
            letterSpacing: '0.05em', border: isSync ? '1px solid rgba(99,102,241,0.15)' : '1px solid rgba(255,255,255,0.05)',
            flexShrink: 0
          }}>
            {isSync ? 'IN_SYNC' : 'PAUSED'}
          </span>
        </div>

        <motion.button
          onClick={e => {
            e.stopPropagation();
            onDeleteClick(e);
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: '6px', padding: '5px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ef4444', flexShrink: 0, marginLeft: '8px'
          }}
        >
          <Trash2 size={11} />
        </motion.button>
      </div>

      {/* Description */}
      {p.description ? (
        <p style={{
          fontSize: '12px', color: 'rgba(255,255,255,0.38)',
          lineHeight: 1.5, display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0
        }}>
          {p.description}
        </p>
      ) : (
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', margin: 0 }}>
          No description provided for this project module.
        </p>
      )}

      {/* Progress slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Layers size={10} /> Progress
          </span>
          <span style={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>
            {progressVal}%
          </span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', position: 'relative', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressVal}%` }}
            transition={{ delay: i * 0.08, duration: 1, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: gradients[i % gradients.length],
              borderRadius: '99px',
            }}
          />
        </div>
      </div>

      {/* Footer details */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Mock Members */}
        <div style={{ display: 'flex', gap: '-4px' }}>
          {['JD', 'KL'].map((m, mIdx) => (
            <div
              key={mIdx}
              style={{
                width: '20px', height: '20px', borderRadius: '5px',
                background: `linear-gradient(135deg, #4f46e5, #a855f7)`,
                border: '2px solid #07070a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '8px', fontWeight: 700, color: '#fff',
                marginLeft: mIdx > 0 ? '-5px' : 0,
                zIndex: 5 - mIdx,
              }}
            >
              {m}
            </div>
          ))}
        </div>

        <motion.span
          animate={{ x: hovered ? 3 : 0 }}
          transition={{ duration: 0.15 }}
          style={{
            fontSize: '10.5px', fontWeight: 600, color: 'rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          Open Board <ArrowRight size={11} />
        </motion.span>
      </div>
    </motion.div>
  );
}

export default function ProjectsTab({ projects, currentWs, workspaces, refetchProjects }: ProjectsTabProps) {
  const navigate = useNavigate();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
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
      toast.success('Project deleted successfully');
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
      await projectApi.create(currentWs.id, newProjName.trim(), newProjDesc.trim() || undefined);
      toast.success('Project module created!');
      setNewProjName('');
      setNewProjDesc('');
      setShowNewProject(false);
      refetchProjects();
    } catch {
      toast.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <StatCard
          label="Total Projects"
          value={projects.length}
          subText="ACTIVE_MODULES"
          accent="#818cf8"
          icon={FolderOpen}
          i={0}
        />
        <StatCard
          label="Workspace Count"
          value={workspaces.length}
          subText="TEAMS_DEPLOYED"
          accent="#a855f7"
          icon={Users}
          i={1}
        />
        <StatCard
          label="Project Sync"
          value="92%"
          subText="IN_SYNC_SLA"
          accent="#10b981"
          icon={Sparkles}
          i={2}
        />
      </div>

      {/* Toolbar / Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px', padding: '9px 12px', flex: 1, maxWidth: '320px',
        }}>
          <Search size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search active modules…"
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
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '13px' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={14} /> New Project
        </motion.button>
      </div>

      {/* New Project inline form */}
      <AnimatePresence>
        {showNewProject && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '12px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '14px', padding: '18px 20px',
              boxShadow: '0 8px 30px rgba(99,102,241,0.05)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <LayoutGrid size={13} style={{ color: '#6366f1' }} /> Create Project Module
                </span>
                <button
                  onClick={() => setShowNewProject(false)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>NAME</label>
                  <input
                    className="tf-input"
                    placeholder="E.g., Fintech App Redesign"
                    value={newProjName}
                    onChange={e => setNewProjName(e.target.value)}
                    disabled={creating}
                    style={{
                      background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '12.5px', outline: 'none'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>DESCRIPTION</label>
                  <input
                    className="tf-input"
                    placeholder="Short summary of goals..."
                    value={newProjDesc}
                    onChange={e => setNewProjDesc(e.target.value)}
                    disabled={creating}
                    style={{
                      background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '12.5px', outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  className="btn-ghost"
                  onClick={() => setShowNewProject(false)}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={createProject}
                  disabled={creating || !newProjName.trim()}
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                >
                  {creating ? 'Creating…' : 'Create Module'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Projects grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' }}>
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              gridColumn: '1 / -1',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '64px 24px', gap: '16px',
              border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '12px',
              background: 'rgba(255,255,255,0.01)',
            }}
          >
            <FolderOpen size={44} strokeWidth={1} style={{ color: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
                {search ? 'No matching modules' : 'No project modules'}
              </div>
              <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.2)' }}>
                {search ? 'Try adjusting your search criteria' : 'Create your first project module to get started'}
              </div>
            </div>
            {!search && (
              <button className="btn-primary" onClick={() => setShowNewProject(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '12.5px' }}>
                <Plus size={13} /> Create Project
              </button>
            )}
          </motion.div>
        )}
      </div>

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
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#111116', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '380px',
                boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Trash2 size={16} style={{ color: '#ef4444' }} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f5f5f7', marginBottom: '8px' }}>Delete project module?</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '20px' }}>
                <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{deleteProjName}</strong> and all its associated data will be permanently deleted.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn-ghost" onClick={() => { setShowDeleteModal(false); setDeleteProjId(''); setDeleteProjName(''); }}
                  style={{ fontSize: '13px', padding: '7px 14px' }}>
                  Cancel
                </button>
                <button
                  disabled={deleting}
                  onClick={deleteProject}
                  style={{
                    background: '#ef4444', border: 'none', borderRadius: '8px',
                    color: '#fff', fontWeight: 700, fontSize: '13px',
                    padding: '7px 14px', cursor: 'pointer', opacity: deleting ? 0.6 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {deleting ? 'Deleting…' : 'Delete module'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
