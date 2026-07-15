import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import {
  DndContext, closestCenter, DragOverlay,
  PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { boardApi, taskApi, API_BASE_URL, timeLogApi } from '../api';
import api from '../api';
import type { Task, Column, BillingReport } from '../api';
import toast from 'react-hot-toast';
import TaskDetailDrawer from '../components/TaskDetailDrawer';
import {
  ArrowLeft, Plus, Search, X, GripVertical, Trash2,
  Calendar, Pencil, DollarSign, Printer, ChevronLeft, ChevronRight
} from 'lucide-react';

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

const colGrads = [
  'linear-gradient(135deg,#3b82f6,#06b6d4)',
  'linear-gradient(135deg,#a855f7,#ec4899)',
  'linear-gradient(135deg,#22c55e,#14b8a6)',
  'linear-gradient(135deg,#818cf8,#c084fc)',
  'linear-gradient(135deg,#f97316,#fbbf24)',
];

const priorityBadge: Record<string, string> = {
  URGENT: 'badge-urgent',
  HIGH: 'badge-high',
  MEDIUM: 'badge-medium',
  LOW: 'badge-low',
};

/* ── Keycap Badge ──────────────────────────────────── */
function Key({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      whileHover={{ y: -1, scale: 1.05, borderColor: 'rgba(168,85,247,0.3)', color: '#a855f7' }}
      whileTap={{ scale: 0.95 }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '1px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 700,
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
        color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', lineHeight: 1.5,
        boxShadow: '0 1px 0 rgba(255,255,255,0.05)',
        userSelect: 'none', flexShrink: 0,
        cursor: 'pointer',
        transition: 'color 0.2s, border-color 0.2s',
      }}
    >
      {children}
    </motion.span>
  );
}

/* ─── Sortable Task Card ─── */
function SortableTaskCard({ task, colIndex, onClick }: { task: Task; colIndex: number; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useTransform(my, [-50, 50], [10, -10]);
  const rotateY = useTransform(mx, [-50, 50], [-10, 10]);

  const spotlightX = useMotionValue(0);
  const spotlightY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    mx.set(mouseX);
    my.set(mouseY);
    spotlightX.set(e.clientX - rect.left);
    spotlightY.set(e.clientY - rect.top);
  };

  const handleMouseLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const getPriorityColor = () => {
    if (task.priority === 'URGENT') return '#ef4444';
    if (task.priority === 'HIGH') return '#f59e0b';
    if (task.priority === 'MEDIUM') return '#eab308';
    return '#6366f1';
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <motion.div
        className={`glass task-card ${isDragging ? 'dragging' : ''}`}
        style={{
          rotateX, rotateY,
          transformStyle: 'preserve-3d' as any,
          perspective: 800,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'grab',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: isDragging ? '0 20px 40px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.15)',
          // Pass motion values to CSS variables directly
          ['--spotlight-x' as any]: useTransform(spotlightX, (val) => `${val}px`),
          ['--spotlight-y' as any]: useTransform(spotlightY, (val) => `${val}px`),
        }}
        whileHover={{ scale: 1.02, y: -2, borderColor: 'rgba(255,255,255,0.12)' }}
        whileTap={{ scale: 0.98 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: colGrads[colIndex % colGrads.length]
        }} />

        {/* Glow spotlight background using CSS variables */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(150px circle at var(--spotlight-x, 0px) var(--spotlight-y, 0px), ${getPriorityColor()}1e, transparent 70%)`,
          zIndex: 0
        }} />

        {/* Drag handle */}
        <div
          {...listeners}
          style={{
            position: 'absolute', top: 10, right: 10,
            cursor: 'grab', color: 'rgba(255,255,255,0.2)',
            padding: 2, zIndex: 5,
          }}
          onClick={e => e.stopPropagation()}
        >
          <GripVertical size={13} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, padding: '14px 16px 12px' }}>
          <h4 style={{
            fontSize: '13px', fontWeight: 650, color: '#f5f5f7',
            letterSpacing: '-0.02em', margin: '0 0 6px 0',
            paddingRight: '16px', lineHeight: 1.4
          }}>
            {task.title}
          </h4>

          {task.description && (
            <p style={{
              fontSize: '12px', color: 'rgba(255,255,255,0.35)',
              margin: '0 0 12px 0', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {task.description}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`badge ${priorityBadge[task.priority] || 'badge-low'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                {task.priority}
              </span>
              {task.dueDate && (
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={10} />
                  {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            <Key>↵</Key>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Static Task Card (for drag overlay) ─── */
function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div className="glass task-card" style={{
      boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
      cursor: 'grabbing',
      width: 280,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)',
      padding: '14px 16px',
    }}>
      <h4 style={{ fontSize: '13px', fontWeight: 650, color: '#f5f5f7', margin: '0 0 6px 0' }}>{task.title}</h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className={`badge ${priorityBadge[task.priority] || 'badge-low'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>{task.priority}</span>
      </div>
    </div>
  );
}

/* ─── Sortable Column Container ─── */
interface SortableColumnProps {
  col: any;
  colIndex: number;
  tasks: Task[];
  addingToCol: string | null;
  setAddingToCol: (colId: string | null) => void;
  newTaskTitle: string;
  setNewTaskTitle: (title: string) => void;
  addTask: (colId: string, priority: string) => void;
  deleteColumn: (colId: string) => void;
  startEditCol: (id: string, name: string) => void;
  editingColId: string | null;
  editingColName: string;
  setEditingColName: (name: string) => void;
  saveColName: (id: string) => void;
  setSelectedTask: (task: Task | null) => void;
}

function SortableColumn({
  col, colIndex, tasks, addingToCol, setAddingToCol, newTaskTitle, setNewTaskTitle,
  addTask, deleteColumn, startEditCol, editingColId, editingColName, setEditingColName,
  saveColName, setSelectedTask
}: SortableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: 'col-' + col.id
  });

  const [newTaskPriority, setNewTaskPriority] = useState<string>('MEDIUM');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const priorityColors: Record<string, string> = {
    LOW: '#6366f1', MEDIUM: '#eab308', HIGH: '#f59e0b', URGENT: '#ef4444'
  };

  return (
    <div ref={setNodeRef} style={style} className="kanban-column">
      {/* Column Header */}
      <div className="glass column-header" style={{ display: 'flex', alignItems: 'center' }}>
        <div className="column-header-accent" style={{ background: colGrads[colIndex % colGrads.length] }} />
        
        {/* Grab Handle for column reordering */}
        <div
          {...listeners}
          {...attributes}
          style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'var(--color-text-dim)', paddingRight: 4 }}
          title="Drag column"
        >
          <GripVertical size={14} />
        </div>

        <div className="column-header-left" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {editingColId === col.id ? (
            <input
              className="tf-input"
              value={editingColName}
              onChange={e => setEditingColName(e.target.value)}
              onBlur={() => saveColName(col.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveColName(col.id);
                if (e.key === 'Escape') startEditCol('', ''); // cancels
              }}
              autoFocus
              style={{
                fontSize: 'var(--text-sm)', padding: '2px 6px',
                height: '26px', minHeight: 0, width: '130px', margin: 0
              }}
            />
          ) : (
            <span
              className="column-name"
              onClick={() => startEditCol(col.id, col.name)}
              style={{ cursor: 'pointer' }}
              title="Click to rename"
            >
              {col.name}
            </span>
          )}
          <span className="column-count">{tasks.length}</span>
        </div>
        
        <button
          className="btn-icon"
          onClick={() => { if (window.confirm(`Delete "${col.name}"?`)) deleteColumn(col.id); }}
          style={{ color: 'var(--color-text-dim)' }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Tasks */}
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="task-list">
          <AnimatePresence>
            {tasks.map((t: Task) => (
              <SortableTaskCard
                key={t.id}
                task={t}
                colIndex={colIndex}
                onClick={() => setSelectedTask(t)}
              />
            ))}
          </AnimatePresence>

          {tasks.length === 0 && addingToCol !== col.id && (
            <div style={{
              textAlign: 'center', padding: 'var(--space-xl)',
              color: 'var(--color-text-dim)', fontSize: 'var(--text-sm)',
            }}>
              No tasks yet
            </div>
          )}
        </div>
      </SortableContext>

      {/* Add task */}
      {addingToCol === col.id ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginTop: 'var(--space-sm)' }}
        >
          <input
            className="tf-input"
            placeholder="Task title…"
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') addTask(col.id, newTaskPriority);
              if (e.key === 'Escape') setAddingToCol(null);
            }}
          />
          {/* Priority selector */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map(p => (
              <button
                key={p}
                onClick={() => setNewTaskPriority(p)}
                style={{
                  fontSize: '10px', fontWeight: 700, padding: '3px 8px',
                  borderRadius: '99px', border: '1px solid',
                  cursor: 'pointer', transition: 'all 0.15s',
                  borderColor: newTaskPriority === p ? priorityColors[p] : 'rgba(255,255,255,0.1)',
                  background: newTaskPriority === p ? `${priorityColors[p]}22` : 'transparent',
                  color: newTaskPriority === p ? priorityColors[p] : 'rgba(255,255,255,0.3)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            <button
              className="btn-primary"
              style={{ flex: 1, padding: '0.45rem', fontSize: 'var(--text-sm)' }}
              onClick={() => addTask(col.id, newTaskPriority)}
            >
              Add
            </button>
            <button className="btn-ghost" onClick={() => setAddingToCol(null)}>
              <X size={14} />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.button
          className="btn-ghost"
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '0.4rem', padding: '0.55rem', marginTop: 'var(--space-sm)'
          }}
          onClick={() => { setAddingToCol(col.id); setNewTaskTitle(''); setNewTaskPriority('MEDIUM'); }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={14} /> Add Task
        </motion.button>
      )}
    </div>
  );
}

interface SwimlaneColumnCellProps {
  columnId: string;
  swimlaneKey: string;
  tasks: Task[];
  setSelectedTask: (task: Task) => void;
}

function SwimlaneColumnCell({ columnId, swimlaneKey, tasks, setSelectedTask }: SwimlaneColumnCellProps) {
  const cellId = `cell-${columnId}::${swimlaneKey}`;
  const { setNodeRef } = useDroppable({ id: cellId });

  return (
    <div
      ref={setNodeRef}
      style={{
        width: 280, flexShrink: 0, minHeight: '120px',
        background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)',
        borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px'
      }}
    >
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <AnimatePresence>
          {tasks.map((t) => (
            <SortableTaskCard
              key={t.id}
              task={t}
              colIndex={0}
              onClick={() => setSelectedTask(t)}
            />
          ))}
        </AnimatePresence>
      </SortableContext>
      {tasks.length === 0 && (
        <div style={{ margin: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
          Empty Cell
        </div>
      )}
    </div>
  );
}

type ColumnWithTasks = Column & { tasks: Task[] };

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewCol, setShowNewCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [addingToCol, setAddingToCol] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // View & Grouping States
  const [activeView, setActiveView] = useState<'kanban' | 'timeline' | 'billing'>('kanban');
  const [groupBy, setGroupBy] = useState<'none' | 'assignee' | 'priority'>('none');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  // DnD
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data: boardData, isLoading } = useQuery({
    queryKey: ['board', projectId],
    queryFn: () => boardApi.get(projectId!).then((r: any) => r.data),
    enabled: !!projectId,
  });

  const columns: ColumnWithTasks[] = boardData?.columns || [];

  const getSwimlanes = () => {
    if (groupBy === 'priority') {
      return [
        { key: 'URGENT', label: 'Urgent', color: '#ef4444', user: null },
        { key: 'HIGH', label: 'High', color: '#f97316', user: null },
        { key: 'MEDIUM', label: 'Medium', color: '#eab308', user: null },
        { key: 'LOW', label: 'Low', color: '#3b82f6', user: null }
      ];
    }
    if (groupBy === 'assignee') {
      const allTasks = columns.flatMap(c => c.tasks || []);
      const userMap = new Map<string, { id: string; name: string; email: string; avatarUrl?: string | null }>();
      for (const t of allTasks) {
        for (const u of t.assignees || []) {
          userMap.set(u.id, u);
        }
      }
      const users = Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      return [
        ...users.map(u => ({ key: u.id, label: u.name, color: null, user: u })),
        { key: 'unassigned', label: 'Unassigned', color: null, user: null }
      ];
    }
    return [];
  };
  const refetch = useCallback(
    () => qc.invalidateQueries({ queryKey: ['board', projectId] }),
    [qc, projectId]
  );

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameProjName, setRenameProjName] = useState('');
  const [renaming, setRenaming] = useState(false);

  const renameProject = async () => {
    if (!renameProjName.trim() || !projectId) return;
    setRenaming(true);
    try {
      await api.patch(`/projects/${projectId}`, { name: renameProjName.trim() });
      toast.success('Project renamed');
      refetch();
    } catch {
      toast.error('Failed to rename project');
    } finally {
      setRenaming(false);
      setShowRenameModal(false);
    }
  };

  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColName, setEditingColName] = useState('');

  const startEditCol = (id: string, name: string) => {
    setEditingColId(id);
    setEditingColName(name);
  };

  const saveColName = async (id: string) => {
    if (!editingColName.trim()) {
      setEditingColId(null);
      return;
    }
    try {
      await api.patch(`/columns/${id}`, { name: editingColName.trim() });
      setEditingColId(null);
      refetch();
    } catch {
      toast.error('Failed to rename column');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !projectId) return;

    // Connect to Socket.io server
    const socket: Socket = io(API_BASE_URL, {
      path: '/ws',
      query: { token },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      socket.emit('join_project', projectId);
    });

    socket.on('task.created', () => {
      qc.invalidateQueries({ queryKey: ['board', projectId] });
    });
    socket.on('task.updated', () => {
      qc.invalidateQueries({ queryKey: ['board', projectId] });
    });
    socket.on('task.moved', () => {
      qc.invalidateQueries({ queryKey: ['board', projectId] });
    });
    socket.on('task.deleted', () => {
      qc.invalidateQueries({ queryKey: ['board', projectId] });
    });
    socket.on('comment.created', () => {
      qc.invalidateQueries({ queryKey: ['task-comments'] });
    });

    return () => {
      socket.emit('leave_project', projectId);
      socket.disconnect();
    };
  }, [projectId, qc]);

  // Filter tasks
  const filterTasks = (tasks: Task[]) => {
    let filtered = tasks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    if (filterPriority) {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }
    return filtered;
  };

  const addColumn = async () => {
    if (!newColName.trim()) return;
    try {
      await boardApi.createColumn(projectId!, newColName.trim(), columns.length);
      toast.success('Column added');
      setNewColName('');
      setShowNewCol(false);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to add column');
    }
  };

  const deleteColumn = async (id: string) => {
    try {
      await boardApi.deleteColumn(id);
      refetch();
      toast.success('Column deleted');
    } catch {
      toast.error('Failed to delete column');
    }
  };

  const addTask = async (colId: string, priority: string = 'MEDIUM') => {
    if (!newTaskTitle.trim()) { setAddingToCol(null); return; }
    try {
      const res = await taskApi.create(colId, { title: newTaskTitle.trim(), priority });
      const newTask: Task = res.data;
      setNewTaskTitle('');
      setAddingToCol(null);
      await refetch();
      // Open the drawer immediately so the user can set priority, description, due date etc.
      setSelectedTask(newTask);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed');
    }
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    for (const col of columns) {
      const task = col.tasks?.find(t => t.id === taskId);
      if (task) { setActiveTask(task); break; }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle column reordering
    if (activeId.startsWith('col-')) {
      const overColId = overId.replace('col-', '');
      const activeColId = activeId.replace('col-', '');

      if (activeColId !== overColId) {
        const activeIdx = columns.findIndex(c => c.id === activeColId);
        const overIdx = columns.findIndex(c => c.id === overColId);

        if (activeIdx !== -1 && overIdx !== -1) {
          const reorderedCols = [...columns].sort((a, b) => a.order - b.order);
          const [movedCol] = reorderedCols.splice(activeIdx, 1);
          reorderedCols.splice(overIdx, 0, movedCol);

          const promises = reorderedCols.map((c, idx) => {
            return api.patch(`/columns/${c.id}`, { order: idx });
          });

          try {
            await Promise.all(promises);
            refetch();
          } catch {
            toast.error('Failed to reorder columns');
          }
        }
      }
      setActiveTask(null);
      return;
    }

    // Find the dragged task
    const draggedTask = columns.flatMap(c => c.tasks || []).find(t => t.id === activeId);
    if (!draggedTask) {
      setActiveTask(null);
      return;
    }

    // Determine target column and swimlane key
    let targetColumnId = '';
    let swimlaneKey = '';

    if (overId.startsWith('cell-')) {
      const part = overId.substring(5); // remove 'cell-'
      const idx = part.indexOf('::');
      if (idx !== -1) {
        targetColumnId = part.substring(0, idx);
        swimlaneKey = part.substring(idx + 2);
      }
    } else {
      // OverId is another task card id
      const overTask = columns.flatMap(c => c.tasks || []).find(t => t.id === overId);
      if (overTask) {
        targetColumnId = overTask.columnId;
        if (groupBy === 'priority') {
          swimlaneKey = overTask.priority;
        } else if (groupBy === 'assignee') {
          swimlaneKey = overTask.assignees?.[0]?.id || 'unassigned';
        }
      } else {
        // Fallback: check if overId is just a column id
        const matchedCol = columns.find(c => c.id === overId);
        if (matchedCol) {
          targetColumnId = matchedCol.id;
        }
      }
    }

    if (!targetColumnId) {
      setActiveTask(null);
      return;
    }

    // Perform updates if moved to a different column or swimlane
    try {
      let changed = false;

      // 1. Column change
      if (draggedTask.columnId !== targetColumnId) {
        await taskApi.update(draggedTask.id, { columnId: targetColumnId });
        draggedTask.columnId = targetColumnId;
        changed = true;
      }

      // 2. Swimlane changes
      if (groupBy === 'priority' && swimlaneKey && draggedTask.priority !== swimlaneKey) {
        await taskApi.update(draggedTask.id, { priority: swimlaneKey });
        changed = true;
      } else if (groupBy === 'assignee' && swimlaneKey) {
        const currentAssigneeId = draggedTask.assignees?.[0]?.id || 'unassigned';
        if (currentAssigneeId !== swimlaneKey) {
          // Remove current assignees
          for (const a of draggedTask.assignees || []) {
            if (a.id !== swimlaneKey) {
              await api.delete(`/tasks/${draggedTask.id}/assignees/${a.id}`);
            }
          }
          // Add new assignee if not unassigned
          if (swimlaneKey !== 'unassigned') {
            if (!draggedTask.assignees?.find((a: any) => a.id === swimlaneKey)) {
              await api.post(`/tasks/${draggedTask.id}/assignees`, { userId: swimlaneKey });
            }
          }
          changed = true;
        }
      }

      // 3. Reordering in the same cell if column and swimlane didn't change
      if (!changed && !overId.startsWith('cell-')) {
        // Filter tasks in the current cell
        const cellTasks = (columns.find(c => c.id === targetColumnId)?.tasks || [])
          .filter(t => {
            if (groupBy === 'priority') return t.priority === draggedTask.priority;
            if (groupBy === 'assignee') {
              const uId = t.assignees?.[0]?.id || 'unassigned';
              const dId = draggedTask.assignees?.[0]?.id || 'unassigned';
              return uId === dId;
            }
            return true;
          })
          .sort((a, b) => a.order - b.order);

        const activeIdx = cellTasks.findIndex(t => t.id === activeId);
        const overIdx = cellTasks.findIndex(t => t.id === overId);

        if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
          const reorderedTasks = [...cellTasks];
          const [movedTask] = reorderedTasks.splice(activeIdx, 1);
          reorderedTasks.splice(overIdx, 0, movedTask);

          const promises = reorderedTasks.map((t, idx) => {
            if (t.order !== idx) {
              return taskApi.update(t.id, { order: idx });
            }
            return null;
          }).filter(Boolean);

          await Promise.all(promises);
        }
      }

      refetch();
    } catch (err) {
      toast.error('Failed to move task');
    }

    setActiveTask(null);
  };

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Generate random particles for the board view
  const boardParticles = Array.from({ length: 15 }).map((_, i) => ({
    x: 5 + (i * 24) % 90,
    y: 10 + (i * 19) % 80,
    size: 2 + (i % 3),
    delay: i * 0.45,
    duration: 14 + (i % 4) * 3,
  }));

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: '#07070a' }}>
      <div className="blobs">
        <div className="blob blob-1" style={{ opacity: 0.12 }} />
        <div className="blob blob-2" style={{ opacity: 0.12 }} />
        <div className="blob blob-3" style={{ opacity: 0.08 }} />
      </div>

      {/* Floating particles */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {boardParticles.map((p, idx) => (
          <FloatingParticle key={idx} x={p.x} y={p.y} size={p.size} delay={p.delay} duration={p.duration} />
        ))}
      </div>

      {/* Topbar */}
      <nav className="glass board-topbar">
        <button className="board-topbar-back" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="board-topbar-divider" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <span className="board-topbar-title">{boardData?.name || 'Board'}</span>
          <button
            className="btn-icon"
            onClick={() => {
              setRenameProjName(boardData?.name || '');
              setShowRenameModal(true);
            }}
            style={{ padding: 4, display: 'flex', alignItems: 'center' }}
            title="Rename Project"
          >
            <Pencil size={13} style={{ color: 'var(--color-text-dim)' }} />
          </button>
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '2px', marginLeft: 'var(--space-md)' }}>
          {(['kanban', 'timeline', 'billing'] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setActiveView(v)}
              style={{
                background: activeView === v ? 'rgba(255,255,255,0.05)' : 'none',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                color: activeView === v ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {v === 'kanban' ? 'Kanban' : v === 'timeline' ? 'Timeline' : 'Billing & Invoice'}
            </button>
          ))}
        </div>

        {/* Group By selector (Only in Kanban view) */}
        {activeView === 'kanban' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'var(--space-md)' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Group by:</span>
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value as any)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '6px',
                padding: '4px 8px',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="none" style={{ background: '#111116' }}>None</option>
              <option value="priority" style={{ background: '#111116' }}>Priority</option>
              <option value="assignee" style={{ background: '#111116' }}>Assignee</option>
            </select>
          </div>
        )}

        {/* Search & Actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {activeView === 'kanban' && (
            <>
              <div className="search-bar" style={{ minWidth: 200 }}>
                <Search size={15} className="search-bar-icon" />
                <input
                  placeholder="Search tasks…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="btn-icon" onClick={() => setSearchQuery('')} style={{ padding: 2 }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Priority filter chips */}
              {(['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const).map(p => (
                <button
                  key={p}
                  className={`filter-chip ${filterPriority === p ? 'active' : ''}`}
                  onClick={() => setFilterPriority(filterPriority === p ? null : p)}
                >
                  {p}
                </button>
              ))}

              <motion.button
                className="btn-primary"
                onClick={() => setShowNewCol(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--text-sm)', marginLeft: 'var(--space-sm)' }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Plus size={16} /> Add Column
              </motion.button>
            </>
          )}
        </div>
      </nav>

      {/* Board Canvas */}
      {activeView === 'kanban' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="board-canvas" style={{ display: groupBy === 'none' ? 'flex' : 'block', overflowY: groupBy === 'none' ? 'hidden' : 'auto' }}>
            
            {groupBy === 'none' ? (
              // Standard Columns Layout
              <SortableContext
                items={columns.sort((a, b) => a.order - b.order).map(c => 'col-' + c.id)}
                strategy={horizontalListSortingStrategy}
              >
                <AnimatePresence>
                  {[...columns].sort((a, b) => a.order - b.order).map((col, i) => {
                    const tasks = filterTasks((col.tasks || []).sort((a: Task, b: Task) => a.order - b.order));

                    return (
                      <SortableColumn
                        key={col.id}
                        col={col}
                        colIndex={i}
                        tasks={tasks}
                        addingToCol={addingToCol}
                        setAddingToCol={setAddingToCol}
                        newTaskTitle={newTaskTitle}
                        setNewTaskTitle={setNewTaskTitle}
                        addTask={addTask}
                        deleteColumn={deleteColumn}
                        startEditCol={startEditCol}
                        editingColId={editingColId}
                        editingColName={editingColName}
                        setEditingColName={setEditingColName}
                        saveColName={saveColName}
                        setSelectedTask={setSelectedTask}
                      />
                    );
                  })}
                </AnimatePresence>
              </SortableContext>
            ) : (
              // Swimlanes Layout
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 'fit-content', paddingBottom: '20px' }}>
                {/* Swimlane Columns Header Row */}
                <div style={{ display: 'flex', gap: 'var(--space-md)', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {columns.sort((a, b) => a.order - b.order).map(col => (
                    <div key={col.id} style={{ width: 280, flexShrink: 0, fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '8px' }}>
                      {col.name} ({filterTasks(col.tasks || []).length})
                    </div>
                  ))}
                </div>

                {/* Swimlane Rows */}
                {getSwimlanes().map(lane => (
                  <div key={lane.key} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Swimlane Header Banner */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                      {lane.color && <div style={{ width: 8, height: 8, borderRadius: '50%', background: lane.color }} />}
                      {lane.user && (
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%',
                          background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', fontWeight: 700, color: '#a855f7'
                        }}>
                          {lane.label.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#f5f5f7' }}>{lane.label}</span>
                    </div>

                    {/* Cells */}
                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                      {columns.sort((a, b) => a.order - b.order).map(col => {
                        const cellTasks = filterTasks(col.tasks || []).filter(t => {
                          if (groupBy === 'priority') return t.priority === lane.key;
                          if (groupBy === 'assignee') {
                            const uId = t.assignees?.[0]?.id || 'unassigned';
                            return uId === lane.key;
                          }
                          return true;
                        });

                        return (
                          <SwimlaneColumnCell
                            key={`${col.id}-${lane.key}`}
                            columnId={col.id}
                            swimlaneKey={lane.key}
                            tasks={cellTasks}
                            setSelectedTask={setSelectedTask}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New column (Only in standard layout) */}
            {groupBy === 'none' && showNewCol && (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ width: 300, flexShrink: 0 }}
              >
                <div
                  className="glass"
                  style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}
                >
                  <input
                    className="tf-input"
                    placeholder="Column name…"
                    value={newColName}
                    onChange={e => setNewColName(e.target.value)}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') addColumn();
                      if (e.key === 'Escape') setShowNewCol(false);
                    }}
                  />
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button
                      className="btn-primary"
                      style={{ flex: 1, padding: '0.5rem' }}
                      onClick={addColumn}
                    >
                      Add Column
                    </button>
                    <button className="btn-ghost" onClick={() => setShowNewCol(false)}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <DragOverlay>
            {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Timeline View */}
      {activeView === 'timeline' && (
        <div style={{ padding: '20px var(--space-xl) var(--space-xl)', overflowY: 'auto', flex: 1 }}>
          <TimelineView
            tasks={columns.flatMap(c => filterTasks(c.tasks || []))}
            setSelectedTask={setSelectedTask}
          />
        </div>
      )}

      {/* Billing Dashboard */}
      {activeView === 'billing' && projectId && (
        <div style={{ padding: '20px var(--space-xl) var(--space-xl)', overflowY: 'auto', flex: 1 }}>
          <BillingDashboard projectId={projectId} />
        </div>
      )}

      <TaskDetailDrawer
        task={selectedTask}
        columns={columns}
        onClose={() => { setSelectedTask(null); refetch(); }}
      />

      {showRenameModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="glass" style={{ padding: 'var(--space-xl)', width: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Rename Project</h3>
            <input
              className="tf-input"
              value={renameProjName}
              onChange={e => setRenameProjName(e.target.value)}
              placeholder="Project name…"
            />
            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
              <button className="btn-ghost" onClick={() => { setShowRenameModal(false); setRenameProjName(''); }}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={!renameProjName.trim() || renaming}
                onClick={renameProject}
              >
                {renaming ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Timeline / Gantt View Component ─── */
interface TimelineViewProps {
  tasks: Task[];
  setSelectedTask: (task: Task) => void;
}

function TimelineView({ tasks, setSelectedTask }: TimelineViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '20px',
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px', padding: '20px', height: 'calc(100vh - 120px)', overflowY: 'auto'
    }}>
      {/* Navigation Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} style={{ color: '#a855f7' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Timeline Schedule</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-icon" onClick={prevMonth} style={{ padding: '6px' }}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f5f5f7', minWidth: '100px', textAlign: 'center' }}>
            {monthName} {year}
          </span>
          <button className="btn-icon" onClick={nextMonth} style={{ padding: '6px' }}><ChevronRight size={16} /></button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
          No tasks found in this project.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', overflowX: 'auto', minWidth: '800px' }}>
          {/* Calendar Header Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task Name</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daysInMonth}, 1fr)`, gap: '2px', textAlign: 'center' }}>
              {daysArray.map(day => (
                <div key={day} style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>{day}</div>
              ))}
            </div>
          </div>

          {/* Task Timeline Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px' }}>
            {tasks.map(task => {
              const taskCreated = new Date(task.createdAt);
              const taskDue = task.dueDate ? new Date(task.dueDate) : new Date(taskCreated.getTime() + 24 * 3600 * 1000);

              let startCol = 1;
              let endCol = daysInMonth;

              if (taskCreated.getFullYear() === year && taskCreated.getMonth() === month) {
                startCol = taskCreated.getDate();
              }
              if (taskDue.getFullYear() === year && taskDue.getMonth() === month) {
                endCol = taskDue.getDate();
              } else if (taskDue < new Date(year, month, 1)) {
                return null;
              } else if (taskCreated > new Date(year, month + 1, 0)) {
                return null;
              }

              startCol = Math.max(1, Math.min(daysInMonth, startCol));
              endCol = Math.max(1, Math.min(daysInMonth, endCol));
              if (endCol < startCol) endCol = startCol;

              const priorityColor =
                task.priority === 'URGENT' ? '#ef4444' :
                task.priority === 'HIGH' ? '#f97316' :
                task.priority === 'MEDIUM' ? '#eab308' : '#3b82f6';

              return (
                <div key={task.id} style={{ display: 'grid', gridTemplateColumns: '250px 1fr', alignItems: 'center', height: '36px' }}>
                  <div
                    onClick={() => setSelectedTask(task)}
                    style={{ fontSize: '13px', color: '#f5f5f7', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 550, paddingRight: '12px' }}
                    title="Click to view details"
                  >
                    {task.title}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daysInMonth}, 1fr)`, gap: '2px', height: '100%', position: 'relative' }}>
                    {daysArray.map(day => (
                      <div key={day} style={{ borderLeft: '1px solid rgba(255,255,255,0.02)', height: '100%' }} />
                    ))}
                    
                    <div
                      onClick={() => setSelectedTask(task)}
                      style={{
                        gridColumnStart: startCol,
                        gridColumnEnd: endCol + 1,
                        background: `linear-gradient(90deg, ${priorityColor}bb, ${priorityColor}dd)`,
                        borderRadius: '6px',
                        height: '20px',
                        alignSelf: 'center',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 8px',
                        fontSize: '9px',
                        fontWeight: 700,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                      }}
                      title={`${task.title} (Priority: ${task.priority}, Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'None'})`}
                    >
                      {task.title}
                    </div>
                  </div>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Billing Dashboard Component ─── */
interface BillingDashboardProps {
  projectId: string;
}

function BillingDashboard({ projectId }: BillingDashboardProps) {
  const [hourlyRate, setHourlyRate] = useState('80');
  const [taxRate, setTaxRate] = useState('10');
  const [clientName, setClientName] = useState('Acme Corporation');
  const [invoiceTitle, setInvoiceTitle] = useState('INV-2026-001');
  const [showInvoice, setShowInvoice] = useState(false);

  const { data: billingData, isLoading } = useQuery({
    queryKey: ['project-billing', projectId],
    queryFn: () => timeLogApi.projectBilling(projectId).then((r: any) => r.data as BillingReport),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="spinner" />
      </div>
    );
  }

  const report = billingData;
  if (!report) return null;

  const totalHrs = report.totalSeconds / 3600;
  const rate = parseFloat(hourlyRate) || 0;
  const tax = parseFloat(taxRate) || 0;
  const subtotal = totalHrs * rate;
  const taxAmount = (subtotal * tax) / 100;
  const totalAmount = subtotal + taxAmount;

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', height: 'calc(100vh - 120px)', overflowY: 'auto', paddingRight: '6px' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {!showInvoice ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              <div style={{
                background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px'
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#f5f5f7', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Hours by Team Member
                </h3>
                {report.userBreakdown.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>No logged hours.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {report.userBreakdown.map((u: any) => (
                      <div key={u.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', color: '#a855f7', fontWeight: 700
                          }}>
                            {u.userName.slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '13px', color: '#f5f5f7', fontWeight: 550 }}>{u.userName}</span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8' }}>
                          {formatDuration(u.totalSeconds)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px'
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#f5f5f7', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Hours by Task
                </h3>
                {report.taskBreakdown.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>No logged hours.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                    {report.taskBreakdown.map((t: any) => (
                      <div key={t.taskId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {t.taskTitle}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', flexShrink: 0 }}>
                          {formatDuration(t.totalSeconds)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div style={{
              background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px'
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#f5f5f7', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                All Time Logs
              </h3>
              {report.logs.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>No activity log yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {report.logs.map((log: any) => (
                    <div key={log.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '8px', padding: '10px 14px'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#f5f5f7' }}>
                          {log.user.name} logged {formatDuration(log.durationSeconds)} on <strong>{log.task.title}</strong>
                        </span>
                        {log.description && (
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                            &ldquo;{log.description}&rdquo;
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                        {new Date(log.loggedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div id="printable-invoice" style={{
            background: '#ffffff', color: '#1a1a1a', borderRadius: '12px', padding: '40px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '30px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #eaeaea', paddingBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#a855f7' }}>TaskFlow Invoice</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666666' }}>Project Time Log Receipt</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{invoiceTitle}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666666' }}>Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '11px', textTransform: 'uppercase', color: '#888888', letterSpacing: '0.05em' }}>Billed To</h4>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>{clientName}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '11px', textTransform: 'uppercase', color: '#888888', letterSpacing: '0.05em' }}>Project</h4>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>{report.projectName}</p>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eaeaea', textAlign: 'left' }}>
                  <th style={{ padding: '8px 0', fontSize: '12px', color: '#666' }}>Task Title</th>
                  <th style={{ padding: '8px 0', fontSize: '12px', color: '#666', textAlign: 'right' }}>Hours</th>
                  <th style={{ padding: '8px 0', fontSize: '12px', color: '#666', textAlign: 'right' }}>Rate</th>
                  <th style={{ padding: '8px 0', fontSize: '12px', color: '#666', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {report.taskBreakdown.map((t: any) => {
                  const hrs = t.totalSeconds / 3600;
                  const amt = hrs * rate;
                  return (
                    <tr key={t.taskId} style={{ borderBottom: '1px solid #eaeaea' }}>
                      <td style={{ padding: '12px 0', fontSize: '13px', fontWeight: 600 }}>{t.taskTitle}</td>
                      <td style={{ padding: '12px 0', fontSize: '13px', textAlign: 'right' }}>{hrs.toFixed(2)}</td>
                      <td style={{ padding: '12px 0', fontSize: '13px', textAlign: 'right' }}>${rate.toFixed(2)}/hr</td>
                      <td style={{ padding: '12px 0', fontSize: '13px', fontWeight: 700, textAlign: 'right' }}>${amt.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ width: '240px', alignSelf: 'flex-end', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '2px solid #eaeaea', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#666' }}>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#666' }}>Tax ({tax}%):</span>
                <span style={{ fontWeight: 600 }}>${taxAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderTop: '1px solid #eaeaea', paddingTop: '8px' }}>
                <span style={{ fontWeight: 700 }}>Total Due:</span>
                <span style={{ fontWeight: 800, color: '#a855f7' }}>${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="no-print" style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop: '1px solid #eaeaea', paddingTop: '20px' }}>
              <button className="btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '13px' }}>
                <Printer size={14} /> Print Invoice
              </button>
              <button className="btn-ghost" onClick={() => setShowInvoice(false)} style={{ color: '#666666', padding: '8px 16px', fontSize: '13px' }}>
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

      </div>

      <div style={{
        background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={16} style={{ color: '#10b981' }} />
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Invoice Parameters</h4>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Hourly Rate ($/hr)</label>
            <input className="tf-input" type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Tax Rate (%)</label>
            <input className="tf-input" type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Client Name</label>
            <input className="tf-input" value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Invoice Title</label>
            <input className="tf-input" value={invoiceTitle} onChange={e => setInvoiceTitle(e.target.value)} />
          </div>

          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px',
            display: 'flex', flexDirection: 'column', gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Total Tracked:</span>
              <span style={{ fontWeight: 700, color: '#f5f5f7' }}>{totalHrs.toFixed(2)} hrs</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Amount Due:</span>
              <span style={{ color: '#10b981' }}>${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowInvoice(true)}
            style={{ width: '100%', padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: '8px' }}
          >
            <DollarSign size={14} /> Generate Invoice Receipt
          </button>
        </div>
      </div>

    </div>
  );
}
