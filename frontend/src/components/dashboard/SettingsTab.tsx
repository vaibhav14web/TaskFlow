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
  hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as any }
  },
  exit: {
    opacity: 0, y: -10, filter: 'blur(4px)',
    transition: { duration: 0.2, ease: 'easeIn' as any }
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

  // Spotlight coordinates
  const [coords, setCoords] = useState({ x: 0, y: 0 });

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
    <div
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '620px', position: 'relative' }}
    >
      {/* Sub-tab Selector */}
      <div style={{
        display: 'flex', gap: '4px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px', padding: '3px',
      }}>
        {(['general', 'invites', 'security'] as const).map((tab) => {
          const info = subTabInfo[tab];
          const isActive = activeSubTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveSubTab(tab)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                border: isActive ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                borderRadius: '8px', padding: '8px 12px',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              <info.icon size={12} style={{ color: isActive ? info.color : 'rgba(255,255,255,0.3)' }} />
              {info.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'general' && (
          <motion.div
            key="general"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* General Settings Box */}
            <div style={{
              background: `radial-gradient(240px circle at ${coords.x}px ${coords.y}px, rgba(255,255,255,0.02), transparent 75%), rgba(255,255,255,0.012)`,
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px', padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '20px',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '6px',
                  background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Settings size={13} style={{ color: '#a855f7' }} />
                </div>
                <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Workspace Information</h3>
              </div>

              <form onSubmit={updateWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Workspace Name</label>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px', padding: '10px 12px'
                  }}>
                    <input
                      value={wsName}
                      onChange={e => setWsName(e.target.value)}
                      required
                      placeholder="My Workspace"
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '13px' }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Workspace Description</label>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px', padding: '10px 12px'
                  }}>
                    <textarea
                      value={wsDescription}
                      onChange={e => setWsDescription(e.target.value)}
                      placeholder="Describe this workspace's workflow and projects…"
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', minHeight: '60px' }}
                    />
                  </div>
                </div>

                {/* Domains */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Allowed Domains</label>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px', padding: '10px 12px'
                  }}>
                    <input
                      value={allowedDomains}
                      onChange={e => setAllowedDomains(e.target.value)}
                      placeholder="company.com, engineering.io"
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '13px' }}
                    />
                  </div>
                </div>

                {/* ID */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Workspace ID</label>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: '8px', padding: '10px 12px'
                  }}>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)' }}>{currentWs?.id}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(currentWs?.id || '')}
                      style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px', padding: '4px 10px', color: 'rgba(255,255,255,0.7)',
                        fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      {copyStatus ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={saving}
                  whileHover={{ scale: 1.02, boxShadow: '0 4px 18px rgba(168,85,247,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    alignSelf: 'flex-start', padding: '8px 20px', border: 'none', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff',
                    fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  {saving ? 'Saving…' : 'Save Changes'} <ChevronRight size={13} />
                </motion.button>
              </form>
            </div>

            {/* Danger Zone */}
            {user?.id === currentWs?.ownerId && (
              <div style={{
                background: 'rgba(239,68,68,0.015)', border: '1px solid rgba(239,68,68,0.12)',
                borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldAlert size={14} style={{ color: '#ef4444' }} />
                  <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#ef4444', margin: 0 }}>Danger Zone</h3>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>
                  Deleting this workspace will permanently erase all projects, tasks, members, and data. This action is irreversible.
                </p>
                <motion.button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  whileHover={{ scale: 1.02, boxShadow: '0 4px 18px rgba(239,68,68,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    alignSelf: 'flex-start', padding: '8px 16px', border: 'none', borderRadius: '8px',
                    background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Trash2 size={13} /> Delete Workspace
                </motion.button>
              </div>
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
              background: `radial-gradient(240px circle at ${coords.x}px ${coords.y}px, rgba(255,255,255,0.02), transparent 75%), rgba(255,255,255,0.012)`,
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px', padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '20px',
              position: 'relative', overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '6px',
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Link size={13} style={{ color: '#818cf8' }} />
              </div>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Active Pending Invites</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {invitesLoading ? (
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Loading invitations…</span>
              ) : invites.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '12.5px', color: 'rgba(255,255,255,0.3)' }}>
                  <span>📬</span> No active invitations pending.
                </div>
              ) : (
                invites.map((invite) => (
                  <div
                    key={invite.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '10px', padding: '12px 14px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#f5f5f7' }}>{invite.email || 'Public Share Link'}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                        Role: {invite.role} &bull; Invited by {invite.invitedBy?.name}
                      </div>
                    </div>
                    <motion.button
                      type="button"
                      onClick={() => handleRevokeInvite(invite.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '6px', padding: '4px 10px', color: '#ef4444',
                        fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      Revoke
                    </motion.button>
                  </div>
                ))
              )}
            </div>
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
              background: `radial-gradient(240px circle at ${coords.x}px ${coords.y}px, rgba(255,255,255,0.02), transparent 75%), rgba(255,255,255,0.012)`,
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px', padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '20px',
              position: 'relative', overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '6px',
                background: user?.twoFactorEnabled ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                border: `1px solid ${user?.twoFactorEnabled ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ShieldCheck size={13} style={{ color: user?.twoFactorEnabled ? '#10b981' : '#6366f1' }} />
              </div>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Two-Factor Authentication (2FA)</h3>
              {user?.twoFactorEnabled && (
                <span style={{ fontSize: '9px', fontWeight: 800, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '1px 6px', borderRadius: '4px' }}>ACTIVE</span>
              )}
            </div>

            {user?.twoFactorEnabled ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>
                  2FA is active. Every log in attempt will require a verification code from your authenticator app.
                </p>

                <AnimatePresence mode="wait">
                  {showDisableForm ? (
                    <form onSubmit={handleDisable2FA} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Verification Code</label>
                        <input
                          placeholder="123456"
                          value={disableCode}
                          onChange={e => setDisableCode(e.target.value)}
                          maxLength={6}
                          required
                          style={{
                            background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px', outline: 'none', maxWidth: '200px'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => setShowDisableForm(false)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'rgba(255,255,255,0.6)', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" style={{ background: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Confirm Disable</button>
                      </div>
                    </form>
                  ) : (
                    <motion.button
                      onClick={() => setShowDisableForm(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        alignSelf: 'flex-start', padding: '8px 16px', border: 'none', borderRadius: '8px',
                        background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer'
                      }}
                    >
                      Disable 2FA
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>
                  Secure your workspace workspace credentials by enforcing a secondary authentication requirement upon login.
                </p>

                <AnimatePresence mode="wait">
                  {!isSettingUp ? (
                    <motion.button
                      onClick={start2FASetup}
                      whileHover={{ scale: 1.02, boxShadow: '0 4px 18px rgba(99,102,241,0.3)' }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        alignSelf: 'flex-start', padding: '8px 16px', border: 'none', borderRadius: '8px',
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff',
                        fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <Lock size={12} /> Enable 2FA
                    </motion.button>
                  ) : (
                    <div style={{
                      background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px'
                    }}>
                      {backupCodes.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: '#10b981', margin: 0 }}>✓ 2FA Successfully Enabled!</h4>
                          <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>
                            Please store these emergency backup recovery codes in a safe place. They will not be shown again.
                          </p>
                          <div style={{
                            background: 'rgba(0,0,0,0.25)', padding: '12px 14px', borderRadius: '8px',
                            fontFamily: 'monospace', fontSize: '11px', color: '#fff',
                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}>
                            {backupCodes.map((code, idx) => (
                              <div key={idx} style={{ display: 'flex', gap: '6px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>{idx + 1}.</span>
                                <span>{code}</span>
                              </div>
                            ))}
                          </div>
                          <button onClick={finish2FASetup} style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#fff', padding: '5px 12px', fontSize: '11px', cursor: 'pointer' }}>
                            Close and Refresh
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {setupData?.otpauthUrl && (
                              <div style={{ background: '#fff', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                                <img
                                  src={`https://chart.googleapis.com/chart?chs=130x130&chld=M|0&cht=qr&chl=${encodeURIComponent(setupData.otpauthUrl)}`}
                                  alt="QR Code"
                                  style={{ width: '120px', height: '120px' }}
                                />
                              </div>
                            )}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
                              <h5 style={{ fontSize: '11.5px', color: '#f5f5f7', margin: 0, fontWeight: 700 }}>1. Scan QR Code</h5>
                              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4, margin: 0 }}>
                                Scan this with Google Authenticator. Alternatively, enter the key manually:
                              </p>
                              <code style={{ background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '4px', color: '#a855f7', fontSize: '11px', fontFamily: 'monospace', width: 'fit-content' }}>
                                {setupData?.secret}
                              </code>
                            </div>
                          </div>

                          <form onSubmit={handleConfirm2FA} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '14px' }}>
                            <h5 style={{ fontSize: '11.5px', color: '#f5f5f7', margin: 0, fontWeight: 700 }}>2. Confirm setup</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <input
                                placeholder="Enter 6-digit code"
                                value={setupCode}
                                onChange={e => setSetupCode(e.target.value)}
                                maxLength={6}
                                required
                                style={{
                                  background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '13px', outline: 'none', maxWidth: '200px'
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button type="button" onClick={() => setIsSettingUp(false)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'rgba(255,255,255,0.6)', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                              <button type="submit" style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', border: 'none', borderRadius: '8px', color: '#fff', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Verify and Enable</button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Workspace Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}
            onClick={() => { setShowDeleteModal(false); setConfirmWsName(''); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#111116', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '380px',
                boxShadow: '0 32px 64px rgba(0,0,0,0.6)'
              }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
              }}>
                <Trash2 size={16} style={{ color: '#ef4444' }} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f5f5f7', marginBottom: '8px' }}>Delete workspace?</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '20px' }}>
                Please type the workspace name <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{currentWs?.name}</strong> to confirm.
              </p>
              <input
                value={confirmWsName}
                onChange={e => setConfirmWsName(e.target.value)}
                placeholder="Type workspace name"
                style={{
                  width: '100%', background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px',
                  padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none', marginBottom: '20px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn-ghost" onClick={() => { setShowDeleteModal(false); setConfirmWsName(''); }} style={{ fontSize: '13px', padding: '7px 14px' }}>Cancel</button>
                <button
                  disabled={confirmWsName !== currentWs?.name || deleting}
                  onClick={deleteWorkspace}
                  style={{
                    background: '#ef4444', border: 'none', borderRadius: '8px',
                    color: '#fff', fontWeight: 700, fontSize: '13px',
                    padding: '7px 14px', cursor: 'pointer', opacity: deleting || confirmWsName !== currentWs?.name ? 0.6 : 1,
                    fontFamily: 'inherit'
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
