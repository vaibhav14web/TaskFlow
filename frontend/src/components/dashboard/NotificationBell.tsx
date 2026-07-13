import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { Bell, X } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  ASSIGNMENT: '📋',
  MENTION: '💬',
  DUE_DATE: '⏰',
  DEFAULT: '🔔',
};

const typeBgs: Record<string, string> = {
  ASSIGNMENT: 'rgba(168,85,247,0.12)',
  MENTION: 'rgba(59,130,246,0.12)',
  DUE_DATE: 'rgba(245,158,11,0.12)',
  DEFAULT: 'rgba(255,255,255,0.06)',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: notifRaw } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r: any) => {
      const raw = r.data.data || [];
      return raw.map((n: any) => {
        let message = 'New notification';
        const payload = n.payload || {};
        if (n.type === 'ASSIGNMENT') {
          message = `You were assigned to task "${payload.taskTitle || 'Untitled Task'}"`;
        } else if (n.type === 'MENTION') {
          message = `You were mentioned in task "${payload.taskTitle || 'Untitled Task'}"`;
        } else if (n.type === 'DUE_DATE') {
          message = `Task "${payload.taskTitle || 'Untitled Task'}" is due soon`;
        }
        return {
          ...n,
          read: !!n.readAt,
          message
        };
      }) as Notification[];
    }),
    refetchInterval: 30000,
  });
  const notifications: Notification[] = notifRaw || [];
  const unreadCount = notifications.filter(n => !n.read).length;

  const markReadMut = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMut = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn-icon" onClick={() => setOpen(!open)} style={{ position: 'relative' }}>
        <Bell size={20} />
        {unreadCount > 0 && <div className="notification-dot" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="notification-dropdown glass"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-xs)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>Notifications</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                {unreadCount > 0 && (
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', height: 'auto', minHeight: 0, fontWeight: 600, color: 'var(--color-primary)' }}
                    onClick={() => markAllReadMut.mutate()}
                  >
                    Mark all read
                  </button>
                )}
                <button className="btn-icon" onClick={() => setOpen(false)} style={{ padding: 2 }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🔔</div>
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 15).map(n => (
                <div
                  key={n.id}
                  className={`notification-item ${!n.read ? 'unread' : ''}`}
                  onClick={() => { if (!n.read) markReadMut.mutate(n.id); }}
                >
                  <div
                    className="notification-icon"
                    style={{ background: typeBgs[n.type] || typeBgs.DEFAULT }}
                  >
                    {typeIcons[n.type] || typeIcons.DEFAULT}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="notification-text">{n.message}</div>
                    <div className="notification-time">{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.read && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
