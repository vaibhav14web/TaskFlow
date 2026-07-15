import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, Bell
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: { name?: string; email?: string } | null;
  onLogout: () => void;
  notificationCount?: number;
  onNotificationClick?: () => void;
}

const navItems = [
  { id: 'projects',  label: 'Projects',  icon: LayoutDashboard, shortcut: '1' },
  { id: 'members',   label: 'Members',   icon: Users,           shortcut: '2' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3,       shortcut: '3' },
  { id: 'settings',  label: 'Settings',  icon: Settings,        shortcut: '4' },
];

/* ── Geometric TF Logo ─────────────────────────────── */
function TFLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sidebarLogoG" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a855f7" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="url(#sidebarLogoG)" />
      <rect x="8" y="10" width="24" height="4" rx="2" fill="white" />
      <rect x="17" y="14" width="6" height="10" rx="1" fill="white" />
      <rect x="9" y="27" width="14" height="3.5" rx="1.5" fill="white" opacity="0.9" />
      <rect x="9" y="24" width="10" height="3" rx="1.5" fill="white" opacity="0.6" />
    </svg>
  );
}

/* ── Keycap badge ──────────────────────────────────── */
function Key({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '1px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 700,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', lineHeight: '1.6',
      boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
      userSelect: 'none', flexShrink: 0,
    }}>
      {children}
    </span>
  );
}

export default function Sidebar({ activeTab, onTabChange, user, onLogout, notificationCount = 0, onNotificationClick }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <aside style={{
      width: collapsed ? 64 : 220,
      minHeight: '100vh',
      background: '#0b0b0e',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 10px',
      gap: '2px',
      transition: 'width 0.25s cubic-bezier(0.16,1,0.3,1)',
      flexShrink: 0,
      position: 'relative',
      zIndex: 20,
    }}>
      {/* Brand */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 8px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        marginBottom: '8px',
      }}>
        <TFLogo size={30} />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                fontSize: '15px', fontWeight: 800, letterSpacing: '-0.04em',
                color: '#f5f5f7', whiteSpace: 'nowrap', overflow: 'hidden',
              }}
            >
              Task<span style={{ color: '#a855f7' }}>Flow</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav section label */}
      {!collapsed && (
        <div style={{ padding: '4px 10px 6px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
          Navigation
        </div>
      )}

      {/* Nav Items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={collapsed ? item.label : undefined}
              style={{
                all: 'unset',
                display: 'flex', alignItems: 'center',
                gap: '10px',
                padding: collapsed ? '9px 0' : '9px 10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: '8px',
                cursor: 'pointer',
                position: 'relative',
                color: isActive ? '#f5f5f7' : 'rgba(255,255,255,0.4)',
                fontSize: '13px', fontWeight: isActive ? 600 : 500,
                transition: 'color 0.15s, background-color 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.035)';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              {/* Active sliding capsule highlight */}
              {isActive && (
                <motion.div
                  layoutId="activeTabGlow"
                  style={{
                    position: 'absolute', inset: 0,
                    borderRadius: '8px',
                    background: 'linear-gradient(90deg, rgba(168,85,247,0.12) 0%, rgba(99,102,241,0.06) 100%)',
                    border: '1px solid rgba(168,85,247,0.18)',
                    zIndex: 0,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              {/* Active left bar decoration */}
              {isActive && (
                <motion.div
                  layoutId="activeBar"
                  style={{
                    position: 'absolute', left: 0, top: '20%', bottom: '20%',
                    width: '3px', borderRadius: '99px',
                    background: 'linear-gradient(180deg, #a855f7, #6366f1)',
                    zIndex: 1,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, zIndex: 1, position: 'relative' }}>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ flex: 1, whiteSpace: 'nowrap' }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              {!collapsed && (
                <div style={{ zIndex: 1, position: 'relative' }}>
                  <Key>{item.shortcut}</Key>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Notification button */}
      {onNotificationClick && (
        <button
          onClick={onNotificationClick}
          title={collapsed ? 'Notifications' : undefined}
          style={{
            all: 'unset',
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: collapsed ? '9px 0' : '9px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: '8px', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 500,
            position: 'relative', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = '#f5f5f7'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}
        >
          <Bell size={16} strokeWidth={2} />
          {notificationCount > 0 && (
            <span style={{
              position: 'absolute', top: '6px', left: collapsed ? '26px' : '22px',
              width: '7px', height: '7px', borderRadius: '50%',
              background: '#a855f7', border: '1px solid #0b0b0e',
            }} />
          )}
          {!collapsed && <span style={{ flex: 1 }}>Notifications</span>}
          {!collapsed && notificationCount > 0 && (
            <span style={{
              background: 'rgba(168,85,247,0.15)', color: '#a855f7',
              fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '99px',
            }}>
              {notificationCount}
            </span>
          )}
        </button>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          all: 'unset',
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: collapsed ? '9px 0' : '9px 10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: '8px', cursor: 'pointer',
          color: 'rgba(255,255,255,0.25)', fontSize: '13px',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        {!collapsed && <span style={{ fontSize: '12px' }}>Collapse</span>}
      </button>

      {/* Separator */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)', margin: '4px 0' }} />

      {/* User info */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: collapsed ? '8px 0' : '8px 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: '8px',
      }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
          background: 'linear-gradient(135deg, #a855f7, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, color: '#fff',
        }}>
          {initials}
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#f5f5f7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'User'}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sign out */}
      <button
        onClick={onLogout}
        title={collapsed ? 'Sign out' : undefined}
        style={{
          all: 'unset',
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: collapsed ? '9px 0' : '9px 10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: '8px', cursor: 'pointer',
          color: 'rgba(255,255,255,0.25)', fontSize: '13px',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <LogOut size={15} />
        {!collapsed && <span style={{ fontSize: '12px' }}>Sign Out</span>}
      </button>
    </aside>
  );
}
