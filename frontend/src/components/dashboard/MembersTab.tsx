import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import toast from 'react-hot-toast';
import { Send, Copy, Check, UserPlus, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MembersTabProps {
  currentWs: any;
  members: any[];
  refetchMembers: () => void;
}

const roleColors: Record<string, { bg: string; text: string }> = {
  OWNER:  { bg: 'rgba(168,85,247,0.12)', text: '#a855f7' },
  ADMIN:  { bg: 'rgba(99,102,241,0.12)',  text: '#818cf8' },
  MEMBER: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.5)' },
  VIEWER: { bg: 'rgba(255,255,255,0.04)', text: 'rgba(255,255,255,0.3)' },
};

const avatarGrads = [
  'linear-gradient(135deg,#6366f1,#a855f7)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
  'linear-gradient(135deg,#10b981,#0ea5e9)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#ec4899,#a855f7)',
];

export default function MembersTab({ currentWs, members, refetchMembers }: MembersTabProps) {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviteLink, setInviteLink] = useState('');
  const [copyStatus, setCopyStatus] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const currentMember = members.find(m => m.userId === user?.id);
  const currentRole = currentMember?.role;
  const canManage = currentRole === 'OWNER' || currentRole === 'ADMIN';

  const updateRole = async (userId: string, newRole: string) => {
    if (!currentWs?.id) return;
    try {
      await api.patch(`/workspaces/${currentWs.id}/members/${userId}`, { role: newRole });
      toast.success('Role updated');
      refetchMembers();
    } catch { toast.error('Failed to update role'); }
  };

  const removeMember = async (userId: string, name: string) => {
    if (!currentWs?.id) return;
    if (!window.confirm(`Remove ${name || 'this member'} from the workspace?`)) return;
    try {
      await api.delete(`/workspaces/${currentWs.id}/members/${userId}`);
      toast.success('Member removed');
      refetchMembers();
    } catch { toast.error('Failed to remove member'); }
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWs?.id) return;
    try {
      const res = await api.post(`/workspaces/${currentWs.id}/invites`, {
        email: inviteEmail || undefined,
        role: inviteRole,
      });
      const token = res.data.data.token;
      setInviteLink(`${window.location.origin}/join?token=${token}`);
      toast.success('Invite link generated!');
      setInviteEmail('');
    } catch { toast.error('Failed to generate invite'); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(true);
    toast.success('Copied!');
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const getInitials = (name?: string) =>
    name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}
    >
      {/* Invite form card */}
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px', padding: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserPlus size={14} style={{ color: '#818cf8' }} />
          </div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Invite Member</h3>
        </div>

        <form onSubmit={sendInvite} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Email input */}
          <div style={{
            display: 'flex', alignItems: 'center', flex: 1, minWidth: '220px',
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${focusedField === 'email' ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: '9px', padding: '9px 12px',
            transition: 'border-color 0.2s',
            boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(168,85,247,0.08)' : 'none',
          }}>
            <input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              required
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit' }}
            />
          </div>

          {/* Role select */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '9px', padding: '9px 12px',
            position: 'relative',
          }}>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as any)}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit',
                cursor: 'pointer', appearance: 'none', paddingRight: '20px',
              }}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.3)', position: 'absolute', right: '10px', pointerEvents: 'none' }} />
          </div>

          <motion.button
            className="btn-primary"
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
          >
            <Send size={13} /> Send Invite
          </motion.button>
        </form>

        {/* Invite link */}
        <AnimatePresence>
          {inviteLink && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginTop: '14px' }}
            >
              <div style={{
                background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '9px', padding: '12px',
                display: 'flex', gap: '8px', alignItems: 'center',
              }}>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, flexShrink: 0 }}>✓ Link ready</span>
                <input
                  readOnly value={inviteLink}
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontFamily: 'monospace',
                    minWidth: 0,
                  }}
                />
                <button
                  onClick={() => copyToClipboard(inviteLink)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px', padding: '5px 10px',
                    color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                  }}
                >
                  {copyStatus ? <Check size={12} /> : <Copy size={12} />}
                  {copyStatus ? 'Copied' : 'Copy'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Members list */}
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f5f5f7' }}>
            Team Members <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginLeft: '6px' }}>({members.length})</span>
          </div>
          {canManage && (
            <button
              onClick={() => setIsManaging(!isManaging)}
              style={{
                background: isManaging ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isManaging ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '7px', padding: '4px 10px',
                color: isManaging ? '#818cf8' : 'rgba(255,255,255,0.4)',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              {isManaging ? 'Done' : 'Manage'}
            </button>
          )}
        </div>

        {/* Member rows */}
        {members.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
            No members yet — send an invite above
          </div>
        ) : (
          members.map((m: any, i: number) => {
            const isOwnerRow = m.role === 'OWNER';
            const isSelfRow = m.userId === user?.id;
            const rc = roleColors[m.role] || roleColors.MEMBER;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 20px',
                  borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {/* Avatar */}
                <div style={{
                  width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                  background: avatarGrads[i % avatarGrads.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, color: '#fff',
                }}>
                  {getInitials(m.user?.name)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {m.user?.name || 'Unknown'}
                    {isSelfRow && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>you</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.user?.email}
                  </div>
                </div>

                {/* Role */}
                {isManaging && !isOwnerRow && !isSelfRow ? (
                  <select
                    value={m.role}
                    onChange={e => updateRole(m.userId, e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '6px', padding: '4px 8px',
                      color: '#f5f5f7', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
                    }}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                ) : (
                  <span style={{
                    display: 'inline-flex', padding: '3px 8px', borderRadius: '6px',
                    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: rc.bg, color: rc.text,
                  }}>
                    {m.role}
                  </span>
                )}

                {/* Remove */}
                {isManaging && !isOwnerRow && !isSelfRow && (
                  <button
                    onClick={() => removeMember(m.userId, m.user?.name)}
                    style={{
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: '6px', padding: '4px 10px',
                      color: '#ef4444', fontSize: '11px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Remove
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
