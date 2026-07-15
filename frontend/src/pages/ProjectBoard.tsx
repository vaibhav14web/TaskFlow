import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  Plus, 
  Trash, 
  User, 
  CheckSquare, 
  ListBullets, 
  ArrowLeft,
  PaperPlaneTilt,
  Pencil,
  Eye,
  MagnifyingGlass,
  Funnel
} from '@phosphor-icons/react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface WorkspaceMember {
  userId: string;
  role: string;
  user: UserProfile;
}

interface TaskChecklistItem {
  id: string;
  title: string;
  checked: boolean;
}

interface TimeLog {
  id: string;
  durationSeconds: number;
  description: string;
  userId: string;
  createdAt: string;
  user: UserProfile;
}

interface TaskComment {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
  user: UserProfile;
}

interface TaskActivity {
  id: string;
  description: string;
  userId: string;
  createdAt: string;
  user: UserProfile;
}

interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  order: number;
  assignees: { userId: string }[];
  checklist: TaskChecklistItem[];
  timeLogs: TimeLog[];
}

interface Column {
  id: string;
  name: string;
  order: number;
  tasks: Task[];
}

interface Board {
  id: string;
  projectId: string;
  columns: Column[];
}

interface SocketPresencePayload {
  userId: string;
  taskId: string;
  status: string;
}

interface InteractiveTaskCardProps {
  task: Task;
  activeViewers: string[];
  onSelect: () => void;
  onDragStart: (e: any) => void;
  workspaceMembers: WorkspaceMember[];
}

const InteractiveTaskCard: React.FC<InteractiveTaskCardProps> = ({ task, activeViewers, onSelect, onDragStart }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-60, 60], [6, -6]);
  const rotateY = useTransform(x, [-60, 60], [-6, 6]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      layout
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      className="bg-zinc-950/40 hover:bg-zinc-900/30 border border-zinc-900 hover:border-zinc-800/80 p-4 rounded-xl flex flex-col gap-4 cursor-grab active:cursor-grabbing transition-colors relative group"
    >
      <div className="font-semibold text-zinc-150 text-xs leading-snug group-hover:text-lime-400 transition-colors">
        {task.title}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
            task.priority === 'URGENT' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
            task.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            task.priority === 'MEDIUM' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
            'bg-zinc-900 text-zinc-400'
          }`}>
            {task.priority}
          </span>

          {(task.checklist || []).length > 0 && (
            <span className="flex items-center gap-1 text-[9px] text-zinc-500">
              <CheckSquare size={12} />
              <span>
                {(task.checklist || []).filter(c => c.checked).length}/{(task.checklist || []).length}
              </span>
            </span>
          )}
        </div>

        {/* Member viewing presence dot indicator */}
        {activeViewers.length > 0 && (
          <div className="flex items-center gap-1 bg-lime-500/10 border border-lime-500/25 px-1.5 py-0.5 rounded text-[8px] font-semibold text-lime-400 animate-pulse">
            <Eye size={10} />
            <span>{activeViewers.length} viewing</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default function ProjectBoard() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useAuth();

  // Selected project state
  const [activeProjectId, setActiveProjectId] = useState<string | null>(projectId || null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // Sidebar / modal states
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Column edit states
  const [newColumnName, setNewColumnName] = useState('');
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColName, setEditingColName] = useState('');

  // Task edit / detail states
  const [activeTaskBoxColId, setActiveTaskBoxColId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Task details tab status
  const [detailTab, setDetailTab] = useState<'checklist' | 'timelogs' | 'comments' | 'activity'>('checklist');

  // Input states inside Task Detail Modal
  const [checklistTitle, setChecklistTitle] = useState('');
  const [logSeconds, setLogSeconds] = useState(3600); // 1 hour default
  const [logDesc, setLogDesc] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  // Real-time presence states: mapping taskId -> list of userNames viewing it
  const [presenceMap, setPresenceMap] = useState<Record<string, string[]>>({});

  // 1. Fetch workspace projects
  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects', workspaceId],
    queryFn: () => apiRequest<Project[]>(`/workspaces/${workspaceId}/projects`),
    enabled: !!workspaceId
  });

  const projectsList = projects || [];

  // Sync active project selection
  useEffect(() => {
    if (projectId) {
      setActiveProjectId(projectId);
    } else if (projectsList.length > 0 && !activeProjectId) {
      // Auto redirect to first project board
      navigate(`/workspaces/${workspaceId}/projects/${projectsList[0].id}/board`);
    }
  }, [projectId, projectsList, workspaceId, navigate, activeProjectId]);

  // 2. Fetch workspace members (for assignees dropdown)
  const { data: members } = useQuery<WorkspaceMember[]>({
    queryKey: ['members', workspaceId],
    queryFn: () => apiRequest<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId
  });

  const workspaceMembers = members || [];

  // 3. Fetch Kanban Board columns and tasks
  const { data: board, isLoading: isLoadingBoard } = useQuery<Board>({
    queryKey: ['board', activeProjectId, searchTerm, priorityFilter],
    queryFn: () => {
      const q = new URLSearchParams();
      if (searchTerm) q.set('search', searchTerm);
      if (priorityFilter) q.set('priority', priorityFilter);
      return apiRequest<Board>(`/projects/${activeProjectId}/board?${q.toString()}`);
    },
    enabled: !!activeProjectId
  });

  // 4. Fetch Selected Task details
  const { data: taskDetails } = useQuery<Task>({
    queryKey: ['task', selectedTaskId],
    queryFn: () => apiRequest<Task>(`/tasks/${selectedTaskId}`),
    enabled: !!selectedTaskId
  });

  // Sync task details description
  useEffect(() => {
    if (taskDetails) {
      setTaskDescription(taskDetails.description || '');
    }
  }, [taskDetails]);

  // 5. Fetch Task Activity log
  const { data: activities } = useQuery<TaskActivity[]>({
    queryKey: ['activities', selectedTaskId],
    queryFn: () => apiRequest<TaskActivity[]>(`/tasks/${selectedTaskId}/activity`),
    enabled: !!selectedTaskId && detailTab === 'activity'
  });

  // 6. Fetch Task Comments
  const { data: comments } = useQuery<TaskComment[]>({
    queryKey: ['comments', selectedTaskId],
    queryFn: () => apiRequest<TaskComment[]>(`/tasks/${selectedTaskId}/comments`),
    enabled: !!selectedTaskId && detailTab === 'comments'
  });

  // MUTATIONS
  // Create Project
  const createProjectMutation = useMutation({
    mutationFn: (params: { name: string; description: string }) => apiRequest<Project>(`/workspaces/${workspaceId}/projects`, {
      method: 'POST',
      body: JSON.stringify(params)
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      setShowCreateProjectModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
      navigate(`/workspaces/${workspaceId}/projects/${data.id}/board`);
    }
  });

  // Create Column
  const createColumnMutation = useMutation({
    mutationFn: (name: string) => apiRequest(`/projects/${activeProjectId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ name })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', activeProjectId] });
      setNewColumnName('');
    }
  });

  // Update Column (Rename / Move)
  const updateColumnMutation = useMutation({
    mutationFn: (params: { columnId: string; name: string }) => apiRequest(`/columns/${params.columnId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: params.name })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', activeProjectId] });
      setEditingColId(null);
    }
  });

  // Delete Column
  const deleteColumnMutation = useMutation({
    mutationFn: (columnId: string) => apiRequest(`/columns/${columnId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', activeProjectId] });
    }
  });

  // Create Task
  const createTaskMutation = useMutation({
    mutationFn: (params: { columnId: string; title: string }) => apiRequest(`/columns/${params.columnId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title: params.title })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', activeProjectId] });
      setActiveTaskBoxColId(null);
      setNewTaskTitle('');
    }
  });

  // Update Task (Move column/order, description, priority, etc.)
  const updateTaskMutation = useMutation({
    mutationFn: (params: { taskId: string; payload: Partial<Task> }) => apiRequest(`/tasks/${params.taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(params.payload)
    }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['board', activeProjectId] });
      if (selectedTaskId === variables.taskId) {
        queryClient.invalidateQueries({ queryKey: ['task', selectedTaskId] });
      }
    }
  });

  // Delete Task
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => apiRequest(`/tasks/${taskId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', activeProjectId] });
      setSelectedTaskId(null);
    }
  });

  // Assignee: assign member to task
  const assignMemberMutation = useMutation({
    mutationFn: (userId: string) => apiRequest(`/tasks/${selectedTaskId}/assignees`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', selectedTaskId] });
      queryClient.invalidateQueries({ queryKey: ['board', activeProjectId] });
    }
  });

  // Assignee: unassign member from task
  const unassignMemberMutation = useMutation({
    mutationFn: (userId: string) => apiRequest(`/tasks/${selectedTaskId}/assignees/${userId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', selectedTaskId] });
      queryClient.invalidateQueries({ queryKey: ['board', activeProjectId] });
    }
  });

  // Add Checklist Item
  const addChecklistItemMutation = useMutation({
    mutationFn: (title: string) => apiRequest(`/tasks/${selectedTaskId}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ title })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', selectedTaskId] });
      setChecklistTitle('');
    }
  });

  // Check / Uncheck Checklist Item (uses direct updateTask list item helper or separate patch API in backend)
  const toggleChecklistMutation = useMutation({
    mutationFn: (params: { itemId: string; checked: boolean }) => apiRequest(`/tasks/${selectedTaskId}/checklist/${params.itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ checked: params.checked })
    }).catch(async () => {
      // Fallback: If separate endpoint not implemented, fallback to patching task checklist directly
      const updatedChecklist = taskDetails?.checklist.map(item => 
        item.id === params.itemId ? { ...item, checked: params.checked } : item
      ) || [];
      return apiRequest(`/tasks/${selectedTaskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ checklist: updatedChecklist })
      });
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', selectedTaskId] });
      queryClient.invalidateQueries({ queryKey: ['board', activeProjectId] });
    }
  });

  // Add Time Log
  const logTimeMutation = useMutation({
    mutationFn: (params: { durationSeconds: number; description: string }) => apiRequest(`/tasks/${selectedTaskId}/time-logs`, {
      method: 'POST',
      body: JSON.stringify(params)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', selectedTaskId] });
      setLogDesc('');
    }
  });

  // Create Comment
  const createCommentMutation = useMutation({
    mutationFn: (content: string) => apiRequest(`/tasks/${selectedTaskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', selectedTaskId] });
      setCommentContent('');
    }
  });

  // Real-Time WebSockets Integration
  useEffect(() => {
    if (!activeProjectId) return;

    // Connect to backend WS path
    const token = localStorage.getItem('taskflow_access_token') || '';
    const wsUrl = window.location.origin.includes('localhost') ? 'http://localhost:5000' : '';
    const socketClient = io(wsUrl, {
      path: '/ws',
      query: { token }
    });

    setSocket(socketClient);

    socketClient.on('connect', () => {
      socketClient.emit('join_project', activeProjectId);
    });

    // Handle incoming broadcast updates
    socketClient.on('task.created', () => {
      queryClient.invalidateQueries({ queryKey: ['board', activeProjectId] });
    });

    socketClient.on('task.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['board', activeProjectId] });
      if (selectedTaskId) {
        queryClient.invalidateQueries({ queryKey: ['task', selectedTaskId] });
      }
    });

    socketClient.on('task.deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['board', activeProjectId] });
      setSelectedTaskId(null);
    });

    socketClient.on('comment.created', () => {
      if (selectedTaskId) {
        queryClient.invalidateQueries({ queryKey: ['comments', selectedTaskId] });
      }
    });

    // Handle user task card presence updates
    socketClient.on('presence.updated', (payload: SocketPresencePayload) => {
      setPresenceMap((prev) => {
        const next = { ...prev };
        // Clean out user from old rooms
        Object.keys(next).forEach((key) => {
          next[key] = next[key].filter(id => id !== payload.userId);
        });

        // Add user to active card if status is "viewing"
        if (payload.status === 'viewing') {
          if (!next[payload.taskId]) next[payload.taskId] = [];
          if (!next[payload.taskId].includes(payload.userId)) {
            next[payload.taskId].push(payload.userId);
          }
        }

        return next;
      });
    });

    return () => {
      socketClient.emit('leave_project', activeProjectId);
      socketClient.disconnect();
    };
  }, [activeProjectId, queryClient]);

  // Broadcast presence updates when viewing task details
  useEffect(() => {
    if (socket && activeProjectId) {
      if (selectedTaskId) {
        socket.emit('presence.updated', {
          projectId: activeProjectId,
          taskId: selectedTaskId,
          status: 'viewing'
        });
      } else {
        socket.emit('presence.updated', {
          projectId: activeProjectId,
          taskId: '',
          status: 'leaving'
        });
      }
    }
  }, [selectedTaskId, socket, activeProjectId]);

  // DRAG & DROP HANDLERS
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Find the target column's tasks count to append card at the end
    const targetColumn = board?.columns.find(c => c.id === targetColId);
    const order = targetColumn ? targetColumn.tasks.length : 0;

    // Trigger task location update
    updateTaskMutation.mutate({
      taskId,
      payload: { columnId: targetColId, order }
    });
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createProjectMutation.mutate({
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || null
    } as any);
  };

  const handleAddColumnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    createColumnMutation.mutate(newColumnName.trim());
  };

  const handleAddTaskSubmit = (e: React.FormEvent, columnId: string) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    createTaskMutation.mutate({ columnId, title: newTaskTitle.trim() });
  };

  const handleSaveDescription = () => {
    if (!selectedTaskId) return;
    updateTaskMutation.mutate({
      taskId: selectedTaskId,
      payload: { description: taskDescription.trim() || null }
    });
    setIsEditingDescription(false);
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 flex selection:bg-lime-400/30 selection:text-lime-400 overflow-hidden">
      
      {/* Background spotlights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] right-[10%] w-[45vw] h-[45vw] rounded-full bg-lime-500/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px),linear-gradient(to_bottom,#ffffff01_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Main Board Area */}
      <div className="relative z-10 flex-grow flex flex-col min-w-0">
        
        {/* Top Control Bar */}
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-sm px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="h-8 w-8 rounded-lg border border-zinc-900 hover:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
              <ArrowLeft size={14} />
            </Link>

            {/* Project Switcher Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={activeProjectId || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) navigate(`/workspaces/${workspaceId}/projects/${id}/board`);
                }}
                className="bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-lime-500/40 text-zinc-150"
              >
                {projectsList.map(proj => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
              
              <button 
                onClick={() => setShowCreateProjectModal(true)}
                className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-lime-550/30 flex items-center justify-center text-zinc-400 hover:text-lime-400 transition-colors"
                title="Create Project"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Live Search & Filter tools */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-650">
                <MagnifyingGlass size={14} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 h-9 pl-8 pr-3 rounded-xl bg-zinc-900 border border-zinc-850 text-xs text-zinc-250 focus:outline-none focus:border-lime-550/40 placeholder:text-zinc-700"
                placeholder="Search board tasks..."
              />
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-650">
                <Funnel size={14} />
              </span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="pl-8 pr-3 h-9 rounded-xl bg-zinc-900 border border-zinc-850 text-xs text-zinc-350 focus:outline-none focus:border-lime-550/40"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
        </header>

        {/* Board content list columns */}
        <div className="flex-1 overflow-x-auto p-8 flex items-start gap-5">
          {isLoadingBoard ? (
            <div className="flex-1 h-96 flex items-center justify-center text-zinc-550 text-xs animate-pulse">
              Syncing board layout...
            </div>
          ) : board && board.columns.length > 0 ? (
            <div className="flex items-start gap-5">
              
              {board.columns.map((column) => (
                <div
                  key={column.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                  className="w-72 bg-zinc-900/10 border border-zinc-900/80 rounded-2xl p-4 flex flex-col max-h-[calc(100vh-12rem)] shadow-lg backdrop-blur-sm"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 px-1">
                    {editingColId === column.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingColName}
                        onChange={(e) => setEditingColName(e.target.value)}
                        onBlur={() => updateColumnMutation.mutate({ columnId: column.id, name: editingColName })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') updateColumnMutation.mutate({ columnId: column.id, name: editingColName });
                        }}
                        className="bg-zinc-950 border border-zinc-800 text-xs font-bold rounded px-1.5 py-0.5 text-zinc-200 focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-zinc-200 tracking-tight">{column.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono">
                          {column.tasks.length}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setEditingColId(column.id);
                          setEditingColName(column.name);
                        }}
                        className="w-6 h-6 rounded bg-zinc-950/20 border border-zinc-900 hover:border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete column "${column.name}" and all its tasks?`)) {
                            deleteColumnMutation.mutate(column.id);
                          }
                        }}
                        className="w-6 h-6 rounded bg-zinc-950/20 border border-zinc-900 hover:border-rose-500/20 flex items-center justify-center text-zinc-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="flex-1 overflow-y-auto space-y-3 min-h-[50px] pr-1">
                    <AnimatePresence mode="popLayout">
                      {column.tasks.map((task) => {
                        const activeViewers = presenceMap[task.id] || [];
                        
                        return (
                          <InteractiveTaskCard
                            key={task.id}
                            task={task}
                            activeViewers={activeViewers}
                            onSelect={() => setSelectedTaskId(task.id)}
                            onDragStart={(e: any) => handleDragStart(e, task.id)}
                            workspaceMembers={workspaceMembers}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Add Task Box Trigger */}
                  <div className="mt-3">
                    {activeTaskBoxColId === column.id ? (
                      <form onSubmit={(e) => handleAddTaskSubmit(e, column.id)} className="space-y-2">
                        <input
                          type="text"
                          required
                          autoFocus
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="Task title..."
                          className="w-full h-8 px-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs focus:outline-none focus:border-lime-550/40 text-zinc-150"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveTaskBoxColId(null)}
                            className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 rounded bg-lime-400 text-zinc-950 font-bold text-[10px] hover:bg-lime-300"
                          >
                            Add
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setActiveTaskBoxColId(column.id)}
                        className="w-full h-8 border border-dashed border-zinc-900 hover:border-zinc-800 rounded-xl flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <Plus size={12} />
                        <span>Add Task</span>
                      </button>
                    )}
                  </div>

                </div>
              ))}

              {/* Add Column Trigger */}
              <div className="w-72 shrink-0 border border-dashed border-zinc-900 bg-zinc-950/10 rounded-2xl p-4 flex flex-col gap-4">
                <h4 className="text-xs font-bold text-zinc-400">Add new column</h4>
                <form onSubmit={handleAddColumnSubmit} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="Column name (e.g. QA)"
                    className="w-full h-9 px-3 rounded-xl bg-zinc-950 border border-zinc-900 text-xs focus:outline-none focus:border-lime-550/40 text-zinc-150"
                  />
                  <button
                    type="submit"
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold text-xs hover:bg-zinc-850 hover:text-zinc-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Create Column</span>
                  </button>
                </form>
              </div>

            </div>
          ) : (
            <div className="flex-1 h-96 border border-dashed border-zinc-900 rounded-3xl flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-500 mb-4">
                <ListBullets size={24} />
              </div>
              <h3 className="text-sm font-bold text-zinc-200">No columns configured</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-[36ch] leading-relaxed">Create your first column list to start mapping tasks across states.</p>
              <form onSubmit={handleAddColumnSubmit} className="mt-4 flex gap-2 w-full max-w-xs">
                <input
                  type="text"
                  required
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Backlog"
                  className="flex-grow h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-850 text-xs focus:outline-none focus:border-lime-550/40 text-zinc-150"
                />
                <button type="submit" className="h-9 px-4 rounded-lg bg-lime-400 text-zinc-950 font-bold text-xs hover:bg-lime-300">
                  Add
                </button>
              </form>
            </div>
          )}
        </div>

      </div>

      {/* TASK DETAIL SIDE PANEL / MODAL (AnimatePresence) */}
      <AnimatePresence>
        {selectedTaskId && taskDetails && (
          <div className="fixed inset-0 z-50 flex justify-end bg-zinc-950/60 backdrop-blur-sm">
            
            {/* Modal Overlay Close triggers */}
            <div className="flex-1" onClick={() => setSelectedTaskId(null)} />

            {/* Sidebar drawer box */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-xl h-full bg-zinc-950 border-l border-zinc-900 flex flex-col justify-between shadow-2xl relative"
            >
              {/* Header border light */}
              <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-lime-400/20 to-transparent" />
              
              <div className="p-6 flex flex-col gap-6 overflow-y-auto flex-grow">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-zinc-900 pb-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-zinc-550 uppercase tracking-widest">Task Details</span>
                    <h2 className="text-base font-bold text-zinc-100">{taskDetails.title}</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedTaskId(null)}
                    className="w-6 h-6 rounded bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-500 hover:text-zinc-350 transition-colors"
                  >
                    &times;
                  </button>
                </div>

                {/* Grid Attributes config */}
                <div className="grid grid-cols-2 gap-4 bg-zinc-900/10 border border-zinc-900 p-4 rounded-xl text-xs">
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Priority Status</span>
                    <select
                      value={taskDetails.priority}
                      onChange={(e) => updateTaskMutation.mutate({ taskId: selectedTaskId, payload: { priority: e.target.value as any } })}
                      className="block w-full bg-zinc-950 border border-zinc-850 px-2.5 py-1.5 rounded-lg text-zinc-200 text-xs focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Due Date</span>
                    <input
                      type="date"
                      value={taskDetails.dueDate ? taskDetails.dueDate.split('T')[0] : ''}
                      onChange={(e) => updateTaskMutation.mutate({ taskId: selectedTaskId, payload: { dueDate: e.target.value || null } })}
                      className="block w-full bg-zinc-950 border border-zinc-850 px-2.5 py-1.5 rounded-lg text-zinc-250 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* Description Editor */}
                <div className="space-y-2">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block">Description</span>
                  {isEditingDescription ? (
                    <div className="space-y-2">
                      <textarea
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        className="w-full h-24 p-3 rounded-xl bg-zinc-950 border border-zinc-900 text-xs focus:outline-none focus:border-lime-550/40 text-zinc-150 resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setIsEditingDescription(false)} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300">
                          Cancel
                        </button>
                        <button onClick={handleSaveDescription} className="px-3.5 py-1 rounded bg-lime-400 text-zinc-950 font-bold text-[10px] hover:bg-lime-300">
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => setIsEditingDescription(true)}
                      className="min-h-[60px] p-3 rounded-xl bg-zinc-950/20 border border-zinc-900 hover:border-zinc-850/80 text-xs text-zinc-400 cursor-pointer transition-colors leading-relaxed"
                    >
                      {taskDetails.description || <span className="text-zinc-650 italic">No description provided. Double click to insert details...</span>}
                    </div>
                  )}
                </div>

                {/* Assignees selector list */}
                <div className="space-y-2">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block">Assignees</span>
                  <div className="flex flex-wrap gap-2 items-center">
                    {(taskDetails.assignees || []).map((assignee) => {
                      const profile = workspaceMembers.find(m => m.userId === assignee.userId)?.user;
                      return (
                        <div key={assignee.userId} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-850 text-zinc-300">
                          <User size={12} className="text-zinc-500" />
                          <span>{profile?.name || 'Assigned'}</span>
                          <button 
                            onClick={() => unassignMemberMutation.mutate(assignee.userId)}
                            className="text-zinc-600 hover:text-rose-450 ml-1 font-bold text-xs"
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}

                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          assignMemberMutation.mutate(val);
                          e.target.value = '';
                        }
                      }}
                      className="bg-zinc-950 border border-zinc-850 px-2 py-1 rounded text-zinc-400 text-[10px] font-semibold focus:outline-none"
                    >
                      <option value="">+ Assign User</option>
                      {workspaceMembers
                        .filter(m => !(taskDetails.assignees || []).some(a => a.userId === m.userId))
                        .map(m => (
                          <option key={m.userId} value={m.userId}>{m.user.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Details Tab Menu Selector */}
                <div className="border-t border-zinc-900 pt-6">
                  <div className="flex gap-6 border-b border-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-4">
                    <button
                      onClick={() => setDetailTab('checklist')}
                      className={`pb-2 transition-colors ${detailTab === 'checklist' ? 'border-b-2 border-lime-400 text-zinc-100' : 'hover:text-zinc-300'}`}
                    >
                      Checklist
                    </button>
                    <button
                      onClick={() => setDetailTab('timelogs')}
                      className={`pb-2 transition-colors ${detailTab === 'timelogs' ? 'border-b-2 border-lime-400 text-zinc-100' : 'hover:text-zinc-300'}`}
                    >
                      Time Logs
                    </button>
                    <button
                      onClick={() => setDetailTab('comments')}
                      className={`pb-2 transition-colors ${detailTab === 'comments' ? 'border-b-2 border-lime-400 text-zinc-100' : 'hover:text-zinc-300'}`}
                    >
                      Comments
                    </button>
                    <button
                      onClick={() => setDetailTab('activity')}
                      className={`pb-2 transition-colors ${detailTab === 'activity' ? 'border-b-2 border-lime-400 text-zinc-100' : 'hover:text-zinc-300'}`}
                    >
                      Activity
                    </button>
                  </div>

                  {/* TAB CONTENTS */}
                  {detailTab === 'checklist' && (
                    <div className="space-y-4">
                      {/* Items list */}
                      <div className="space-y-2">
                        {(taskDetails.checklist || []).map((item) => (
                          <div key={item.id} className="flex items-center gap-3 text-xs bg-zinc-900/30 border border-zinc-900/60 p-2.5 rounded-xl">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={(e) => toggleChecklistMutation.mutate({ itemId: item.id, checked: e.target.checked })}
                              className="w-4 h-4 accent-lime-400 border-zinc-800 rounded bg-zinc-950 focus:outline-none"
                            />
                            <span className={`flex-grow ${item.checked ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{item.title}</span>
                          </div>
                        ))}
                      </div>

                      {/* Add Item form */}
                      <form onSubmit={(e) => { e.preventDefault(); if (checklistTitle.trim()) addChecklistItemMutation.mutate(checklistTitle.trim()); }} className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={checklistTitle}
                          onChange={(e) => setChecklistTitle(e.target.value)}
                          placeholder="Sub-task name..."
                          className="flex-grow h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-900 text-xs focus:outline-none focus:border-lime-550/40 text-zinc-150"
                        />
                        <button type="submit" className="h-9 px-4 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-850 text-xs font-bold shrink-0">
                          Add Item
                        </button>
                      </form>
                    </div>
                  )}

                  {detailTab === 'timelogs' && (
                    <div className="space-y-4">
                      {/* Previous time logs list */}
                      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                        {(taskDetails.timeLogs || []).map((log) => (
                          <div key={log.id} className="p-3 bg-zinc-900/30 border border-zinc-900/60 rounded-xl flex items-center justify-between text-xs gap-4">
                            <div>
                              <div className="font-semibold text-zinc-300">{log.description || 'Billable project labor'}</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">Logged by {log.user?.name || 'Team member'}</div>
                            </div>
                            <span className="font-mono text-lime-400 bg-lime-550/5 border border-lime-500/20 px-2 py-0.5 rounded font-bold shrink-0">
                              {(log.durationSeconds / 3600).toFixed(2)}h
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Add Time Log form */}
                      <form onSubmit={(e) => { e.preventDefault(); logTimeMutation.mutate({ durationSeconds: logSeconds, description: logDesc }); }} className="space-y-3 bg-zinc-950/20 border border-zinc-900 p-4 rounded-2xl">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[8px] font-bold text-zinc-550 uppercase tracking-widest">Duration (hours)</label>
                            <input
                              type="number"
                              step="0.25"
                              min="0.25"
                              max="24"
                              required
                              onChange={(e) => setLogSeconds(Number(e.target.value) * 3600)}
                              className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-900 text-xs focus:outline-none focus:border-lime-550/40 text-zinc-150"
                              placeholder="1.5"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[8px] font-bold text-zinc-550 uppercase tracking-widest">Description</label>
                            <input
                              type="text"
                              required
                              value={logDesc}
                              onChange={(e) => setLogDesc(e.target.value)}
                              className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-900 text-xs focus:outline-none focus:border-lime-550/40 text-zinc-150"
                              placeholder="Figma prototyping..."
                            />
                          </div>
                        </div>
                        <button type="submit" className="h-9 px-4 w-full rounded-lg bg-lime-400 text-zinc-950 font-bold text-xs hover:bg-lime-300">
                          Log Billable Time
                        </button>
                      </form>
                    </div>
                  )}

                  {detailTab === 'comments' && (
                    <div className="space-y-4">
                      {/* Comments feed */}
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                        {comments && comments.length > 0 ? (
                          comments.map((comment) => (
                            <div key={comment.id} className="p-3 bg-zinc-900/30 border border-zinc-900/60 rounded-xl text-xs space-y-1">
                              <div className="flex justify-between items-center text-[10px] text-zinc-500 font-medium">
                                <span className="font-bold text-zinc-300">{comment.user.name}</span>
                                <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-zinc-250 leading-relaxed">{comment.content}</p>
                            </div>
                          ))
                        ) : (
                          <div className="py-6 text-center text-xs text-zinc-600">No comments posted yet.</div>
                        )}
                      </div>

                      {/* Post Comment form */}
                      <form onSubmit={(e) => { e.preventDefault(); if (commentContent.trim()) createCommentMutation.mutate(commentContent.trim()); }} className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                          placeholder="Write a comment..."
                          className="flex-grow h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-900 text-xs focus:outline-none focus:border-lime-550/40 text-zinc-150"
                        />
                        <button type="submit" className="h-9 px-4 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-850 text-xs font-bold shrink-0 flex items-center justify-center">
                          <PaperPlaneTilt size={14} />
                        </button>
                      </form>
                    </div>
                  )}

                  {detailTab === 'activity' && (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {activities && activities.length > 0 ? (
                        activities.map((act) => (
                          <div key={act.id} className="text-xs flex gap-2.5 items-start px-2 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 mt-1.5 shrink-0" />
                            <div>
                              <span className="text-zinc-350">{act.description}</span>
                              <span className="text-[9px] text-zinc-650 block mt-0.5">{new Date(act.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-xs text-zinc-600">No activity logs recorded.</div>
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* Destructive Card deletion button */}
              <div className="p-6 border-t border-zinc-900 bg-zinc-950/40">
                <button
                  onClick={() => {
                    if (window.confirm('Are you absolutely sure you want to permanently delete this task?')) {
                      deleteTaskMutation.mutate(taskDetails.id);
                    }
                  }}
                  className="w-full h-10 rounded-xl border border-rose-950 hover:border-rose-900 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Trash size={14} />
                  <span>Delete Task Card</span>
                </button>
              </div>

            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* CREATE PROJECT MODAL */}
      <AnimatePresence>
        {showCreateProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative w-full max-w-md rounded-3xl border border-zinc-900 bg-zinc-950 p-6 shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-lime-400/20 to-transparent" />
              
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-md font-bold text-zinc-100">Create new project</h3>
                <button 
                  onClick={() => setShowCreateProjectModal(false)}
                  className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-550 hover:text-zinc-350"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Project Name</label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-900 text-xs focus:outline-none focus:border-lime-550/40 text-zinc-150"
                    placeholder="Mobile Client App"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full h-20 p-3 rounded-xl bg-zinc-950 border border-zinc-900 text-xs focus:outline-none focus:border-lime-550/40 text-zinc-150 resize-none"
                    placeholder="Project scope detail..."
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateProjectModal(false)}
                    className="h-10 px-4 rounded-xl border border-zinc-900 text-zinc-400 text-xs font-semibold hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createProjectMutation.isPending}
                    className="h-10 px-5 rounded-xl bg-lime-400 text-zinc-950 font-bold text-xs hover:bg-lime-300 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    {createProjectMutation.isPending ? (
                      <span className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                    ) : (
                      <span>Create Project</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
