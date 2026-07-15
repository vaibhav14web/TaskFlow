import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trash2, Folder, ExternalLink, SlidersHorizontal, ArrowUpDown, Play, Pause, RefreshCw, Cpu, Activity, ShieldAlert, Terminal } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

interface ProjectsTabProps {
  projects: any[];
  currentWs: any;
  refetchProjects: () => void;
  workspaces?: any[];
}

export default function ProjectsTab({ projects, currentWs, refetchProjects, workspaces }: ProjectsTabProps) {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteProjId, setDeleteProjId] = useState('');
  const [deleteProjName, setDeleteProjName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const deleteProject = async () => {
    if (!deleteProjId) return;
    setDeleting(true);
    try {
      await api.delete(`/projects/${deleteProjId}`);
      toast.success('Project deleted');
      refetchProjects();
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteProjId('');
      setDeleteProjName('');
    }
  };

  // Map real projects to the layout design of the screenshot, using fallback if fewer than 4 exist
  const displayProjects = [
    {
      id: projects[0]?.id || 'mock-1',
      name: projects[0]?.name || 'Hyperion_Core_V2',
      description: projects[0]?.description || 'Core compilation and microservice routing engine.',
      status: 'IN_SYNC',
      metricLabel: 'COMPILATION_PROGRESS',
      progress: 94.2,
      meta1Label: 'BUILD_ID',
      meta1Val: '#A92-FF01',
      meta2Label: 'LATENCY',
      meta2Val: '12ms',
      meta2Color: '#818cf8',
      avatars: ['JD', 'KL'],
      updateTime: '2m ago',
      icon: Cpu,
      gradient: 'linear-gradient(135deg, #3b82f6, #0ea5e9)',
      real: !!projects[0],
    },
    {
      id: projects[1]?.id || 'mock-2',
      name: projects[1]?.name || 'Nexus_Gateway',
      description: projects[1]?.description || 'Load balancer and ingress proxy layer.',
      status: 'IDLE',
      metricLabel: 'NETWORK_LOAD',
      progress: 12.0,
      meta1Label: 'RUNTIME',
      meta1Val: 'Go 1.22',
      meta2Label: 'REGION',
      meta2Val: 'us-east-1',
      avatars: ['AR'],
      updateTime: '1h ago',
      icon: Activity,
      gradient: 'linear-gradient(135deg, #a855f7, #6366f1)',
      real: !!projects[1],
    },
    {
      id: projects[2]?.id || 'mock-3',
      name: projects[2]?.name || 'Project_X_Neural',
      description: projects[2]?.description || 'High-priority experimental branch for predictive task scheduling and automated refactoring.',
      status: 'DEPLOYING',
      metricLabel: 'DEPLOYING_TO_PROD',
      progress: 88.0,
      meta1Label: 'THROUGHPUT',
      meta1Val: '14.2k req/s',
      meta2Label: 'ERROR_RATE',
      meta2Val: '0.002%',
      meta2Color: '#ef4444',
      meta3Label: 'UPTIME',
      meta3Val: '99.999%',
      meta3Color: '#0ea5e9',
      avatars: ['JD', 'SM', 'OW'],
      updateTime: 'Est: 14 mins left',
      icon: Terminal,
      gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
      real: !!projects[2],
    },
    {
      id: projects[3]?.id || 'mock-4',
      name: projects[3]?.name || 'Data_Warehouse_Mirror',
      description: projects[3]?.description || 'Data redundancy and backup storage node.',
      status: 'PAUSED',
      metricLabel: 'SYNC_COMPLETION',
      progress: 45.8,
      meta1Label: 'STORAGE',
      meta1Val: '2.4 TB',
      meta2Label: 'REPLICA',
      meta2Val: 'Zone-B',
      avatars: ['KL'],
      updateTime: '12h ago',
      icon: ShieldAlert,
      gradient: 'linear-gradient(135deg, #10b981, #0ea5e9)',
      real: !!projects[3],
    }
  ];

  // Append any extra real projects
  if (projects.length > 4) {
    projects.slice(4).forEach((p, idx) => {
      displayProjects.push({
        id: p.id,
        name: p.name,
        description: p.description || 'Custom project module.',
        status: 'IN_SYNC',
        metricLabel: 'PROGRESS',
        progress: 60.0,
        meta1Label: 'PROJECT_ID',
        meta1Val: `#PRJ-${p.id.slice(0,4).toUpperCase()}`,
        meta2Label: 'LATENCY',
        meta2Val: '15ms',
        meta2Color: '#818cf8',
        avatars: ['JD'],
        updateTime: 'Just now',
        icon: Folder,
        gradient: 'linear-gradient(135deg, #3b82f6, #a855f7)',
        real: true,
      });
    });
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2.2fr 1fr',
      gap: '24px',
      alignItems: 'start',
    }}>
      
      {/* LEFT SIDE: Projects Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Sub-header inside projects */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f5f5f7', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              Active Projects
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9.5px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                SYSTEM STATUS: OPERATIONAL
              </span>
              <span>•</span>
              <span>ALL NODES IN-SYNC</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px', padding: '6px 12px', color: 'rgba(255,255,255,0.5)',
              fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
            }}>
              <SlidersHorizontal size={12} /> Filter
            </button>
            <button style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px', padding: '6px 12px', color: 'rgba(255,255,255,0.5)',
              fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
            }}>
              <ArrowUpDown size={12} /> Sort: Last Modified
            </button>
          </div>
        </div>

        {/* Project Cards list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {displayProjects.map((p, idx) => {
            const isSync = p.status === 'IN_SYNC';
            const isIdle = p.status === 'IDLE';
            const isPaused = p.status === 'PAUSED';
            const isDeploying = p.status === 'DEPLOYING';
            const isSpecialCard = p.name === 'Project_X_Neural';

            if (isSpecialCard) {
              return (
                <motion.div
                  key={p.id}
                  onClick={() => p.real && navigate(`/board/${p.id}`)}
                  whileHover={{ y: -3, borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}
                  style={{
                    background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden',
                    display: 'flex', gap: '20px', transition: 'all 0.2s', cursor: p.real ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: p.gradient }} />
                  
                  {/* Left content */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <p.icon size={14} style={{ color: '#818cf8' }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>
                          {p.name}
                        </h3>
                        <span style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
                          EXPERIMENTAL BRANCH
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>
                      {p.description}
                    </p>

                    {/* Horizontal stats metrics */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '8px', minWidth: '80px' }}>
                        <span style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>THROUGHPUT</span>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f5f5f7' }}>{p.meta1Val}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '8px', minWidth: '80px' }}>
                        <span style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>ERROR_RATE</span>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: p.meta2Color }}>{p.meta2Val}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '8px', minWidth: '80px' }}>
                        <span style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>UPTIME</span>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: p.meta3Color }}>{p.meta3Val}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action side */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', minWidth: '120px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                      <span style={{
                        fontSize: '8px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                        background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                        border: '1px solid rgba(245,158,11,0.2)', letterSpacing: '0.05em'
                      }}>
                        DEPLOYING_TO_PROD
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{p.updateTime}</span>
                    </div>

                    <button style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px', padding: '8px 16px', color: '#f5f5f7',
                      fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.2s'
                    }}>
                      <ExternalLink size={12} /> Console View
                    </button>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={p.id}
                onClick={() => p.real && navigate(`/board/${p.id}`)}
                whileHover={{ y: -3, borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}
                style={{
                  background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '16px', padding: '20px 24px', position: 'relative', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', gap: '14px', transition: 'all 0.2s', cursor: p.real ? 'pointer' : 'default',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: p.gradient }} />
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '6px',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <p.icon size={13} style={{ color: isSync ? '#10b981' : isIdle ? '#a855f7' : isPaused ? '#ef4444' : '#fff' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>
                        {p.name}
                      </h3>
                    </div>
                    <span style={{
                      fontSize: '8px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px',
                      background: isSync ? 'rgba(16,185,129,0.1)' : isIdle ? 'rgba(168,85,247,0.1)' : isPaused ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                      color: isSync ? '#10b981' : isIdle ? '#a855f7' : isPaused ? '#ef4444' : 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.05em', border: isSync ? '1px solid rgba(16,185,129,0.15)' : isIdle ? '1px solid rgba(168,85,247,0.15)' : isPaused ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(255,255,255,0.05)'
                    }}>
                      {p.status}
                    </span>
                  </div>

                  {p.real && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setDeleteProjId(p.id);
                        setDeleteProjName(p.name);
                        setShowDeleteModal(true);
                      }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', padding: 0 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: 'monospace', fontWeight: 'bold', color: 'rgba(255,255,255,0.25)' }}>
                    <span>{p.metricLabel}</span>
                    <span>{p.progress}%</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.progress}%`, background: p.gradient, borderRadius: '99px' }} />
                  </div>
                </div>

                {/* Details row */}
                <div style={{ display: 'flex', gap: '20px', fontSize: '10.5px', fontFamily: 'monospace' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.25)' }}>{p.meta1Label}:</span>
                    <span style={{ color: '#f5f5f7', fontWeight: 'bold' }}>{p.meta1Val}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.25)' }}>{p.meta2Label}:</span>
                    <span style={{ color: p.meta2Color || '#f5f5f7', fontWeight: 'bold' }}>{p.meta2Val}</span>
                  </div>
                </div>

                {/* Footer row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', gap: '-4px' }}>
                    {p.avatars.map((av, avIdx) => (
                      <div
                        key={avIdx}
                        style={{
                          width: '18px', height: '18px', borderRadius: '4px',
                          background: `linear-gradient(135deg, #4f46e5, #a855f7)`,
                          border: '2px solid #07070a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '8px', fontWeight: 700, color: '#fff',
                          marginLeft: avIdx > 0 ? '-4px' : 0,
                          zIndex: 5 - avIdx,
                        }}
                      >
                        {av}
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', fontWeight: 'bold' }}>
                    Update: {p.updateTime}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* RIGHT SIDEBAR: Project Insights & Health */}
      <div style={{
        background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px',
        position: 'sticky', top: '24px'
      }}>
        <div>
          <h3 style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px 0' }}>
            Project Insights & Health
          </h3>

          {/* Radial Optimal status */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px 0' }}>
            <div style={{ position: 'relative', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                <motion.circle
                  cx="18" cy="18" r="15.915" fill="none"
                  stroke="linear-gradient(135deg, #a855f7, #6366f1)" strokeWidth="3.2"
                  strokeDasharray="98 100" strokeDashoffset="0"
                  strokeLinecap="round"
                  style={{ stroke: '#6366f1', filter: 'drop-shadow(0 0 4px rgba(99,102,241,0.5))' }}
                />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#f5f5f7', letterSpacing: '-0.02em' }}>98%</span>
                <span style={{ fontSize: '7px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>OPTIMAL</span>
              </div>
            </div>
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#818cf8', letterSpacing: '0.05em' }}>HIGH PERFORMANCE STATUS</span>
          </div>
        </div>

        {/* Section: Team Contributions */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
          <h4 style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Team Contributions
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>
                Alex pushed to <span style={{ color: '#818cf8', fontWeight: 'bold' }}>main</span>
              </div>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>12 mins ago</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>
                Sarah merged <span style={{ color: '#0ea5e9', fontWeight: 'bold' }}>PR #12</span>
              </div>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>45 mins ago</span>
            </div>
          </div>
        </div>

        {/* Section: Resource Allocation */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
          <h4 style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Resource Allocation
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'rgba(255,255,255,0.5)' }}>
                <span>Hyperion_Core</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>CPU 42%</span>
              </div>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px' }}>
                <div style={{ height: '100%', width: '42%', background: '#6366f1', borderRadius: '99px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'rgba(255,255,255,0.5)' }}>
                <span>Nexus_Gateway</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>MEM 28%</span>
              </div>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.04)', borderRadius: '99px' }}>
                <div style={{ height: '100%', width: '28%', background: '#a855f7', borderRadius: '99px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Recent Activity */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
          <h4 style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Recent Activity
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{ fontSize: '11px', color: '#f5f5f7', fontWeight: 600 }}>Core refactored</span>
                <span style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.25)' }}>by @alex_dev &bull; 4h ago</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{ fontSize: '11px', color: '#f5f5f7', fontWeight: 600 }}>Security audit passed</span>
                <span style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.25)' }}>Nexus_Gateway &bull; 1d ago</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            }}
            onClick={() => { setShowDeleteModal(false); setDeleteProjId(''); setDeleteProjName(''); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#111116', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '380px',
                boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Trash2 size={16} style={{ color: '#ef4444' }} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f5f5f7', marginBottom: '8px' }}>Delete project module?</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '20px' }}>
                <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{deleteProjName}</strong> and all its associated data will be permanently deleted.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn-ghost" onClick={() => { setShowDeleteModal(false); setDeleteProjId(''); setDeleteProjName(''); }}
                  style={{ fontSize: '13px', padding: '7px 14px' }}>
                  Cancel
                </button>
                <button
                  disabled={deleting}
                  onClick={deleteProject}
                  style={{
                    background: '#ef4444', border: 'none', borderRadius: '8px',
                    color: '#fff', fontWeight: 700, fontSize: '13px',
                    padding: '7px 14px', cursor: 'pointer', opacity: deleting ? 0.6 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {deleting ? 'Deleting…' : 'Delete module'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
