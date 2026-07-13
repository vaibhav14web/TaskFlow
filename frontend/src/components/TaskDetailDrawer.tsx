import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { taskApi, attachmentApi, timeLogApi } from '../api';
import api from '../api';
import type { Task, Column, TimeLog } from '../api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  X, Save, Trash2, Paperclip, Upload, Check, Plus,
  MessageSquare, CheckSquare, Activity, Pencil, Clock, Play, Square
} from 'lucide-react';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const pClass: Record<string, string> = {
  URGENT: 'badge-urgent', HIGH: 'badge-high',
  MEDIUM: 'badge-medium', LOW: 'badge-low',
};

interface Props {
  task: Task | null;
  columns: (Column & { tasks: Task[] })[];
  onClose: () => void;
}

/* ─── Section Toggle ─── */
function Section({ title, icon: Icon, count, children, defaultOpen = true }: {
  title: string; icon: any; count?: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px', marginBottom: '12px' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.4)', padding: '6px 0',
          marginBottom: open ? '10px' : 0,
          fontWeight: 650, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em'
        }}
      >
        <Icon size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
        <span>{title}</span>
        {count !== undefined && (
          <span style={{
            fontSize: '10px', background: 'rgba(255,255,255,0.06)',
            padding: '1px 6px', borderRadius: '99px', fontWeight: 700,
            color: 'rgba(255,255,255,0.5)', marginLeft: '4px'
          }}>
            {count}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && children}
    </div>
  );
}

/* ─── Checklist Item with Confetti Sparkles ─── */
function ChecklistItem({ item, toggleCheckItem, deleteCheckItem }: {
  item: any;
  toggleCheckItem: (id: string, completed: boolean) => void;
  deleteCheckItem: (id: string) => void;
}) {
  const [active, setActive] = useState(false);

  const handleToggle = () => {
    const nextCompleted = !item.completed;
    toggleCheckItem(item.id, item.completed);
    if (nextCompleted) {
      setActive(true);
      setTimeout(() => setActive(false), 800);
    }
  };

  const particles = Array.from({ length: 16 }).map((_, i) => ({
    id: i,
    angle: (i / 16) * 360,
    dist: 30 + Math.random() * 25,
    size: 2 + Math.random() * 4,
  }));

  return (
    <div className="checklist-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, position: 'relative' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button
            className={`checklist-checkbox ${item.completed ? 'checked' : ''}`}
            onClick={handleToggle}
            style={{
              width: '18px', height: '18px', borderRadius: '5px',
              border: '1.5px solid rgba(255,255,255,0.15)',
              background: item.completed ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s', padding: 0
            }}
          >
            {item.completed && <Check size={11} style={{ color: '#fff' }} />}
          </button>

          {/* Sparkles */}
          <AnimatePresence>
            {active && (
              <div style={{ position: 'absolute', left: '9px', top: '9px', pointerEvents: 'none', zIndex: 10 }}>
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
                        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>

        <span className={`checklist-label ${item.completed ? 'completed' : ''}`} style={{
          fontSize: '13px', color: item.completed ? 'rgba(255,255,255,0.25)' : '#f5f5f7',
          textDecoration: item.completed ? 'line-through' : 'none', transition: 'all 0.2s',
          marginLeft: '4px'
        }}>
          {item.label}
        </span>
      </div>
      <button
        className="btn-icon"
        onClick={() => deleteCheckItem(item.id)}
        style={{ padding: 4, display: 'flex', color: 'var(--color-danger)', opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function TaskDetailDrawer({ task, columns, onClose }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user: currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [colId, setColId] = useState('');

  // Comments
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Checklist
  const [newCheckItem, setNewCheckItem] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDesc(task.description || '');
      setPriority(task.priority);
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
      setColId(task.columnId);
    }
  }, [task]);

  // ─── Queries ───
  const { projectId } = useParams<{ projectId: string }>();

  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then((r: any) => r.data.data),
    enabled: !!projectId,
  });
  const workspaceId = projectData?.workspaceId;

  const { data: membersData } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/members`).then((r: any) => r.data.data as any[]),
    enabled: !!workspaceId,
  });
  const members: any[] = membersData || [];

  const { data: logsData } = useQuery({
    queryKey: ['task-logs', task?.id],
    queryFn: () => taskApi.logs(task!.id).then((r: any) => r.data as any[]),
    enabled: !!task,
  });
  const logs: any[] = logsData || [];

  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ['task-comments', task?.id],
    queryFn: () => api.get(`/tasks/${task!.id}/comments`).then((r: any) => r.data.data as any[]),
    enabled: !!task,
  });
  const comments: any[] = commentsData || [];

  const { data: checklistData, refetch: refetchChecklist } = useQuery({
    queryKey: ['task-checklist', task?.id],
    queryFn: () => api.get(`/tasks/${task!.id}/checklist`).then((r: any) =>
      (r.data.data as any[] || []).map((item: any) => ({
        ...item,
        completed: item.isDone
      }))
    ),
    enabled: !!task,
  });
  const checklist: any[] = checklistData || [];

  const { data: attachData, refetch: refetchAttach } = useQuery({
    queryKey: ['task-attachments', task?.id],
    queryFn: () => attachmentApi.list(task!.id).then((r: any) => r.data as any[]),
    enabled: !!task,
  });
  const attachments: any[] = attachData || [];

  const { data: assigneesData, refetch: refetchAssignees } = useQuery({
    queryKey: ['task-assignees', task?.id],
    queryFn: () => api.get(`/tasks/${task!.id}/assignees`).then((r: any) => r.data.data as any[]),
    enabled: !!task,
  });
  const assignees: any[] = assigneesData || [];

  // ─── Time Tracking State & Query ───
  const [timerActive, setTimerActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [logDesc, setLogDesc] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [manualMins, setManualMins] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  const { data: timeLogsData, refetch: refetchTimeLogs } = useQuery({
    queryKey: ['task-timelogs', task?.id],
    queryFn: () => timeLogApi.list(task!.id).then((r: any) => r.data as TimeLog[]),
    enabled: !!task,
  });
  const timeLogs = timeLogsData || [];

  useEffect(() => {
    let interval: any;
    if (timerActive) {
      interval = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const handleSaveTimerLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || elapsedSeconds <= 0) return;
    try {
      await timeLogApi.create(task.id, elapsedSeconds, logDesc.trim() || undefined);
      toast.success('Time log saved!');
      setTimerActive(false);
      setElapsedSeconds(0);
      setLogDesc('');
      refetchTimeLogs();
    } catch {
      toast.error('Failed to save time log');
    }
  };

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const hrs = parseInt(manualHours) || 0;
    const mins = parseInt(manualMins) || 0;
    const totalSecs = (hrs * 3600) + (mins * 60);
    if (!task || totalSecs <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }
    try {
      await timeLogApi.create(task.id, totalSecs, manualDesc.trim() || undefined);
      toast.success('Time log added!');
      setManualHours('');
      setManualMins('');
      setManualDesc('');
      refetchTimeLogs();
    } catch {
      toast.error('Failed to add manual log');
    }
  };

  const handleDeleteTimeLog = async (logId: string) => {
    if (!task) return;
    try {
      await timeLogApi.delete(task.id, logId);
      toast.success('Time log deleted');
      refetchTimeLogs();
    } catch {
      toast.error('Failed to delete time log');
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  // ─── Mutations ───
  const updateMut = useMutation({
    mutationFn: () => {
      const payload: any = { title: title.trim(), description: desc.trim(), priority };
      if (dueDate) payload.dueDate = dueDate;
      if (colId && colId !== task!.columnId) payload.columnId = colId;
      return taskApi.update(task!.id, payload);
    },
    onSuccess: () => { toast.success('Task updated'); qc.invalidateQueries({ queryKey: ['board'] }); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Update failed'),
  });

  const deleteMut = useMutation({
    mutationFn: () => taskApi.delete(task!.id),
    onSuccess: () => { toast.success('Task deleted'); qc.invalidateQueries({ queryKey: ['board'] }); onClose(); },
    onError: () => toast.error('Delete failed'),
  });

  // Comments
  const postComment = async () => {
    if (!newComment.trim() || !task) return;
    try {
      await api.post(`/tasks/${task.id}/comments`, { body: newComment.trim() });
      setNewComment('');
      refetchComments();
      toast.success('Comment added');
    } catch {
      toast.error('Failed to post comment');
    }
  };

  // Checklist
  const addCheckItem = async () => {
    if (!newCheckItem.trim() || !task) return;
    try {
      await api.post(`/tasks/${task.id}/checklist`, { label: newCheckItem.trim() });
      setNewCheckItem('');
      refetchChecklist();
    } catch {
      toast.error('Failed to add item');
    }
  };

  const toggleCheckItem = async (itemId: string, completed: boolean) => {
    try {
      await api.patch(`/checklist/${itemId}`, { isDone: !completed });
      refetchChecklist();
    } catch {
      toast.error('Failed to toggle');
    }
  };

  const deleteCheckItem = async (itemId: string) => {
    try {
      await api.delete(`/checklist/${itemId}`);
      refetchChecklist();
      toast.success('Checklist item deleted');
    } catch {
      toast.error('Failed to delete item');
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/comments/${commentId}`);
      refetchComments();
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const saveEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      await api.patch(`/comments/${commentId}`, { body: editingCommentText.trim() });
      setEditingCommentId(null);
      setEditingCommentText('');
      refetchComments();
      toast.success('Comment updated');
    } catch {
      toast.error('Failed to update comment');
    }
  };

  const startEditComment = (id: string, text: string) => {
    setEditingCommentId(id);
    setEditingCommentText(text);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  // Attachments
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;
    try {
      await attachmentApi.upload(task.id, file);
      refetchAttach();
      toast.success('File uploaded');
    } catch {
      toast.error('Upload failed');
    }
    e.target.value = '';
  };

  const deleteAttachment = async (id: string) => {
    try {
      await attachmentApi.delete(id);
      refetchAttach();
      toast.success('Attachment removed');
    } catch {
      toast.error('Failed to remove');
    }
  };

  const assignUser = async (userId: string) => {
    if (!task) return;
    try {
      await api.post(`/tasks/${task.id}/assignees`, { userId });
      refetchAssignees();
      qc.invalidateQueries({ queryKey: ['board'] });
      toast.success('User assigned');
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to assign user');
    }
  };

  const unassignUser = async (userId: string) => {
    if (!task) return;
    try {
      await api.delete(`/tasks/${task.id}/assignees/${userId}`);
      refetchAssignees();
      qc.invalidateQueries({ queryKey: ['board'] });
      toast.success('User unassigned');
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to unassign user');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const avatarGrads = [
    'linear-gradient(135deg,#a855f7,#ec4899)',
    'linear-gradient(135deg,#3b82f6,#06b6d4)',
    'linear-gradient(135deg,#22c55e,#14b8a6)',
    'linear-gradient(135deg,#f97316,#fbbf24)',
  ];

  const completedCount = checklist.filter((c: any) => c.completed).length;

  return (
    <AnimatePresence>
      {task && (
        <>
          <motion.div
            className="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            className="glass drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            {/* Header */}
            <div className="drawer-header">
              <span className="drawer-header-label">Task Detail</span>
              <button className="btn-icon" onClick={onClose}><X size={18} /></button>
            </div>

            {/* Body */}
            <div className="drawer-body">
              {/* Title */}
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  className="tf-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}
                />
              </div>

              {/* Priority & Due Date */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                    {PRIORITIES.map(p => (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`badge ${pClass[p]}`}
                        style={{
                          cursor: 'pointer',
                          border: priority === p ? '1px solid currentColor' : '1px solid transparent',
                          background: priority === p ? undefined : 'transparent',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    className="tf-input"
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    style={{ fontSize: 'var(--text-sm)' }}
                  />
                </div>
              </div>

              {/* Column */}
              <div className="form-group">
                <label className="form-label">Column</label>
                <select className="tf-input" value={colId} onChange={e => setColId(e.target.value)}>
                  {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="tf-input"
                  rows={4}
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Add details…"
                />
              </div>

              {/* Assignees */}
              <Section title="Assignees" icon={({ size, ...p }: any) => <span {...p}>👤</span>} count={assignees.length} defaultOpen={assignees.length > 0}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {/* Avatars Grid */}
                  {assignees.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                      {assignees.map((a: any, i: number) => (
                        <div
                          key={a.id || i}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'var(--color-surface-hover)', padding: '2px 8px 2px 4px',
                            borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)',
                          }}
                        >
                          <div
                            className="avatar"
                            style={{
                              background: avatarGrads[i % avatarGrads.length],
                              width: 22, height: 22, fontSize: 'var(--text-xs)'
                            }}
                            title={a.name}
                          >
                            {getInitials(a.name)}
                          </div>
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>{a.name}</span>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => unassignUser(a.id)}
                            style={{
                              padding: 2, display: 'flex', color: 'var(--color-text-dim)',
                              height: 'auto', minHeight: 0
                            }}
                            title="Unassign user"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>No assignees yet.</p>
                  )}

                  {/* Add Assignee Dropdown */}
                  {workspaceId && (
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                      <select
                        className="tf-input"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            assignUser(e.target.value);
                          }
                        }}
                        style={{ fontSize: 'var(--text-xs)', height: 32, padding: '0 8px', flex: 1 }}
                      >
                        <option value="">+ Assign user…</option>
                        {members
                          .filter((m: any) => m.user && !assignees.some((a: any) => a.id === m.user.id))
                          .map((m: any) => (
                            <option key={m.user.id} value={m.user.id}>
                              {m.user.name} ({m.user.email})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              </Section>

              {/* Checklist */}
              <Section title="Checklist" icon={CheckSquare} count={checklist.length > 0 ? checklist.length : undefined}>
                {checklist.length > 0 && (
                  <>
                    <div className="progress-bar" style={{ marginBottom: 'var(--space-md)' }}>
                      <div
                        className="progress-fill success"
                        style={{ width: `${checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0}%` }}
                      />
                    </div>
                    <div style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {completedCount}/{checklist.length} completed
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {checklist.map((item: any) => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      toggleCheckItem={toggleCheckItem}
                      deleteCheckItem={deleteCheckItem}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-xs)', marginTop: 'var(--space-sm)' }}>
                  <input
                    className="tf-input"
                    placeholder="Add item…"
                    value={newCheckItem}
                    onChange={e => setNewCheckItem(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addCheckItem(); }}
                    style={{ fontSize: 'var(--text-sm)' }}
                  />
                  <button className="btn-ghost" onClick={addCheckItem} style={{ padding: '0.4rem 0.6rem' }}>
                    <Plus size={14} />
                  </button>
                </div>
              </Section>

              {/* Attachments */}
              <Section title="Attachments" icon={Paperclip} count={attachments.length > 0 ? attachments.length : undefined}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {attachments.map((att: any) => (
                    <div key={att.id} className="attachment-item">
                      <div className="attachment-icon">📄</div>
                      <div className="attachment-info">
                        <div className="attachment-name">{att.filename}</div>
                      </div>
                      <button
                        className="btn-icon"
                        onClick={() => deleteAttachment(att.id)}
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn-ghost"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}
                  >
                    <Upload size={14} /> Upload File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </div>
              </Section>

              {/* Time Tracking */}
              <Section title="Time Tracking" icon={Clock} count={timeLogs.length > 0 ? timeLogs.length : undefined}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  
                  {/* Stopwatch Tracker */}
                  <div style={{
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px', padding: '12px 16px',
                    display: 'flex', flexDirection: 'column', gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Live Stopwatch
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-md)', fontWeight: 700, color: timerActive ? '#10b981' : '#f5f5f7' }}>
                        {formatTime(elapsedSeconds)}
                      </span>
                    </div>

                    {!timerActive ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => { setTimerActive(true); setElapsedSeconds(0); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.45rem', fontSize: 'var(--text-sm)' }}
                      >
                        <Play size={12} /> Start Timer
                      </button>
                    ) : (
                      <form onSubmit={handleSaveTimerLog} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          className="tf-input"
                          placeholder="What did you work on? (optional)"
                          value={logDesc}
                          onChange={e => setLogDesc(e.target.value)}
                          style={{ fontSize: 'var(--text-xs)', padding: '6px 10px' }}
                        />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="submit"
                            style={{ flex: 1, background: '#ef4444', border: 'none', color: '#fff', borderRadius: '6px', padding: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                          >
                            <Square size={10} /> Stop & Save
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => { setTimerActive(false); setElapsedSeconds(0); setLogDesc(''); }}
                            style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', minHeight: 0, height: 'auto' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Manual Log */}
                  <form onSubmit={handleManualLog} style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: '8px', padding: '12px 16px',
                    display: 'flex', flexDirection: 'column', gap: '10px'
                  }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Log Time Manually
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="number"
                        min="0"
                        placeholder="Hrs"
                        className="tf-input"
                        value={manualHours}
                        onChange={e => setManualHours(e.target.value)}
                        style={{ flex: 1, textAlign: 'center', padding: '6px' }}
                      />
                      <input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="Mins"
                        className="tf-input"
                        value={manualMins}
                        onChange={e => setManualMins(e.target.value)}
                        style={{ flex: 1, textAlign: 'center', padding: '6px' }}
                      />
                    </div>
                    <input
                      placeholder="Log description (optional)"
                      className="tf-input"
                      value={manualDesc}
                      onChange={e => setManualDesc(e.target.value)}
                      style={{ fontSize: 'var(--text-xs)', padding: '6px 10px' }}
                    />
                    <button
                      type="submit"
                      className="btn-ghost"
                      style={{ padding: '0.4rem', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Plus size={12} /> Log Time
                    </button>
                  </form>

                  {/* Log History */}
                  {timeLogs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        Time Log History
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                        {timeLogs.map((log: TimeLog) => {
                          const isLogger = currentUser && log.userId === currentUser.id;
                          return (
                            <div key={log.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)',
                              borderRadius: '6px', padding: '8px 12px'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: '#f5f5f7' }}>
                                  {log.user.name} &bull; <span style={{ color: '#818cf8', fontWeight: 700 }}>{formatDuration(log.durationSeconds)}</span>
                                </div>
                                {log.description && (
                                  <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {log.description}
                                  </div>
                                )}
                              </div>
                              {isLogger && (
                                <button
                                  type="button"
                                  className="btn-icon"
                                  onClick={() => handleDeleteTimeLog(log.id)}
                                  style={{ padding: 4, color: 'var(--color-danger)' }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              </Section>

              {/* Comments */}
              <Section title="Comments" icon={MessageSquare} count={comments.length > 0 ? comments.length : undefined}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {comments.map((c: any, i: number) => {
                    const isAuthor = currentUser && c.userId === currentUser.id;
                    const isEditing = editingCommentId === c.id;

                    return (
                      <div key={c.id || i} className="comment">
                        <div
                          className="avatar avatar-sm"
                          style={{ background: avatarGrads[i % avatarGrads.length] }}
                        >
                          {getInitials(c.user?.name || c.author?.name)}
                        </div>
                        <div className="comment-body" style={{ flex: 1 }}>
                          <div className="comment-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <div>
                              <span className="comment-author">{c.user?.name || c.author?.name || 'User'}</span>
                              <span className="comment-time">
                                {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                              </span>
                            </div>
                            {isAuthor && !isEditing && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  className="btn-icon"
                                  onClick={() => startEditComment(c.id, c.body)}
                                  style={{ padding: 2, color: 'var(--color-text-dim)' }}
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  className="btn-icon"
                                  onClick={() => deleteComment(c.id)}
                                  style={{ padding: 2, color: 'var(--color-danger)' }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {isEditing ? (
                            <div style={{ marginTop: 'var(--space-xs)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                              <textarea
                                className="tf-input"
                                value={editingCommentText}
                                onChange={e => setEditingCommentText(e.target.value)}
                                style={{ width: '100%', minHeight: '60px', fontSize: 'var(--text-sm)' }}
                              />
                              <div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
                                <button
                                  className="btn-ghost"
                                  onClick={cancelEditComment}
                                  style={{ padding: '0.2rem 0.5rem', fontSize: 'var(--text-xs)', height: 'auto', minHeight: 0 }}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="btn-primary"
                                  onClick={() => saveEditComment(c.id)}
                                  style={{ padding: '0.2rem 0.5rem', fontSize: 'var(--text-xs)', height: 'auto', minHeight: 0 }}
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="comment-text">{c.body}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* New comment */}
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                  <input
                    className="tf-input"
                    placeholder="Write a comment… (use @name to mention)"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                    style={{ fontSize: 'var(--text-sm)' }}
                  />
                  <button
                    className="btn-primary"
                    onClick={postComment}
                    style={{ padding: '0.5rem 0.8rem', fontSize: 'var(--text-sm)' }}
                    disabled={!newComment.trim()}
                  >
                    Send
                  </button>
                </div>
              </Section>

              {/* Activity */}
              {logs.length > 0 && (
                <Section title="Activity" icon={Activity} count={logs.length} defaultOpen={false}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    {logs.slice(0, 10).map((log: any, i: number) => (
                      <div key={i} className="activity-item">
                        <div className="activity-dot" />
                        <div className="activity-content">
                          <div className="activity-text">{log.action}</div>
                          <div className="activity-time">{new Date(log.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>

            {/* Footer */}
            <div className="drawer-footer">
              <button
                className="btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={() => updateMut.mutate()}
                disabled={updateMut.isPending}
              >
                <Save size={16} /> {updateMut.isPending ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                className="btn-danger"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 0.8rem' }}
                onClick={() => { if (window.confirm('Delete this task?')) deleteMut.mutate(); }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
