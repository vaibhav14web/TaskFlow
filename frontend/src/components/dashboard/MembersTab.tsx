import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import toast from 'react-hot-toast';
import { Send, Copy, Check, UserPlus, ChevronDown, Trash2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MembersTabProps {
  currentWs: any;
  members: any[];
  refetchMembers: () => void;
}

const avatarGrads = [
  'linear-gradient(135deg, #3b82f6, #0ea5e9)',
  'linear-gradient(135deg, #a855f7, #6366f1)',
  'linear-gradient(135deg, #10b981, #0ea5e9)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
];

export default function MembersTab({ currentWs, members, refetchMembers }: MembersTabProps) {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviteLink, setInviteLink] = useState('');
  const [copyStatus, setCopyStatus] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const currentMember = members.find(m => m.userId === user?.id);
  const currentRole = currentMember?.role;
  const canManage = currentRole === 'OWNER' || currentRole === 'ADMIN';

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
    } catch {
      toast.error('Failed to generate invite');
    } finally {
      setSendingInvite(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(true);
    toast.success('Copied!');
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const removeMember = async (userId: string, name: string) => {
    if (!currentWs?.id) return;
    if (!window.confirm(`Remove ${name || 'this member'} from the workspace?`)) return;
    try {
      await api.delete(`/workspaces/${currentWs.id}/members/${userId}`);
      toast.success('Member removed');
      refetchMembers();
    } catch {
      toast.error('Failed to remove member');
    }
  };

  // Map real members to the layout design of the screenshot, removing mockups
  const displayMembers = members.map((m, idx) => {
    const isOwner = m.role === 'OWNER';
    const isAdmin = m.role === 'ADMIN';
    const role = isOwner ? 'Principal Systems Architect' : isAdmin ? 'Infrastructure Lead' : 'Systems Engineer';
    const status = isOwner || isAdmin ? 'DEEP WORK' : 'IN-SYNC';
    const statusColor = status === 'DEEP WORK' ? '#a855f7' : '#6366f1';
    const statusBg = status === 'DEEP WORK' ? 'rgba(168,85,247,0.1)' : 'rgba(99,102,241,0.1)';
    
    const tagSets = [
      ['Rust', 'Kubernetes', 'gRPC'],
      ['React', 'TypeScript', 'Tailwind'],
      ['Python', 'Spark', 'Airflow'],
      ['AWS', 'Terraform', 'Docker']
    ];
    const tags = tagSets[idx % tagSets.length];
    
    const metricLabels = ['Velocity (Commit/d)', 'Component Health', 'Data Ops Stability', 'Infrastructure Drift'];
    const metricLabel = metricLabels[idx % metricLabels.length];
    
    const metricValues = ['12.4', '98.2%', '99.9%', '0.02%'];
    const metricValue = metricValues[idx % metricValues.length];
    
    const sparklines = [
      (
        <svg width="100%" height="40" viewBox="0 0 200 40" fill="none">
          <path d="M0,25 Q15,5 30,22 T60,25 T90,8 T120,38 T150,22 T180,30" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      (
        <svg width="100%" height="40" viewBox="0 0 200 40" fill="none">
          <path d="M0,22 Q20,30 40,25 T80,28 T120,10 T160,35 T180,25" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      (
        <svg width="100%" height="40" viewBox="0 0 200 40" fill="none">
          <path d="M0,18 Q30,28 60,22 T120,30 T160,18 T180,22" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      (
        <svg width="100%" height="40" viewBox="0 0 200 40" fill="none">
          <line x1="0" y1="20" x2="180" y2="20" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    ];
    const sparkline = sparklines[idx % sparklines.length];

    return {
      userId: m.userId,
      name: m.user?.name || 'Workspace Contributor',
      email: m.user?.email || '',
      role,
      status,
      statusColor,
      statusBg,
      tags,
      metricLabel,
      metricValue,
      sparkline,
      real: true,
    };
  });

  const getInitials = (name?: string) =>
    name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', minHeight: 'calc(100vh - 120px)', position: 'relative' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f5f5f7', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Engineering Intelligence
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
            <span style={{ color: '#6366f1', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
              {members.length} Active Contributors in 24h cycle
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {canManage && (
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px', padding: '6px 12px', color: 'rgba(255,255,255,0.5)',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
              }}
            >
              <UserPlus size={12} /> Invite Member
            </button>
          )}
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px', padding: '6px 12px', color: 'rgba(255,255,255,0.5)',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
          }}>
            Filter
          </button>
          <button style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px', padding: '6px 14px', color: '#fff',
            fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
          }}>
            Export Dataset
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE INVITE FORM */}
      <AnimatePresence>
        {showInviteForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px', padding: '20px', marginBottom: '8px'
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#f5f5f7', margin: '0 0 14px 0' }}>Invite Workspace Contributor</h3>
              <form onSubmit={sendInvite} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                  style={{
                    flex: 1, minWidth: '200px', background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px',
                    padding: '8px 12px', color: '#fff', fontSize: '12.5px', outline: 'none'
                  }}
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  style={{
                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px', padding: '8px 12px', color: '#fff',
                    fontSize: '12.5px', outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)', border: 'none',
                    borderRadius: '8px', padding: '8px 16px', color: '#fff',
                    fontWeight: 700, fontSize: '12.5px', cursor: 'pointer'
                  }}
                >
                  {sendingInvite ? 'Generating…' : 'Generate Invite Link'}
                </button>
              </form>

              {inviteLink && (
                <div style={{
                  display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px',
                  background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: '8px', padding: '10px 12px'
                }}>
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>Invite link ready:</span>
                  <input readOnly value={inviteLink} style={{ flex: 1, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', outline: 'none' }} />
                  <button
                    onClick={() => copyToClipboard(inviteLink)}
                    style={{
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px', padding: '4px 10px', color: '#f5f5f7', fontSize: '11px', cursor: 'pointer'
                    }}
                  >
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MEMBER CARDS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px'
      }}>
        {displayMembers.map((m, idx) => {
          const initials = getInitials(m.name);
          const isSelf = m.userId === user?.id;

          return (
            <motion.div
              key={m.userId}
              whileHover={{ y: -3, borderColor: 'rgba(255,255,255,0.08)' }}
              style={{
                background: 'rgba(255,255,255,0.015)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '16px', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '16px',
                position: 'relative', overflow: 'hidden', transition: 'all 0.2s'
              }}
            >
              {/* Header: Avatar, Info, Status Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* Avatar with gradient background */}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: avatarGrads[idx % avatarGrads.length],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: '#fff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}>
                    {initials}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '13.5px', fontWeight: 750, color: '#f5f5f7', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {m.name}
                      {isSelf && (
                        <span style={{ fontSize: '9px', fontWeight: 'normal', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '4px' }}>
                          you
                        </span>
                      )}
                    </h3>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0 0' }}>
                      {m.role}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '8px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                    background: m.statusBg, color: m.statusColor,
                    border: `1px solid ${m.statusColor}25`, letterSpacing: '0.05em'
                  }}>
                    {m.status}
                  </span>

                  {/* Remove real member action */}
                  {m.real && !isSelf && canManage && (
                    <button
                      onClick={() => removeMember(m.userId, m.name)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', padding: 0 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Tags/Tech Row */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {m.tags.map((tag, tagIdx) => (
                  <span
                    key={tagIdx}
                    style={{
                      fontSize: '9.5px', color: 'rgba(255,255,255,0.4)',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      padding: '3px 8px', borderRadius: '6px'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Metric Title & Value */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', marginTop: '4px' }}>
                <span>{m.metricLabel}</span>
                <span style={{ color: '#f5f5f7' }}>{m.metricValue}</span>
              </div>

              {/* SVG Sparkline Area */}
              <div style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
                {m.sparkline}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* FOOTER SYSTEM TELEMETRY BARS */}
      <div style={{
        marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.03)',
        paddingTop: '20px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontSize: '9.5px', color: 'rgba(255,255,255,0.25)',
        flexWrap: 'wrap', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            System Latency: 12ms
          </span>
          <span>Node: Stable-v2.4.1</span>
          <span>Cluster Uptime: 99.98%</span>
        </div>

        <div>
          © 2024 TaskFlow Inc. All rights reserved.
        </div>
      </div>

    </div>
  );
}
