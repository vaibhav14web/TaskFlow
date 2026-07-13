import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import toast from 'react-hot-toast';
import { Settings, Copy, Check, Trash2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SettingsTabProps {
  currentWs: any;
}

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}
    >
      {/* Sub-tab selector */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
        {(['general', 'invites', 'security'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveSubTab(tab)}
            style={{
              background: activeSubTab === tab ? 'rgba(255,255,255,0.05)' : 'none',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              color: activeSubTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.2s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'general' && (
          <motion.div
            key="general"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            <div style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px', padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '8px',
                  background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Settings size={14} style={{ color: '#a855f7' }} />
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Workspace Information</h3>
              </div>

              <form onSubmit={updateWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Workspace Name
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${focusedField === 'wsname' ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '9px', padding: '9px 12px',
                    transition: 'border-color 0.2s',
                    boxShadow: focusedField === 'wsname' ? '0 0 0 3px rgba(168,85,247,0.08)' : 'none',
                  }}>
                    <input
                      value={wsName}
                      onChange={e => setWsName(e.target.value)}
                      onFocus={() => setFocusedField('wsname')}
                      onBlur={() => setFocusedField(null)}
                      required
                      placeholder="My Workspace"
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit', padding: 0 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Workspace Description
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${focusedField === 'description' ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '9px', padding: '9px 12px',
                    transition: 'border-color 0.2s',
                    boxShadow: focusedField === 'description' ? '0 0 0 3px rgba(168,85,247,0.08)' : 'none',
                  }}>
                    <textarea
                      value={wsDescription}
                      onChange={e => setWsDescription(e.target.value)}
                      onFocus={() => setFocusedField('description')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Describe your workspace team, projects, and goals..."
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit', padding: 0, resize: 'vertical', minHeight: '60px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Allowed Email Domains
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${focusedField === 'domains' ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '9px', padding: '9px 12px',
                    transition: 'border-color 0.2s',
                    boxShadow: focusedField === 'domains' ? '0 0 0 3px rgba(168,85,247,0.08)' : 'none',
                  }}>
                    <input
                      value={allowedDomains}
                      onChange={e => setAllowedDomains(e.target.value)}
                      onFocus={() => setFocusedField('domains')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="company.com, engineering.io (comma-separated)"
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit', padding: 0 }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                    Users with these email domains are allowed to register/join.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Workspace ID
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '9px', padding: '9px 12px',
                  }}>
                    <input
                      readOnly
                      value={currentWs?.id || ''}
                      style={{
                        flex: 1, background: 'none', border: 'none', outline: 'none',
                        color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontFamily: 'monospace',
                        padding: 0
                      }}
                    />
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => copyToClipboard(currentWs?.id || '')}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: '11px', borderRadius: '6px' }}
                    >
                      {copyStatus ? <Check size={12} /> : <Copy size={12} />}
                      {copyStatus ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <motion.button
                  className="btn-primary"
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px' }}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </motion.button>
              </form>
            </div>

            {user?.id === currentWs?.ownerId && (
              <div style={{
                background: 'rgba(239,68,68,0.02)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: '12px', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ShieldAlert size={14} style={{ color: '#ef4444' }} />
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444', margin: 0 }}>Danger Zone</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>
                  Deleting this workspace will permanently remove all associated projects, tasks, comments, and members. This action cannot be undone.
                </p>
                <motion.button
                  type="button"
                  className="btn-danger"
                  onClick={() => setShowDeleteModal(true)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px' }}
                >
                  Delete Workspace
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {activeSubTab === 'invites' && (
          <motion.div
            key="invites"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px', padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px',
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Copy size={14} style={{ color: '#818cf8' }} />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Active Pending Invites</h3>
            </div>

            {invitesLoading ? (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Loading invitations...</p>
            ) : invites.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>No active pending invitations.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {invites.map((invite) => (
                  <div key={invite.id} style={{
                    display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: '8px', padding: '12px 16px'
                  }}>
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
                    <button
                      type="button"
                      onClick={() => handleRevokeInvite(invite.id)}
                      style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: '6px', padding: '4px 10px',
                        color: '#ef4444', fontSize: '11px', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeSubTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px', padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px',
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShieldCheck size={14} style={{ color: '#6366f1' }} />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Two-Factor Authentication (2FA)</h3>
            </div>

            {user?.twoFactorEnabled ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>
                  Two-factor authentication is active on your account. Every time you log in, you will need to enter a 6-digit verification code from your authenticator app.
                </p>

                {showDisableForm ? (
                  <form onSubmit={handleDisable2FA} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Verification Code to Disable
                      </label>
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '9px', padding: '9px 12px',
                        maxWidth: '220px'
                      }}>
                        <input
                          placeholder="123456"
                          value={disableCode}
                          onChange={e => setDisableCode(e.target.value)}
                          maxLength={6}
                          required
                          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit', padding: 0 }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn-ghost" onClick={() => setShowDisableForm(false)} style={{ padding: '8px 16px', fontSize: '13px' }}>
                        Cancel
                      </button>
                      <button type="submit" style={{ background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        Confirm Disable
                      </button>
                    </div>
                  </form>
                ) : (
                  <motion.button
                    type="button"
                    className="btn-danger"
                    onClick={() => setShowDisableForm(true)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px' }}
                  >
                    Disable 2FA
                  </motion.button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>
                  Protect your account with an extra layer of security. Use an authenticator app (like Google Authenticator or Authy) to scan a QR code and verify your login attempts.
                </p>

                {!isSettingUp ? (
                  <motion.button
                    type="button"
                    className="btn-primary"
                    onClick={start2FASetup}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px' }}
                  >
                    Enable 2FA
                  </motion.button>
                ) : (
                  <div style={{
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: '8px', padding: '20px',
                    display: 'flex', flexDirection: 'column', gap: '18px'
                  }}>
                    {backupCodes.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={{ fontSize: '13px', color: '#10b981', margin: 0, fontWeight: 700 }}>2FA Successfully Enabled! 🎉</h4>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>
                          Please save these recovery backup codes in a safe place. If you lose access to your authenticator app, you can use these codes to log in. **They will not be shown again.**
                        </p>
                        <div style={{
                          background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '8px',
                          fontFamily: 'monospace', fontSize: '13px', color: '#f5f5f7',
                          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          {backupCodes.map((code, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                              <span style={{ color: 'rgba(255,255,255,0.2)' }}>{idx + 1}.</span>
                              <span>{code}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={finish2FASetup}
                          style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '13px' }}
                        >
                          I've Saved the Codes
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {setupData?.otpauthUrl && (
                            <div style={{ background: '#fff', padding: '8px', borderRadius: '8px', display: 'flex', width: 'fit-content' }}>
                              <img
                                src={`https://chart.googleapis.com/chart?chs=160x160&chld=M|0&cht=qr&chl=${encodeURIComponent(setupData.otpauthUrl)}`}
                                alt="QR Code"
                                style={{ width: '140px', height: '140px' }}
                              />
                            </div>
                          )}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                            <h5 style={{ fontSize: '12px', color: '#f5f5f7', margin: 0, fontWeight: 600 }}>1. Scan the QR Code</h5>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>
                              Scan the QR code with your Google Authenticator or Authy app. If you cannot scan it, enter this text code manually:
                            </p>
                            <code style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', color: '#a855f7', fontSize: '12px', fontFamily: 'monospace', width: 'fit-content' }}>
                              {setupData?.secret}
                            </code>
                          </div>
                        </div>

                        <form onSubmit={handleConfirm2FA} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                          <h5 style={{ fontSize: '12px', color: '#f5f5f7', margin: 0, fontWeight: 600 }}>2. Verify Authenticator Code</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{
                              display: 'flex', alignItems: 'center',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.07)',
                              borderRadius: '9px', padding: '9px 12px',
                              maxWidth: '220px'
                            }}>
                              <input
                                placeholder="Enter 6-digit code"
                                value={setupCode}
                                onChange={e => setSetupCode(e.target.value)}
                                maxLength={6}
                                required
                                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit', padding: 0 }}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="btn-ghost" onClick={() => setIsSettingUp(false)} style={{ padding: '8px 16px', fontSize: '13px' }}>
                              Cancel
                            </button>
                            <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                              Verify & Activate
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
            onClick={() => { setShowDeleteModal(false); setConfirmWsName(''); }}
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f5f5f7', marginBottom: '8px' }}>Delete workspace?</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '16px' }}>
                To confirm deletion, please type the workspace name: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{currentWs?.name}</strong>
              </p>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '9px', padding: '9px 12px', marginBottom: '20px'
              }}>
                <input
                  value={confirmWsName}
                  onChange={e => setConfirmWsName(e.target.value)}
                  placeholder="Type workspace name…"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit', padding: 0 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn-ghost" onClick={() => { setShowDeleteModal(false); setConfirmWsName(''); }}
                  style={{ fontSize: '13px', padding: '7px 14px' }}>
                  Cancel
                </button>
                <button
                  disabled={confirmWsName !== currentWs?.name || deleting}
                  onClick={deleteWorkspace}
                  style={{
                    background: '#ef4444', border: 'none', borderRadius: '8px',
                    color: '#fff', fontWeight: 700, fontSize: '13px',
                    padding: '7px 14px', cursor: 'pointer', opacity: confirmWsName !== currentWs?.name || deleting ? 0.6 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
