import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import toast from 'react-hot-toast';
import { Send, Copy, Check, UserPlus, ChevronDown, Users, Shield, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MembersTabProps {
  currentWs: any;
  members: any[];
  refetchMembers: () => void;
}

const roleColors: Record<string, { bg: string; text: string; glow: string }> = {
  OWNER:  { bg: 'rgba(168,85,247,0.12)', text: '#a855f7', glow: 'rgba(168,85,247,0.3)' },
  ADMIN:  { bg: 'rgba(99,102,241,0.12)',  text: '#818cf8', glow: 'rgba(99,102,241,0.3)' },
  MEMBER: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.5)', glow: 'transparent' },
  VIEWER: { bg: 'rgba(255,255,255,0.04)', text: 'rgba(255,255,255,0.3)', glow: 'transparent' },
};

const avatarGrads = [
  'linear-gradient(135deg,#6366f1,#a855f7)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
  'linear-gradient(135deg,#10b981,#0ea5e9)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#ec4899,#a855f7)',
];

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -16, filter: 'blur(4px)' },
  visible: {
    opacity: 1, x: 0, filter: 'blur(0px)',
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as any }
  },
};

function RoleBadge({ role }: { role: string }) {
  const rc = roleColors[role] || roleColors.MEMBER;
  const Icon = role === 'OWNER' ? Crown : role === 'ADMIN' ? Shield : null;

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      whileHover={{ scale: 1.08 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '3px 8px', borderRadius: '6px',
        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
        background: rc.bg, color: rc.text,
        boxShadow: rc.glow !== 'transparent' ? `0 0 8px ${rc.glow}` : 'none',
      }}
    >
      {Icon && <Icon size={9} />}
      {role}
    </motion.span>
  );
}

export default function MembersTab({ currentWs, members, refetchMembers }: MembersTabProps) {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviteLink, setInviteLink] = useState('');
  const [copyStatus, setCopyStatus] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);

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
    setSendingInvite(true);
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
    finally { setSendingInvite(false); }
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '800px' }}
    >
      {/* Header stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)',
          borderRadius: '12px', padding: '14px 18px',
        }}
      >
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Users size={16} style={{ color: '#818cf8' }} />
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Team Members
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#f5f5f7', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            {members.length}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '-6px' }}>
          {members.slice(0, 5).map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ scale: 0, x: 10 }}
              animate={{ scale: 1, x: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 18 }}
              title={m.user?.name}
              style={{
                width: '30px', height: '30px', borderRadius: '9px',
                background: avatarGrads[i % avatarGrads.length],
                border: '2px solid #07070a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: '#fff',
                marginLeft: i > 0 ? '-8px' : 0,
                zIndex: 10 - i,
              }}
            >
              {getInitials(m.user?.name)}
            </motion.div>
          ))}
          {members.length > 5 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.25, type: 'spring' }}
              style={{
                width: '30px', height: '30px', borderRadius: '9px',
                background: 'rgba(255,255,255,0.06)', border: '2px solid #07070a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)',
                marginLeft: '-8px', zIndex: 4,
              }}
            >
              +{members.length - 5}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Invite form card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px', padding: '24px',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Ambient top glow */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 120, height: 120,
          borderRadius: '50%', background: 'rgba(99,102,241,0.08)', filter: 'blur(40px)', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            style={{
              width: '32px', height: '32px', borderRadius: '9px',
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <UserPlus size={15} style={{ color: '#818cf8' }} />
          </motion.div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>Invite Member</h3>
        </div>

        <form onSubmit={sendInvite} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Email input */}
          <motion.div
            animate={{
              borderColor: focusedField === 'email' ? 'rgba(168,85,247,0.45)' : 'rgba(255,255,255,0.07)',
              boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(168,85,247,0.08)' : '0 0 0 0px transparent',
            }}
            style={{
              display: 'flex', alignItems: 'center', flex: 1, minWidth: '220px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px', padding: '10px 13px',
              transition: 'border-color 0.2s',
            }}
          >
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
          </motion.div>

          {/* Role select */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px', padding: '10px 13px',
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
            disabled={sendingInvite}
            whileHover={{ scale: 1.03, boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}
            whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '13px', whiteSpace: 'nowrap' }}
          >
            <motion.span
              animate={{ x: sendingInvite ? [0, 2, -2, 0] : 0 }}
              transition={{ repeat: sendingInvite ? Infinity : 0, duration: 0.3 }}
            >
              <Send size={13} />
            </motion.span>
            {sendingInvite ? 'Sending…' : 'Send Invite'}
          </motion.button>
        </form>

        {/* Invite link */}
        <AnimatePresence>
          {inviteLink && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden', marginTop: '14px' }}
            >
              <motion.div
                initial={{ borderColor: 'rgba(16,185,129,0)' }}
                animate={{ borderColor: 'rgba(16,185,129,0.25)' }}
                style={{
                  background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: '10px', padding: '12px 14px',
                  display: 'flex', gap: '8px', alignItems: 'center',
                }}
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, flexShrink: 0 }}
                >
                  ✓ Link ready
                </motion.span>
                <input
                  readOnly value={inviteLink}
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontFamily: 'monospace',
                    minWidth: 0,
                  }}
                />
                <motion.button
                  onClick={() => copyToClipboard(inviteLink)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '7px', padding: '5px 10px',
                    color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                  }}
                >
                  <AnimatePresence mode="wait">
                    {copyStatus ? (
                      <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ display: 'flex' }}>
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Members list */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 22px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f5f5f7' }}>
            Team Members <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginLeft: '6px' }}>({members.length})</span>
          </div>
          {canManage && (
            <motion.button
              onClick={() => setIsManaging(!isManaging)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              animate={{
                background: isManaging ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                borderColor: isManaging ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
                color: isManaging ? '#818cf8' : 'rgba(255,255,255,0.4)',
              }}
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', padding: '5px 12px',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {isManaging ? 'Done' : 'Manage'}
            </motion.button>
          )}
        </div>

        {/* Member rows */}
        {members.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ padding: '52px', textAlign: 'center' }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              style={{ fontSize: '2rem', marginBottom: '10px' }}
            >
              👥
            </motion.div>
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>No members yet — send an invite above</div>
          </motion.div>
        ) : (
          <motion.div variants={listVariants} initial="hidden" animate="visible">
            {members.map((m: any, i: number) => {
              const isOwnerRow = m.role === 'OWNER';
              const isSelfRow = m.userId === user?.id;
              return (
                <motion.div
                  key={m.id}
                  variants={rowVariants}
                  layout
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '14px 22px',
                    borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                  whileHover={{ background: 'rgba(255,255,255,0.018)' }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Animated avatar */}
                  <motion.div
                    whileHover={{ scale: 1.12, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    style={{
                      width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                      background: avatarGrads[i % avatarGrads.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, color: '#fff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    }}
                  >
                    {getInitials(m.user?.name)}
                  </motion.div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {m.user?.name || 'Unknown'}
                      {isSelfRow && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: 400, background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '4px' }}
                        >
                          you
                        </motion.span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                      {m.user?.email}
                    </div>
                  </div>

                  {/* Role */}
                  <AnimatePresence mode="wait">
                    {isManaging && !isOwnerRow && !isSelfRow ? (
                      <motion.select
                        key="select"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        value={m.role}
                        onChange={e => updateRole(m.userId, e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '7px', padding: '4px 8px',
                          color: '#f5f5f7', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
                        }}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                        <option value="VIEWER">Viewer</option>
                      </motion.select>
                    ) : (
                      <motion.div key="badge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <RoleBadge role={m.role} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Remove */}
                  <AnimatePresence>
                    {isManaging && !isOwnerRow && !isSelfRow && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8, x: 8 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: 8 }}
                        onClick={() => removeMember(m.userId, m.user?.name)}
                        whileHover={{ scale: 1.05, boxShadow: '0 2px 12px rgba(239,68,68,0.25)' }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: '7px', padding: '4px 10px',
                          color: '#ef4444', fontSize: '11px', fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Remove
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
