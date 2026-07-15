import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Trash, 
  Crown, 
  LockSimple, 
  PaperPlaneTilt,
  SignOut,
  FolderSimple,
  CheckCircle,
  Warning,
  Gear,
  Briefcase,
  ArrowRight,
  Bell,
  Checks,
  Calendar
} from '@phosphor-icons/react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect as ReactUseEffect } from 'react';

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  allowedDomains: string | null;
  createdAt: string;
}

interface Member {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface Invite {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  token: string;
  expiresAt: string | null;
}

interface Notification {
  id: string;
  userId: string;
  type: 'DUE_DATE' | 'GENERAL';
  payload: {
    taskId?: string;
    taskTitle?: string;
    dueDate?: string;
    message?: string;
  };
  readAt: string | null;
  createdAt: string;
}

export default function Dashboard() {
  const { user: authUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Active workspace and tab
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'settings'>('members');

  // Popup states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Invite states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);
  const [inviteErrorMsg, setInviteErrorMsg] = useState<string | null>(null);

  // Settings states
  const [workspaceName, setWorkspaceName] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);
  const [settingsErrorMsg, setSettingsErrorMsg] = useState<string | null>(null);

  // Notifications states
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [latestToast, setLatestToast] = useState<Notification | null>(null);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);

  // 1. Fetch user's workspaces
  const { data: workspaces, isLoading: isLoadingWorkspaces } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: () => apiRequest<Workspace[]>('/workspaces'),
  });

  const workspacesList = workspaces || [];
  const activeWorkspace = workspacesList.find(w => w.id === selectedWorkspaceId) || null;

  // Auto-select first workspace on load
  ReactUseEffect(() => {
    if (workspacesList.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspacesList[0].id);
    }
  }, [workspacesList, selectedWorkspaceId]);

  // Sync settings inputs when workspace changes
  ReactUseEffect(() => {
    if (activeWorkspace) {
      setWorkspaceName(activeWorkspace.name);
      setAllowedDomains(activeWorkspace.allowedDomains || '');
      setInviteSuccessMsg(null);
      setInviteErrorMsg(null);
      setSettingsSuccessMsg(null);
      setSettingsErrorMsg(null);
    }
  }, [selectedWorkspaceId, activeWorkspace]);

  // 2. Fetch workspace members
  const { data: members, isLoading: isLoadingMembers } = useQuery<Member[]>({
    queryKey: ['members', selectedWorkspaceId],
    queryFn: () => apiRequest<Member[]>(`/workspaces/${selectedWorkspaceId}/members`),
    enabled: !!selectedWorkspaceId
  });

  // 3. Fetch workspace active invites
  const { data: invites } = useQuery<Invite[]>({
    queryKey: ['invites', selectedWorkspaceId],
    queryFn: () => apiRequest<Invite[]>(`/workspaces/${selectedWorkspaceId}/invites`),
    enabled: !!selectedWorkspaceId
  });

  // 3.5. Fetch notifications
  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => apiRequest<Notification[]>('/notifications'),
    refetchInterval: 10000 // Poll every 10 seconds for new warnings/due dates!
  });

  const notificationsList = notifications || [];
  const unreadNotifications = notificationsList.filter(n => !n.readAt);

  // Monitor notifications list updates to trigger sliding Toast Popups
  ReactUseEffect(() => {
    const currentUnreadCount = unreadNotifications.length;
    if (currentUnreadCount > prevUnreadCount) {
      const latest = unreadNotifications[0];
      if (latest) {
        setLatestToast(latest);
        // Clear toast after 4s
        const t = setTimeout(() => setLatestToast(null), 4000);
        return () => clearTimeout(t);
      }
    }
    setPrevUnreadCount(currentUnreadCount);
  }, [unreadNotifications.length, prevUnreadCount]);

  // Notifications Mutations
  // Mark single read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/notifications/${id}/read`, {
      method: 'PATCH'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mark all read
  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest('/notifications/read-all', {
      method: 'PATCH'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Trigger due dates check job
  const checkDueDatesMutation = useMutation({
    mutationFn: () => apiRequest('/notifications/check-due-dates', {
      method: 'POST'
    }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      alert(data?.data?.message || 'Due date warning scans complete.');
    }
  });

  // 4. Create Workspace Mutation
  const createWorkspaceMutation = useMutation({
    mutationFn: (name: string) => apiRequest<{ id: string }>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setSelectedWorkspaceId(data.id);
      setShowCreateModal(false);
      setNewWorkspaceName('');
      setCreateError(null);
    },
    onError: (err: any) => {
      setCreateError(err.message || 'Failed to create workspace.');
    }
  });

  // 5. Update Workspace Mutation (Rename, Domain lock)
  const updateWorkspaceMutation = useMutation({
    mutationFn: (params: { name: string; allowedDomains: string }) => apiRequest(`/workspaces/${selectedWorkspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setSettingsSuccessMsg('Workspace configurations updated successfully.');
      setTimeout(() => setSettingsSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setSettingsErrorMsg(err.message || 'Failed to update workspace settings.');
    }
  });

  // 6. Delete Workspace Mutation
  const deleteWorkspaceMutation = useMutation({
    mutationFn: () => apiRequest(`/workspaces/${selectedWorkspaceId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setSelectedWorkspaceId(null);
      navigate('/dashboard');
    }
  });

  // 7. Invite Member Mutation
  const inviteMemberMutation = useMutation({
    mutationFn: (params: { email: string; role: string }) => apiRequest(`/workspaces/${selectedWorkspaceId}/invites`, {
      method: 'POST',
      body: JSON.stringify(params)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', selectedWorkspaceId] });
      setInviteSuccessMsg(`Invitation dispatched successfully to ${inviteEmail}.`);
      setInviteEmail('');
      setTimeout(() => setInviteSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setInviteErrorMsg(err.message || 'Failed to dispatch workspace invite.');
    }
  });

  // 8. Revoke Invite Mutation
  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: string) => apiRequest(`/workspaces/${selectedWorkspaceId}/invites/${inviteId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', selectedWorkspaceId] });
    }
  });

  // 9. Update Member Role Mutation
  const updateRoleMutation = useMutation({
    mutationFn: (params: { userId: string; role: string }) => apiRequest(`/workspaces/${selectedWorkspaceId}/members/${params.userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: params.role })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', selectedWorkspaceId] });
    }
  });

  // 10. Remove Member Mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => apiRequest(`/workspaces/${selectedWorkspaceId}/members/${userId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', selectedWorkspaceId] });
    }
  });

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    createWorkspaceMutation.mutate(newWorkspaceName.trim());
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteErrorMsg(null);
    setInviteSuccessMsg(null);
    inviteMemberMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsErrorMsg(null);
    setSettingsSuccessMsg(null);
    updateWorkspaceMutation.mutate({ name: workspaceName.trim(), allowedDomains: allowedDomains.trim() });
  };

  const isOwner = activeWorkspace?.ownerId === authUser?.id;

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden selection:bg-lime-400/30 selection:text-lime-400">
      
      {/* Background radial spotlight grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-lime-500/5 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[20%] w-[50vw] h-[50vw] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* LEFT SIDEBAR - Workspace Switcher */}
      <aside className="relative z-10 w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between shrink-0">
        <div className="p-4 flex flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2">
            <Link to="/" className="w-8 h-8 rounded-lg bg-gradient-to-tr from-lime-400 to-cyan-400 flex items-center justify-center font-black text-zinc-950 shadow-md shadow-lime-400/10">
              T
            </Link>
            <span className="text-md font-bold tracking-tight text-zinc-200">
              TaskFlow Hub
            </span>
          </div>

          {/* Workspace selection dropdown list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 text-[9px] uppercase tracking-widest text-zinc-550 font-bold">
              <span>Workspaces</span>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="w-4 h-4 rounded bg-zinc-900 border border-zinc-800 hover:border-lime-500/30 flex items-center justify-center text-zinc-400 hover:text-lime-400 transition-colors"
              >
                <Plus size={10} />
              </button>
            </div>

            {isLoadingWorkspaces ? (
              <div className="space-y-1.5 px-2">
                <div className="h-9 rounded-lg bg-zinc-900/50 animate-pulse" />
                <div className="h-9 rounded-lg bg-zinc-900/50 animate-pulse" />
              </div>
            ) : workspacesList && workspacesList.length > 0 ? (
              <div className="space-y-1">
                {workspacesList.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => setSelectedWorkspaceId(ws.id)}
                    className={`w-full h-10 px-3 rounded-xl flex items-center justify-between text-left text-xs font-semibold border transition-all ${
                      selectedWorkspaceId === ws.id
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-inner'
                        : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    {ws.ownerId === authUser?.id && (
                      <Crown size={12} className="text-lime-400 shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-2 py-4 text-center text-xs text-zinc-600 bg-zinc-950/20 rounded-xl border border-zinc-900 border-dashed">
                No active workspaces
              </div>
            )}
          </div>

          {/* Workspace Nav Links */}
          {selectedWorkspaceId && activeWorkspace && (
            <div className="space-y-1 border-t border-zinc-900 pt-4">
              <div className="px-2 pb-2 text-[9px] uppercase tracking-widest text-zinc-550 font-bold">
                Navigation
              </div>
              
              <Link
                to={`/workspaces/${selectedWorkspaceId}/projects/board`}
                className="w-full h-9 px-3 rounded-xl flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border border-transparent hover:border-zinc-900 transition-all"
              >
                <FolderSimple size={15} />
                <span>Kanban Board</span>
              </Link>
              
              <button
                onClick={() => setActiveTab('members')}
                className={`relative w-full h-9 px-3 rounded-xl flex items-center gap-2 text-xs font-semibold transition-colors ${
                  activeTab === 'members' ? 'text-lime-400 font-bold' : 'text-zinc-450 hover:text-zinc-200'
                }`}
              >
                {activeTab === 'members' && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 bg-zinc-900/40 border border-zinc-900 rounded-xl z-0"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Users size={15} className="relative z-10" />
                <span className="relative z-10">Members & Invites</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`relative w-full h-9 px-3 rounded-xl flex items-center gap-2 text-xs font-semibold transition-colors ${
                  activeTab === 'settings' ? 'text-lime-400 font-bold' : 'text-zinc-450 hover:text-zinc-200'
                }`}
              >
                {activeTab === 'settings' && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 bg-zinc-900/40 border border-zinc-900 rounded-xl z-0"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Gear size={15} className="relative z-10" />
                <span className="relative z-10">Workspace Settings</span>
              </button>
            </div>
          )}
        </div>

        {/* User Footer Panel */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-350 text-xs shrink-0 select-none uppercase">
              {authUser?.name.substring(0, 2) || 'US'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-zinc-200 truncate">{authUser?.name}</div>
              <div className="text-[10px] text-zinc-500 truncate">{authUser?.email}</div>
            </div>
          </div>
          <button 
            onClick={() => logout()}
            className="w-8 h-8 rounded-lg border border-zinc-900 hover:border-zinc-800 text-zinc-500 hover:text-rose-400 flex items-center justify-center transition-colors active:scale-95 shrink-0"
            title="Log Out"
          >
            <SignOut size={14} />
          </button>
        </div>
      </aside>

      {/* MAIN PANEL */}
      <main className="relative z-10 flex-1 flex flex-col min-w-0">
        
        {!selectedWorkspaceId ? (
          /* NO WORKSPACE SELECTED INITIAL WELCOME STATE */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-500 mb-6">
              <Briefcase size={32} />
            </div>
            <h1 className="text-2xl font-black text-zinc-100 tracking-tight">Select a workspace</h1>
            <p className="text-xs text-zinc-400 mt-2 max-w-[40ch] leading-relaxed">
              Create a new workspace or click on an existing membership to manage columns, projects, and domain settings.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 inline-flex h-10 items-center justify-center gap-2 px-6 rounded-xl bg-lime-400 text-zinc-950 font-bold text-xs hover:bg-lime-300 active:scale-[0.98] transition-all shadow-md shadow-lime-400/10"
            >
              <Plus size={14} />
              <span>Create new workspace</span>
            </button>
          </div>
        ) : (
          /* ACTIVE WORKSPACE WORKVIEW */
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header info */}
            <div className="h-16 px-8 border-b border-zinc-900 bg-zinc-950/20 backdrop-blur-sm flex items-center justify-between shrink-0">
              <div>
                <h1 className="text-md font-bold text-zinc-100 flex items-center gap-2">
                  <span>{activeWorkspace?.name}</span>
                  <span className="text-[10px] font-mono text-zinc-550 uppercase tracking-widest bg-zinc-900/60 border border-zinc-800 px-2 py-0.5 rounded-md">
                    WS_ID: {activeWorkspace?.id.substring(0, 8)}...
                  </span>
                </h1>
              </div>
              <div className="flex items-center gap-4 relative">
                
                {/* Notification Bell Icon */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                    className="w-9 h-9 rounded-xl border border-zinc-900 hover:border-zinc-800 flex items-center justify-center text-zinc-450 hover:text-lime-400 transition-colors relative"
                    title="View Notifications"
                  >
                    <Bell size={16} />
                    {unreadNotifications.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-lime-400 shadow-md shadow-lime-400/20" />
                    )}
                  </button>

                  {/* Glassmorphic Dropdown Popover */}
                  <AnimatePresence>
                    {showNotificationPanel && (
                      <>
                        {/* Invisible clickaway overlay */}
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotificationPanel(false)} />
                        
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                          className="absolute right-0 mt-2.5 w-80 rounded-2xl border border-zinc-900 bg-zinc-950 p-4 shadow-2xl z-50 overflow-hidden"
                        >
                          {/* Top light bar */}
                          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-lime-400/20 to-transparent" />
                          
                          <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5 mb-3">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Inbox Notifications</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => checkDueDatesMutation.mutate()}
                                className="text-[8px] font-bold text-zinc-500 hover:text-lime-400 uppercase tracking-widest"
                                title="Run task dates warning scan"
                              >
                                Scan Dates
                              </button>
                              {unreadNotifications.length > 0 && (
                                <button
                                  onClick={() => markAllReadMutation.mutate()}
                                  className="text-[8px] font-bold text-zinc-500 hover:text-lime-400 uppercase tracking-widest flex items-center gap-1"
                                >
                                  <Checks size={10} />
                                  <span>Mark All Read</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Notifications list feed */}
                          <div className="max-h-60 overflow-y-auto space-y-2.5 pr-0.5">
                            {notificationsList.length > 0 ? (
                              notificationsList.map((notif) => {
                                const isUnread = !notif.readAt;
                                return (
                                  <div
                                    key={notif.id}
                                    onClick={() => {
                                      if (isUnread) markReadMutation.mutate(notif.id);
                                    }}
                                    className={`p-3 rounded-xl border transition-all text-xs flex gap-2.5 items-start cursor-pointer ${
                                      isUnread
                                        ? 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-800'
                                        : 'bg-transparent border-transparent opacity-50'
                                    }`}
                                  >
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                      isUnread ? 'bg-lime-500/10 text-lime-400' : 'bg-zinc-900 text-zinc-500'
                                    }`}>
                                      <Calendar size={13} />
                                    </div>
                                    <div className="flex-grow space-y-0.5">
                                      <p className="font-semibold text-zinc-250 leading-snug">
                                        Task "{notif.payload.taskTitle}" is approaching its due date!
                                      </p>
                                      {notif.payload.dueDate && (
                                        <span className="text-[9px] text-zinc-500 font-mono block">
                                          Due: {new Date(notif.payload.dueDate).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                    {isUnread && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-lime-400 mt-1.5 shrink-0" />
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="py-8 text-center text-xs text-zinc-650">No notifications in inbox.</div>
                            )}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <Link
                  to={`/workspaces/${selectedWorkspaceId}/projects/board`}
                  className="inline-flex h-9 items-center gap-2 px-4 rounded-lg bg-lime-400 text-zinc-950 text-xs font-bold hover:bg-lime-350 transition-all shadow-md shadow-lime-400/10 active:scale-[0.98]"
                >
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Content view tabs */}
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl w-full mx-auto">
              
              <AnimatePresence mode="wait">
                {activeTab === 'members' ? (
                  
                  /* MEMBERS AND INVITES TAB VIEW */
                  <motion.div
                    key="members-tab"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    
                    {/* Invite Team Member section */}
                    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400">
                          <PaperPlaneTilt size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-zinc-150">Invite team member</h3>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Send a secure authentication join invitation link.</p>
                        </div>
                      </div>

                      {inviteSuccessMsg && (
                        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2 items-center">
                          <CheckCircle size={14} />
                          <span>{inviteSuccessMsg}</span>
                        </div>
                      )}

                      {inviteErrorMsg && (
                        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex gap-2 items-center">
                          <Warning size={14} />
                          <span>{inviteErrorMsg}</span>
                        </div>
                      )}

                      <form onSubmit={handleInviteSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
                        <div className="flex-grow w-full space-y-2">
                          <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
                          <input
                            type="email"
                            required
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-150 placeholder:text-zinc-650 focus:outline-none focus:border-lime-500/40 text-xs transition-colors"
                            placeholder="colleague@company.com"
                          />
                        </div>
                        
                        <div className="w-full sm:w-36 space-y-2 shrink-0">
                          <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Role Type</label>
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as any)}
                            className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-150 focus:outline-none focus:border-lime-500/40 text-xs transition-colors"
                          >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          disabled={inviteMemberMutation.isPending}
                          className="w-full sm:w-auto h-10 px-5 rounded-xl bg-lime-400 text-zinc-950 font-bold text-xs hover:bg-lime-300 transition-colors shrink-0 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                        >
                          {inviteMemberMutation.isPending ? (
                            <span className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                          ) : (
                            <>
                              <span>Send Invite</span>
                              <PaperPlaneTilt size={14} />
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Members List Table */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Workspace Members ({members?.length || 0})</h3>
                      <div className="rounded-2xl border border-zinc-900 bg-zinc-950/20 overflow-hidden">
                        {isLoadingMembers ? (
                          <div className="p-8 text-center text-xs text-zinc-500 animate-pulse">Retrieving member directory...</div>
                        ) : members && members.length > 0 ? (
                          <div className="divide-y divide-zinc-900/60">
                            {members.map((member) => {
                              const isMemberOwner = member.role === 'OWNER';
                              const isSelf = member.userId === authUser?.id;
                              
                              return (
                                <div key={member.userId} className="p-4 flex items-center justify-between text-xs gap-4 hover:bg-zinc-900/10 transition-colors">
                                  <div className="flex items-center gap-3 truncate">
                                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-350 text-xs uppercase shrink-0">
                                      {member.user.name.substring(0, 2)}
                                    </div>
                                    <div className="truncate">
                                      <div className="font-bold text-zinc-200 truncate flex items-center gap-1.5">
                                        <span>{member.user.name}</span>
                                        {isSelf && <span className="text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1 py-0.5 rounded font-mono">YOU</span>}
                                      </div>
                                      <div className="text-[10px] text-zinc-500 truncate mt-0.5">{member.user.email}</div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {/* Role selection dropdown */}
                                    {isMemberOwner ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-lime-400/10 text-lime-400 border border-lime-400/20 text-[9px] font-bold uppercase tracking-wider font-mono">
                                        <Crown size={10} />
                                        <span>Owner</span>
                                      </span>
                                    ) : isOwner && !isSelf ? (
                                      <select
                                        value={member.role}
                                        onChange={(e) => updateRoleMutation.mutate({ userId: member.userId, role: e.target.value })}
                                        className="h-8 px-2 rounded-lg bg-zinc-950 border border-zinc-850 text-zinc-300 focus:outline-none focus:border-lime-500/40 text-[10px] font-semibold transition-colors"
                                      >
                                        <option value="ADMIN">Admin</option>
                                        <option value="MEMBER">Member</option>
                                        <option value="VIEWER">Viewer</option>
                                      </select>
                                    ) : (
                                      <span className="inline-flex px-2.5 py-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-850 text-[9px] font-semibold uppercase tracking-wider font-mono">
                                        {member.role}
                                      </span>
                                    )}

                                    {/* Remove member button */}
                                    {isOwner && !isMemberOwner && !isSelf && (
                                      <button
                                        onClick={() => removeMemberMutation.mutate(member.userId)}
                                        className="w-8 h-8 rounded-lg border border-zinc-900 hover:border-rose-500/20 text-zinc-500 hover:text-rose-400 flex items-center justify-center transition-colors"
                                        title="Remove Member"
                                      >
                                        <Trash size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-xs text-zinc-500">No member accounts registered.</div>
                        )}
                      </div>
                    </div>

                    {/* Active Invites List */}
                    {invites && invites.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Active Invitations</h3>
                        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/20 divide-y divide-zinc-900/60 overflow-hidden">
                          {invites.map((invite) => (
                            <div key={invite.id} className="p-4 flex items-center justify-between text-xs gap-4 hover:bg-zinc-900/10 transition-colors">
                              <div className="truncate">
                                <div className="font-bold text-zinc-200 truncate">{invite.email}</div>
                                <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider mt-0.5">Role Invited: {invite.role}</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-zinc-500 font-medium">Pending callback</span>
                                {isOwner && (
                                  <button
                                    onClick={() => revokeInviteMutation.mutate(invite.id)}
                                    className="w-8 h-8 rounded-lg border border-zinc-900 hover:border-rose-500/20 text-zinc-500 hover:text-rose-400 flex items-center justify-center transition-colors"
                                    title="Revoke Invite"
                                  >
                                    <Trash size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </motion.div>
                ) : (
                  
                  /* WORKSPACE SETTINGS VIEW */
                  <motion.div
                    key="settings-tab"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    
                    {/* General Settings */}
                    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                          <Gear size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-zinc-150">Workspace Configurations</h3>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Update branding, domain access, and locks.</p>
                        </div>
                      </div>

                      {settingsSuccessMsg && (
                        <div className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2 items-center">
                          <CheckCircle size={14} />
                          <span>{settingsSuccessMsg}</span>
                        </div>
                      )}

                      {settingsErrorMsg && (
                        <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex gap-2 items-center">
                          <Warning size={14} />
                          <span>{settingsErrorMsg}</span>
                        </div>
                      )}

                      <form onSubmit={handleSettingsSubmit} className="space-y-5">
                        <div className="space-y-2">
                          <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Workspace Name</label>
                          <input
                            type="text"
                            required
                            disabled={!isOwner}
                            value={workspaceName}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-150 placeholder:text-zinc-650 focus:outline-none focus:border-lime-500/40 text-xs transition-colors disabled:opacity-50"
                            placeholder="Design Studio"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Domain Membership Lock</label>
                            <span className="inline-flex items-center gap-1 text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                              <LockSimple size={10} />
                              <span>Domain Guard</span>
                            </span>
                          </div>
                          <input
                            type="text"
                            disabled={!isOwner}
                            value={allowedDomains}
                            onChange={(e) => setAllowedDomains(e.target.value)}
                            className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-150 placeholder:text-zinc-650 focus:outline-none focus:border-lime-500/40 text-xs transition-colors disabled:opacity-50 font-mono"
                            placeholder="e.g. company.com, engineering.org (comma-separated)"
                          />
                          <p className="text-[9px] text-zinc-500 leading-normal">
                            If configured, users attempting to join or log in must possess verified email addresses matching these target domains. Leave blank to disable domain checks.
                          </p>
                        </div>

                        {isOwner && (
                          <button
                            type="submit"
                            disabled={updateWorkspaceMutation.isPending}
                            className="h-10 px-6 rounded-xl bg-lime-400 text-zinc-950 font-bold text-xs hover:bg-lime-300 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
                          >
                            {updateWorkspaceMutation.isPending ? (
                              <span className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                            ) : (
                              <span>Save Configurations</span>
                            )}
                          </button>
                        )}
                      </form>
                    </div>

                    {/* Danger Zone */}
                    {isOwner && (
                      <div className="rounded-2xl border border-rose-950 bg-rose-950/5 p-6 space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                            <Warning size={16} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-rose-450">Delete Workspace</h3>
                            <p className="text-[10px] text-rose-600 mt-0.5">Destructive action. This cannot be undone.</p>
                          </div>
                        </div>

                        <p className="text-[10px] text-rose-500 leading-normal max-w-[50ch]">
                          Deleting this workspace will immediately remove all projects, tasks, checklists, time-logs, and membership records permanently.
                        </p>

                        <button
                          onClick={() => {
                            if (window.confirm(`Are you absolutely sure you want to delete ${activeWorkspace?.name}?`)) {
                              deleteWorkspaceMutation.mutate();
                            }
                          }}
                          disabled={deleteWorkspaceMutation.isPending}
                          className="h-10 px-6 rounded-xl bg-rose-500 text-zinc-100 font-bold text-xs hover:bg-rose-650 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
                        >
                          {deleteWorkspaceMutation.isPending ? (
                            <span className="w-4 h-4 rounded-full border-2 border-zinc-100 border-t-transparent animate-spin" />
                          ) : (
                            <>
                              <Trash size={14} />
                              <span>Permanently Delete Workspace</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
        )}

      </main>

      {/* CREATE WORKSPACE POPUP MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-md">
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative w-full max-w-md rounded-3xl border border-zinc-900 bg-zinc-950 p-6 shadow-2xl overflow-hidden"
            >
              {/* Header top light */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-lime-400/20 to-transparent" />
              
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-md font-bold text-zinc-100">Create new workspace</h3>
                <button 
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewWorkspaceName('');
                    setCreateError(null);
                  }}
                  className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-350 transition-colors"
                >
                  &times;
                </button>
              </div>

              {createError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex gap-2 items-center">
                  <Warning size={14} />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateWorkspace} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Workspace Name</label>
                  <input
                    type="text"
                    required
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-150 placeholder:text-zinc-650 focus:outline-none focus:border-lime-500/40 text-xs transition-colors"
                    placeholder="Engineering Studio"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewWorkspaceName('');
                      setCreateError(null);
                    }}
                    className="h-10 px-4 rounded-xl border border-zinc-900 text-zinc-400 text-xs font-semibold hover:bg-zinc-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createWorkspaceMutation.isPending}
                    className="h-10 px-5 rounded-xl bg-lime-400 text-zinc-950 font-bold text-xs hover:bg-lime-300 transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    {createWorkspaceMutation.isPending ? (
                      <span className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                    ) : (
                      <span>Create Workspace</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* FLOATING TOAST POPUPS OVERLAY PANEL */}
      <AnimatePresence>
        {latestToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-80 p-4 rounded-2xl border border-lime-500/20 bg-zinc-950/90 backdrop-blur-md shadow-2xl flex gap-3 items-start cursor-pointer hover:border-lime-500/35 transition-colors"
            onClick={() => {
              markReadMutation.mutate(latestToast.id);
              setLatestToast(null);
            }}
          >
            <div className="w-8 h-8 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400 shrink-0">
              <Bell size={16} />
            </div>
            <div className="flex-grow space-y-0.5 text-xs">
              <h4 className="font-bold text-zinc-150">Upcoming Task Warning</h4>
              <p className="text-zinc-400 leading-snug">
                Task "{latestToast.payload.taskTitle}" is approaching its due date!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
