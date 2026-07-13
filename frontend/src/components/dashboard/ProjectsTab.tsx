import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, ArrowRight, Trash2, LayoutGrid, Search } from 'lucide-react';
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
    { label: 'Total Projects', value: projects.length, accent: '#6366f1' },
    { label: 'Workspaces',     value: workspaces.length, accent: '#a855f7' },
    { label: 'Active',         value: projects.length > 0 ? projects.length : '—', accent: '#10b981' },
    { label: 'Status',         value: 'Online', accent: '#0ea5e9' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px', padding: '18px 20px',
              display: 'flex', flexDirection: 'column', gap: '6px',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Accent bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
              background: s.accent, opacity: 0.7,
            }} />
            <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#f5f5f7' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '9px', padding: '8px 12px', flex: 1, maxWidth: '320px',
        }}>
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
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={15} /> New Project
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
              display: 'flex', gap: '10px', alignItems: 'center',
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: '12px', padding: '14px 16px',
              boxShadow: '0 0 0 3px rgba(99,102,241,0.07)',
            }}>
              <LayoutGrid size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
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
              <button className="btn-primary" onClick={createProject} disabled={creating}
                style={{ padding: '6px 14px', fontSize: '12px' }}>
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button onClick={() => setShowNewProject(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px', padding: '0 4px', lineHeight: 1 }}>
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Projects grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        <AnimatePresence>
          {filtered.map((p: any, i: number) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => navigate(`/board/${p.id}`)}
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px', padding: '20px',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              whileHover={{
                borderColor: 'rgba(255,255,255,0.12)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Gradient accent bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                background: gradients[i % gradients.length],
              }} />

              {/* Delete button */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  setDeleteProjId(p.id);
                  setDeleteProjName(p.name);
                  setShowDeleteModal(true);
                }}
                style={{
                  position: 'absolute', top: '14px', right: '14px',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: '6px', padding: '5px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#ef4444', opacity: 0, transition: 'opacity 0.2s',
                }}
                className="project-delete-btn"
              >
                <Trash2 size={12} />
              </button>

              <div style={{ marginBottom: '12px' }}>
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
                paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '6px',
                  background: gradients[i % gradients.length], opacity: 0.8,
                }} />
                <span style={{
                  fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  Open board <ArrowRight size={11} />
                </span>
              </div>
            </motion.div>
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
              border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px',
            }}
          >
            <FolderOpen size={48} strokeWidth={1} style={{ color: 'rgba(255,255,255,0.15)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                {search ? 'No matching projects' : 'No projects yet'}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>
                {search ? 'Try a different search term' : 'Create your first project to get started'}
              </div>
            </div>
            {!search && (
              <button className="btn-primary" onClick={() => setShowNewProject(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}>
                <Plus size={14} /> Create Project
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
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f5f5f7', marginBottom: '8px' }}>Delete project?</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '20px' }}>
                <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{deleteProjName}</strong> and all its columns, tasks, and comments will be permanently deleted.
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
                  {deleting ? 'Deleting…' : 'Delete project'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .project-delete-btn { opacity: 0 !important; }
        div:hover > .project-delete-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
