import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Activity, Zap, Folder, CheckSquare, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OverviewTabProps {
  projects: any[];
}

// Retro-style terminal log entries generator
const MOCK_LOGS = [
  '-- Action queued to network_v2',
  'Task 8922 marked DONE',
  '-- Deadlines dispatch',
  'Syncing database partitions',
  'Garbage collection: 1.2MB freed',
  'WebSocket handshake accepted',
  'Calculating team throughput...',
  'All modules verified [OK]',
  'User session token renewed',
  'Background syncing completed',
];

export default function OverviewTab({ projects }: OverviewTabProps) {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<string[]>([
    '[10:00:12] -- Action queued to network_v2',
    '[10:01:04] Task 8922 marked DONE',
    '[10:02:45] -- Deadlines dispatch',
  ]);
  const [uptime, setUptime] = useState({ hours: 163, mins: 12, secs: 45 });
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Uptime tick counter
  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(prev => {
        let s = prev.secs + 1;
        let m = prev.mins;
        let h = prev.hours;
        if (s >= 60) {
          s = 0;
          m += 1;
        }
        if (m >= 60) {
          m = 0;
          h += 1;
        }
        return { hours: h, mins: m, secs: s };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Scrolling terminal logs simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
      const randomLog = MOCK_LOGS[Math.floor(Math.random() * MOCK_LOGS.length)];
      setLogs(prev => {
        const next = [...prev, `[${timeStr}] ${randomLog}`];
        if (next.length > 8) next.shift(); // Keep last 8 logs
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Fallback projects if none exist
  const displayProjects = projects.length > 0 ? projects.slice(0, 2) : [
    {
      id: 'mock-1',
      name: 'Fintech App Redesign',
      status: 'IN_SYNC',
      description: 'Strategic revamp for Q4. Focus on biometric flow and multi-currency ledger.',
      progress: 75.6,
      time: '12_SEC',
      log: '48_SEC',
      gradient: 'linear-gradient(135deg, #6366f1, #a855f7)',
      avatars: ['AR', 'JD', 'SM'],
    },
    {
      id: 'mock-2',
      name: 'Eco-Commerce Platform',
      status: 'PAUSED',
      description: 'Sustainability tracking dashboard for global retail chains.',
      progress: 32.8,
      time: '02_SEC',
      log: '05_SEC',
      gradient: 'linear-gradient(135deg, #10b981, #0ea5e9)',
      avatars: ['KL', 'OW'],
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.04em', color: '#f5f5f7', margin: '0 0 6px 0' }}>
            System Overview
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10.5px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
              <motion.span
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}
              />
              STATUS: ONLINE
            </span>
            <span>//</span>
            <span>UP_TIME: {uptime.hours}H {uptime.mins}M {uptime.secs}S</span>
          </div>
        </div>
      </div>

      {/* Grid Dashboard Stats & Terminal */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
      }}>
        {/* Card 1: Active Projects */}
        <motion.div
          whileHover={{ y: -4, borderColor: 'rgba(168,85,247,0.25)', boxShadow: '0 12px 30px rgba(168,85,247,0.06)' }}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px', padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '8px',
            position: 'relative', overflow: 'hidden', transition: 'all 0.25s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Active Projects
            </span>
            <Folder size={13} style={{ color: '#a855f7', opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f5f5f7', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            {projects.length > 0 ? projects.length : 24}
          </div>
          <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 600, fontFamily: 'monospace' }}>
            +12.4% TMT_VELOCITY
          </div>
        </motion.div>

        {/* Card 2: Pending Tasks */}
        <motion.div
          whileHover={{ y: -4, borderColor: 'rgba(245,158,11,0.25)', boxShadow: '0 12px 30px rgba(245,158,11,0.06)' }}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px', padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '8px',
            position: 'relative', overflow: 'hidden', transition: 'all 0.25s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Pending Tasks
            </span>
            <CheckSquare size={13} style={{ color: '#f55f7b', opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f5f5f7', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            142
          </div>
          <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600, fontFamily: 'monospace' }}>
            1_CRITICAL_P1
          </div>
        </motion.div>

        {/* Card 3: Throughput */}
        <motion.div
          whileHover={{ y: -4, borderColor: 'rgba(99,102,241,0.25)', boxShadow: '0 12px 30px rgba(99,102,241,0.06)' }}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px', padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '8px',
            position: 'relative', overflow: 'hidden', transition: 'all 0.25s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Throughput
            </span>
            <Zap size={13} style={{ color: '#6366f1', opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f5f5f7', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            98%
          </div>
          <div style={{ fontSize: '10px', color: '#a855f7', fontWeight: 600, fontFamily: 'monospace' }}>
            OPTIMIZED_FLOW
          </div>
        </motion.div>

        {/* Card 4: System Log */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '12px', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '8px',
          gridColumn: 'span 1', minWidth: '220px', maxHeight: '120px',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Terminal size={10} /> System Log
            </span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          </div>
          <div style={{
            fontFamily: 'monospace', fontSize: '9.5px', color: '#10b981',
            display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1,
            scrollbarWidth: 'none',
          }}>
            {logs.map((log, index) => {
              const isHighlight = log.includes('DONE') || log.includes('verified');
              const isAlert = log.includes('through') || log.includes('queued');
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    color: isHighlight ? '#10b981' : isAlert ? '#a855f7' : 'rgba(255,255,255,0.4)',
                    whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
                  }}
                >
                  {log}
                </motion.div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>

      {/* Active Project Modules section */}
      <div>
        <h3 style={{
          fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px'
        }}>
          Active Project Modules
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
          {displayProjects.map((p: any, idx: number) => {
            const progress = p.progress || 50;
            const avatars = p.avatars || ['AR', 'JD'];
            const isMock = p.id.startsWith('mock');
            const isSync = p.status === 'IN_SYNC' || (!isMock && idx === 0);

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}
                onClick={() => !isMock && navigate(`/board/${p.id}`)}
                style={{
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '16px', padding: '24px',
                  cursor: isMock ? 'default' : 'pointer',
                  display: 'flex', flexDirection: 'column', gap: '16px',
                  position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Accent top gradient */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                  background: p.gradient || (idx === 0 ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'linear-gradient(135deg, #10b981, #0ea5e9)'),
                }} />

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>
                      {p.name}
                    </h4>
                    <span style={{
                      fontSize: '8.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                      background: isSync ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.06)',
                      color: isSync ? '#818cf8' : 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.05em', border: isSync ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      {isSync && (
                        <motion.span
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1.2 }}
                          style={{ width: 4, height: 4, borderRadius: '50%', background: '#818cf8' }}
                        />
                      )}
                      {isSync ? 'IN_SYNC' : 'PAUSED'}
                    </span>
                  </div>
                  <button style={{ all: 'unset', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                    <MoreHorizontal size={14} />
                  </button>
                </div>

                {/* Description */}
                <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>
                  {p.description || 'No description provided.'}
                </p>

                {/* Progress bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '10.5px', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                    {progress}%
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', position: 'relative', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ delay: idx * 0.15 + 0.2, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        height: '100%',
                        background: p.gradient || (idx === 0 ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'linear-gradient(135deg, #10b981, #0ea5e9)'),
                        borderRadius: '99px',
                      }}
                    />
                  </div>
                </div>

                {/* Footer details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px', marginTop: '4px' }}>
                  {/* Avatars */}
                  <div style={{ display: 'flex', gap: '-6px' }}>
                    {avatars.map((av: string, aIdx: number) => (
                      <div
                        key={aIdx}
                        style={{
                          width: '24px', height: '24px', borderRadius: '6px',
                          background: `linear-gradient(135deg, #4f46e5, #a855f7)`,
                          border: '2px solid #07070a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', fontWeight: 700, color: '#fff',
                          marginLeft: aIdx > 0 ? '-6px' : 0,
                          zIndex: 10 - aIdx,
                        }}
                      >
                        {av}
                      </div>
                    ))}
                  </div>

                  {/* Latency / logs metrics */}
                  <div style={{ display: 'flex', gap: '8px', fontSize: '9.5px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(255,255,255,0.02)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      {p.time || '12_SEC'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(255,255,255,0.02)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      {p.log || '48_SEC'}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
