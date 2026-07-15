import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import toast from 'react-hot-toast';
import { Settings, Copy, Check, Trash2, ShieldAlert, ShieldCheck, Lock, Globe, Link, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SettingsTabProps {
  currentWs: any;
}

const subTabInfo = {
  general: { icon: Settings, label: 'General', color: '#a855f7' },
  invites: { icon: Link, label: 'Invites', color: '#818cf8' },
  security: { icon: Lock, label: 'Security', color: '#6366f1' },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(4px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as any }
  },
  exit: {
    opacity: 0, y: -12, filter: 'blur(4px)',
    transition: { duration: 0.25, ease: 'easeIn' as any }
  },
};

export default function SettingsTab({ currentWs }: SettingsTabProps) {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'invites' | 'security'>('general');
  const [wsName, setWsName] = useState(currentWs?.name || '');
  const [wsDescription, setWsDescription] = useState(currentWs?.description || '');
  const [allowedDomains, setAllowedDomains] = useState(currentWs?.allowedDomains || '');
  const [copyStatus, setCopyStatus] = useState(false);
  const [saving, setSaving] = useState(false);

  const [invites, setInvites] = useState<any[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmWsName, setConfirmWsName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const deleteWorkspace = async () => {
    if (confirmWsName !== currentWs?.name || !currentWs?.id) return;
    setDeleting(true);
    try {
      await api.delete(`/workspaces/${currentWs.id}`);
      toast.success('Workspace deleted successfully');
      window.location.reload();
    } catch {
      toast.error('Failed to delete workspace');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const updateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWs?.id || !wsName.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/workspaces/${currentWs.id}`, {
        name: wsName.trim(),
        description: wsDescription.trim(),
        allowedDomains: allowedDomains.trim()
      });
      toast.success('Workspace settings updated! 🎉');
      window.location.reload();
    } catch {
      toast.error('Failed to update workspace settings');
    } finally {
      setSaving(false);
    }
  };

  const fetchInvites = async () => {
    if (!currentWs?.id) return;
    setInvitesLoading(true);
    try {
      const res = await api.get(`/workspaces/${currentWs.id}/invites`);
      setInvites(res.data.data || []);
    } catch {
      toast.error('Failed to load pending invites');
    } finally {
      setInvitesLoading(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!currentWs?.id) return;
    try {
      await api.delete(`/workspaces/${currentWs.id}/invites/${inviteId}`);
      toast.success('Invite link revoked');
      fetchInvites();
    } catch {
      toast.error('Failed to revoke invite');
    }
  };

  useEffect(() => {
    if (activeSubTab === 'invites') {
      fetchInvites();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab, currentWs?.id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopyStatus(false), 2000);
  };

  // 2FA States
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableCode, setDisableCode] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);

  const start2FASetup = async () => {
    try {
      const res = await api.post('/auth/2fa/setup');
      setSetupData(res.data.data);
      setIsSettingUp(true);
      setBackupCodes([]);
      setSetupCode('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to start 2FA setup');
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/2fa/verify-setup', { code: setupCode });
      setBackupCodes(res.data.data.backupCodes);
      toast.success('Two-factor authentication enabled! 🎉');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Verification failed');
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/2fa/disable', { code: disableCode });
      toast.success('Two-factor authentication disabled.');
      setShowDisableForm(false);
      setDisableCode('');
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to disable 2FA');
    }
  };

  const finish2FASetup = () => {
    setIsSettingUp(false);
    setSetupData(null);
    setBackupCodes([]);
    setSetupCode('');
    window.location.reload();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '620px' }}
    >
      {/* Animated Sub-tab selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        style={{
          display: 'flex', gap: '4px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px', padding: '4px',
          position: 'relative',
        }}
      >
        {(['general', 'invites', 'security'] as const).map((tab, idx) => {
          const info = subTabInfo[tab];
          const isActive = activeSubTab === tab;
          return (
            <motion.button
              key={tab}
              type="button"
              onClick={() => setActiveSubTab(tab)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + idx * 0.05 }}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                background: 'none',
                border: 'none',
                borderRadius: '9px',
                padding: '9px 12px',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
                position: 'relative',
                transition: 'color 0.2s',
                zIndex: 1,
              }}
              whileHover={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.65)' }}
              whileTap={{ scale: 0.97 }}
            >
              {/* Active background pill */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="settingsTabPill"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: '9px',
                      border: '1px solid rgba(255,255,255,0.09)',
                      zIndex: -1,
                    }}
                  />
                )}
              </AnimatePresence>
              <motion.div
                animate={{ color: isActive ? info.color : 'rgba(255,255,255,0.3)' }}
                transition={{ duration: 0.2 }}
              >
                <info.icon size={13} />
              </motion.div>
              {info.label}
            </motion.button>
          );
        })}
      </motion.div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'general' && (
          <motion.div
            key="general"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            {/* Workspace Info Card */}
            <motion.div
              whileHover={{ borderColor: 'rgba(168,85,247,0.15)', boxShadow: '0 8px 32px rgba(168,85,247,0.05)' }}
              transition={{ duration: 0.2 }}
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '20px',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {/* Ambient decoration */}
              <div style={{
                position: 'absolute', top: -30, right: -30, width: 100, height: 100,
                borderRadius: '50%', background: 'rgba(168,85,247,0.05)', filter: 'blur(30px)', pointerEvents: 'none',
              }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <motion.div
                  whileHover={{ rotate: 90 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  style={{
                    width: '32px', height: '32px', borderRadius: '9px',
                    background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Settings size={14} style={{ color: '#a855f7' }} />
                </motion.div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Workspace Information</h3>
              </div>

              <form onSubmit={updateWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Workspace Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Workspace Name
                  </label>
                  <motion.div
                    animate={{
                      borderColor: focusedField === 'wsname' ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.07)',
                      boxShadow: focusedField === 'wsname' ? '0 0 0 3px rgba(168,85,247,0.09)' : '0 0 0 0px transparent',
                    }}
                    style={{
                      display: 'flex', alignItems: 'center',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '10px', padding: '10px 13px',
                    }}
                  >
                    <input
                      value={wsName}
                      onChange={e => setWsName(e.target.value)}
                      onFocus={() => setFocusedField('wsname')}
                      onBlur={() => setFocusedField(null)}
                      required
                      placeholder="My Workspace"
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit', padding: 0 }}
                    />
                  </motion.div>
                </div>

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Workspace Description
                  </label>
                  <motion.div
                    animate={{
                      borderColor: focusedField === 'description' ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.07)',
                      boxShadow: focusedField === 'description' ? '0 0 0 3px rgba(168,85,247,0.09)' : '0 0 0 0px transparent',
                    }}
                    style={{
                      display: 'flex', alignItems: 'flex-start',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '10px', padding: '10px 13px',
                    }}
                  >
                    <textarea
                      value={wsDescription}
                      onChange={e => setWsDescription(e.target.value)}
                      onFocus={() => setFocusedField('description')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Describe your workspace team, projects, and goals..."
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit', padding: 0, resize: 'vertical', minHeight: '60px' }}
                    />
                  </motion.div>
                </div>

                {/* Allowed Domains */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Globe size={10} /> Allowed Email Domains
                  </label>
                  <motion.div
                    animate={{
                      borderColor: focusedField === 'domains' ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.07)',
                      boxShadow: focusedField === 'domains' ? '0 0 0 3px rgba(168,85,247,0.09)' : '0 0 0 0px transparent',
                    }}
                    style={{
                      display: 'flex', alignItems: 'center',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '10px', padding: '10px 13px',
                    }}
                  >
                    <input
                      value={allowedDomains}
                      onChange={e => setAllowedDomains(e.target.value)}
                      onFocus={() => setFocusedField('domains')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="company.com, engineering.io (comma-separated)"
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit', padding: 0 }}
                    />
                  </motion.div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                    Users with these email domains are allowed to register/join.
                  </span>
                </div>

                {/* Workspace ID */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Workspace ID
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '10px', padding: '10px 13px',
                  }}>
                    <input
                      readOnly
                      value={currentWs?.id || ''}
                      style={{
                        flex: 1, background: 'none', border: 'none', outline: 'none',
                        color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: 'monospace',
                        padding: 0
                      }}
                    />
                    <motion.button
                      type="button"
                      className="btn-ghost"
                      onClick={() => copyToClipboard(currentWs?.id || '')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: '11px', borderRadius: '6px' }}
                    >
                      <AnimatePresence mode="wait">
                        {copyStatus ? (
                          <motion.span key="check" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} style={{ display: 'flex' }}>
                            <Check size={12} />
                          </motion.span>
                        ) : (
                          <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ display: 'flex' }}>
                            <Copy size={12} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {copyStatus ? 'Copied' : 'Copy'}
                    </motion.button>
                  </div>
                </div>

                <motion.button
                  className="btn-primary"
                  type="submit"
                  whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(168,85,247,0.3)' }}
                  whileTap={{ scale: 0.97 }}
                  style={{ alignSelf: 'flex-start', padding: '9px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={saving}
                >
                  <AnimatePresence mode="wait">
                    {saving ? (
                      <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        Saving…
                      </motion.span>
                    ) : (
                      <motion.span key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Save Changes <ChevronRight size={13} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </form>
            </motion.div>

            {/* Danger Zone */}
            {user?.id === currentWs?.ownerId && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                whileHover={{ borderColor: 'rgba(239,68,68,0.25)', boxShadow: '0 8px 32px rgba(239,68,68,0.05)' }}
                style={{
                  background: 'rgba(239,68,68,0.02)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: '14px', padding: '24px',
                  display: 'flex', flexDirection: 'column', gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    style={{
                      width: '32px', height: '32px', borderRadius: '9px',
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <ShieldAlert size={14} style={{ color: '#ef4444' }} />
                  </motion.div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444', margin: 0 }}>Danger Zone</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>
                  Deleting this workspace will permanently remove all associated projects, tasks, comments, and members. This action cannot be undone.
                </p>
                <motion.button
                  type="button"
                  className="btn-danger"
                  onClick={() => setShowDeleteModal(true)}
                  whileHover={{ scale: 1.02, boxShadow: '0 4px 18px rgba(239,68,68,0.3)' }}
                  whileTap={{ scale: 0.97 }}
                  style={{ alignSelf: 'flex-start', padding: '9px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash2 size={13} /> Delete Workspace
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeSubTab === 'invites' && (
          <motion.div
            key="invites"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px', padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '20px',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', top: -30, right: -30, width: 100, height: 100,
              borderRadius: '50%', background: 'rgba(99,102,241,0.05)', filter: 'blur(30px)', pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 15 }}
                transition={{ type: 'spring', stiffness: 300 }}
                style={{
                  width: '32px', height: '32px', borderRadius: '9px',
                  background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Link size={14} style={{ color: '#818cf8' }} />
              </motion.div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Active Pending Invites</h3>
            </div>

            <AnimatePresence mode="wait">
              {invitesLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 0' }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#818cf8', borderRadius: '50%' }}
                  />
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Loading invitations...</p>
                </motion.div>
              ) : invites.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  style={{ textAlign: 'center', padding: '24px 0' }}
                >
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    style={{ fontSize: '2rem', marginBottom: '8px' }}
                  >
                    📬
                  </motion.div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>No active pending invitations.</p>
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                >
                  {invites.map((invite, i) => (
                    <motion.div
                      key={invite.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12, scale: 0.95 }}
                      transition={{ delay: i * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ borderColor: 'rgba(99,102,241,0.2)', x: 2 }}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '10px', padding: '13px 16px',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f7', wordBreak: 'break-all' }}>
                          {invite.email || 'Shareable public invite'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                          Role: <span style={{ textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{invite.role}</span> &bull; 
                          Created by {invite.invitedBy?.name || 'Unknown'} &bull; 
                          Expires: {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : 'Never'}
                        </div>
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => handleRevokeInvite(invite.id)}
                        whileHover={{ scale: 1.05, boxShadow: '0 2px 12px rgba(239,68,68,0.2)' }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: '7px', padding: '5px 12px',
                          color: '#ef4444', fontSize: '11px', fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, marginLeft: '12px',
                        }}
                      >
                        Revoke
                      </motion.button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {activeSubTab === 'security' && (
          <motion.div
            key="security"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px', padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '20px',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', top: -30, right: -30, width: 100, height: 100,
              borderRadius: '50%', background: 'rgba(99,102,241,0.05)', filter: 'blur(30px)', pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <motion.div
                animate={{ scale: user?.twoFactorEnabled ? [1, 1.05, 1] : 1 }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                style={{
                  width: '32px', height: '32px', borderRadius: '9px',
                  background: user?.twoFactorEnabled ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
                  border: `1px solid ${user?.twoFactorEnabled ? 'rgba(16,185,129,0.25)' : 'rgba(99,102,241,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ShieldCheck size={14} style={{ color: user?.twoFactorEnabled ? '#10b981' : '#6366f1' }} />
              </motion.div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Two-Factor Authentication (2FA)</h3>
              {user?.twoFactorEnabled && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  style={{
                    fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                    background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)',
                  }}
                >
                  ACTIVE
                </motion.span>
              )}
            </div>

            {user?.twoFactorEnabled ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>
                  Two-factor authentication is active on your account. Every time you log in, you will need to enter a 6-digit verification code from your authenticator app.
                </p>

                <AnimatePresence mode="wait">
                  {showDisableForm ? (
                    <motion.form
                      key="disable"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleDisable2FA}
                      style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px', overflow: 'hidden' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          Verification Code to Disable
                        </label>
                        <div style={{
                          display: 'flex', alignItems: 'center',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.07)',
                          borderRadius: '10px', padding: '10px 13px',
                          maxWidth: '220px'
                        }}>
                          <input
                            placeholder="123456"
                            value={disableCode}
                            onChange={e => setDisableCode(e.target.value)}
                            maxLength={6}
                            required
                            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '14px', fontFamily: 'monospace', padding: 0, letterSpacing: '0.15em' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <motion.button type="button" className="btn-ghost" onClick={() => setShowDisableForm(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ padding: '8px 16px', fontSize: '13px' }}>
                          Cancel
                        </motion.button>
                        <motion.button type="submit" whileHover={{ scale: 1.02, boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }} whileTap={{ scale: 0.97 }} style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', color: '#fff', borderRadius: '9px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                          Confirm Disable
                        </motion.button>
                      </div>
                    </motion.form>
                  ) : (
                    <motion.button
                      key="disable-btn"
                      type="button"
                      className="btn-danger"
                      onClick={() => setShowDisableForm(true)}
                      whileHover={{ scale: 1.02, boxShadow: '0 4px 16px rgba(239,68,68,0.25)' }}
                      whileTap={{ scale: 0.97 }}
                      style={{ alignSelf: 'flex-start', padding: '9px 18px', fontSize: '13px' }}
                    >
                      Disable 2FA
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>
                  Protect your account with an extra layer of security. Use an authenticator app (like Google Authenticator or Authy) to scan a QR code and verify your login attempts.
                </p>

                <AnimatePresence mode="wait">
                  {!isSettingUp ? (
                    <motion.button
                      key="enable-btn"
                      type="button"
                      className="btn-primary"
                      onClick={start2FASetup}
                      whileHover={{ scale: 1.03, boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}
                      whileTap={{ scale: 0.97 }}
                      style={{ alignSelf: 'flex-start', padding: '9px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Lock size={13} /> Enable 2FA
                    </motion.button>
                  ) : (
                    <motion.div
                      key="setup"
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        background: 'rgba(255,255,255,0.015)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '10px', padding: '20px',
                        display: 'flex', flexDirection: 'column', gap: '18px',
                        overflow: 'hidden',
                      }}
                    >
                      {backupCodes.length > 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                        >
                          <motion.h4
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            style={{ fontSize: '13px', color: '#10b981', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Check size={14} /> 2FA Successfully Enabled!
                          </motion.h4>
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>
                            Please save these recovery backup codes in a safe place. If you lose access to your authenticator app, you can use these codes to log in. **They will not be shown again.**
                          </p>
                          <motion.div
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            style={{
                              background: 'rgba(0,0,0,0.25)', padding: '14px 16px', borderRadius: '9px',
                              fontFamily: 'monospace', fontSize: '12px', color: '#f5f5f7',
                              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
                              border: '1px solid rgba(255,255,255,0.06)'
                            }}
                          >
                            {backupCodes.map((code, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                style={{ display: 'flex', gap: '8px' }}
                              >
                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>{idx + 1}.</span>
                                <span>{code}</span>
                              </motion.div>
                            ))}
                          </motion.div>
                          <motion.button
                            type="button"
                            className="btn-ghost"
                            onClick={finish2FASetup}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px' }}
                          >
                            I've Saved the Codes
                          </motion.button>
                        </motion.div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {setupData?.otpauthUrl && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 250 }}
                                style={{ background: '#fff', padding: '8px', borderRadius: '10px', display: 'flex', width: 'fit-content', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                              >
                                <img
                                  src={`https://chart.googleapis.com/chart?chs=160x160&chld=M|0&cht=qr&chl=${encodeURIComponent(setupData.otpauthUrl)}`}
                                  alt="QR Code"
                                  style={{ width: '140px', height: '140px' }}
                                />
                              </motion.div>
                            )}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                              <h5 style={{ fontSize: '12px', color: '#f5f5f7', margin: 0, fontWeight: 600 }}>1. Scan the QR Code</h5>
                              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>
                                Scan the QR code with your Google Authenticator or Authy app. If you cannot scan it, enter this text code manually:
                              </p>
                              <motion.code
                                whileHover={{ background: 'rgba(168,85,247,0.1)' }}
                                style={{ background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '6px', color: '#a855f7', fontSize: '12px', fontFamily: 'monospace', width: 'fit-content', cursor: 'text', transition: 'background 0.2s' }}
                              >
                                {setupData?.secret}
                              </motion.code>
                            </div>
                          </div>

                          <form onSubmit={handleConfirm2FA} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                            <h5 style={{ fontSize: '12px', color: '#f5f5f7', margin: 0, fontWeight: 600 }}>2. Verify Authenticator Code</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{
                                display: 'flex', alignItems: 'center',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: '10px', padding: '10px 13px',
                                maxWidth: '220px'
                              }}>
                                <input
                                  placeholder="Enter 6-digit code"
                                  value={setupCode}
                                  onChange={e => setSetupCode(e.target.value)}
                                  maxLength={6}
                                  required
                                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '14px', fontFamily: 'monospace', padding: 0, letterSpacing: '0.15em' }}
                                />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <motion.button type="button" className="btn-ghost" onClick={() => setIsSettingUp(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ padding: '8px 16px', fontSize: '13px' }}>
                                Cancel
                              </motion.button>
                              <motion.button type="submit" className="btn-primary" whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }} whileTap={{ scale: 0.97 }} style={{ padding: '8px 16px', fontSize: '13px' }}>
                                Verify & Activate
                              </motion.button>
                            </div>
                          </form>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete workspace modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            }}
            onClick={() => { setShowDeleteModal(false); setConfirmWsName(''); }}
          >
            <motion.div
              initial={{ scale: 0.88, y: 28, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.88, y: 28, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'rgba(17,17,22,0.98)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '18px', padding: '32px', width: '100%', maxWidth: '400px',
                boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(239,68,68,0.1)',
              }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 280 }}
                style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}
              >
                <Trash2 size={20} style={{ color: '#ef4444' }} />
              </motion.div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginBottom: '10px' }}>Delete workspace?</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, marginBottom: '18px' }}>
                To confirm deletion, please type the workspace name: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{currentWs?.name}</strong>
              </p>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px', padding: '10px 13px', marginBottom: '22px'
              }}>
                <input
                  value={confirmWsName}
                  onChange={e => setConfirmWsName(e.target.value)}
                  placeholder="Type workspace name…"
                  autoFocus
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit', padding: 0 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <motion.button
                  className="btn-ghost"
                  onClick={() => { setShowDeleteModal(false); setConfirmWsName(''); }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ fontSize: '13px', padding: '8px 16px' }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  disabled={confirmWsName !== currentWs?.name || deleting}
                  onClick={deleteWorkspace}
                  whileHover={confirmWsName === currentWs?.name ? { scale: 1.02, boxShadow: '0 4px 18px rgba(239,68,68,0.35)' } : {}}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    background: confirmWsName === currentWs?.name ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(239,68,68,0.3)',
                    border: 'none', borderRadius: '9px',
                    color: '#fff', fontWeight: 700, fontSize: '13px',
                    padding: '8px 18px', cursor: confirmWsName === currentWs?.name ? 'pointer' : 'not-allowed',
                    opacity: deleting ? 0.6 : 1,
                    fontFamily: 'inherit', transition: 'background 0.2s',
                  }}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
