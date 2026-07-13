import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { BarChart3, AlertTriangle, TrendingUp, Users } from 'lucide-react';

interface AnalyticsTabProps {
  projects: any[];
  currentWs: any;
}

const barGradients = [
  'linear-gradient(135deg,#3b82f6,#06b6d4)',
  'linear-gradient(135deg,#a855f7,#ec4899)',
  'linear-gradient(135deg,#22c55e,#14b8a6)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#818cf8,#c084fc)',
];

export default function AnalyticsTab({ projects, currentWs }: AnalyticsTabProps) {
  const [selectedProjId, setSelectedProjId] = useState('');

  useEffect(() => {
    if (projects.length > 0 && !selectedProjId) {
      setSelectedProjId(projects[0].id);
    }
  }, [projects, selectedProjId]);

  // Status breakdown
  const { data: breakdownRaw } = useQuery({
    queryKey: ['analytics-breakdown', selectedProjId],
    queryFn: () => api.get(`/projects/${selectedProjId}/analytics/status-breakdown`).then((r: any) => {
      const raw = r.data.data || [];
      const formatted: Record<string, number> = {};
      if (Array.isArray(raw)) {
        raw.forEach((item: any) => {
          formatted[item.columnName || item.column] = item.count;
        });
      }
      return formatted;
    }),
    enabled: !!selectedProjId,
  });
  const breakdown: Record<string, number> = breakdownRaw || {};

  // Overdue tasks
  const { data: overdueRaw } = useQuery({
    queryKey: ['analytics-overdue', selectedProjId],
    queryFn: () => api.get(`/projects/${selectedProjId}/analytics/overdue`).then((r: any) => r.data.data),
    enabled: !!selectedProjId,
  });
  const overdueTasks: any[] = overdueRaw || [];

  // Bottlenecks
  const { data: bottlenecksRaw } = useQuery({
    queryKey: ['analytics-bottlenecks', selectedProjId],
    queryFn: () => api.get(`/projects/${selectedProjId}/analytics/bottlenecks`).then((r: any) => r.data.data),
    enabled: !!selectedProjId,
  });
  const bottlenecks: any[] = bottlenecksRaw || [];

  // Completion trend
  const { data: trendRaw } = useQuery({
    queryKey: ['analytics-trend', selectedProjId],
    queryFn: () => api.get(`/projects/${selectedProjId}/analytics/completion-trend?range=7d`).then((r: any) => r.data.data),
    enabled: !!selectedProjId,
  });
  const trendData: any[] = trendRaw || [];

  // Member workload
  const { data: workloadRaw } = useQuery({
    queryKey: ['analytics-workload', currentWs?.id],
    queryFn: () => api.get(`/workspaces/${currentWs.id}/analytics/workload`).then((r: any) => r.data.data),
    enabled: !!currentWs?.id,
  });
  const workload: any[] = workloadRaw || [];

  const renderTrendChart = () => {
    if (trendData.length === 0) return (
      <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-dim)', fontSize: 'var(--text-sm)' }}>
        No completion data yet — complete some tasks to see your trend!
      </div>
    );

    const maxVal = Math.max(...trendData.map((d: any) => d.completedCount), 1);
    const width = 500;
    const height = 160;
    const paddingX = 44;
    const paddingY = 24;

    const points = trendData.map((d: any, i: number) => {
      const x = paddingX + (i / Math.max(trendData.length - 1, 1)) * (width - 2 * paddingX);
      const y = height - paddingY - (d.completedCount / maxVal) * (height - 2 * paddingY);
      return { x, y, date: d.date, count: d.completedCount };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
      : '';

    // Y-axis grid values
    const yGridRatios = [0, 0.25, 0.5, 0.75, 1];

    return (
      <div style={{ width: '100%', position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
            </linearGradient>

            {/* Glow filter on the line */}
            <filter id="lineGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Y-axis dashed grid lines */}
          {yGridRatios.map((ratio, idx) => {
            const y = paddingY + ratio * (height - 2 * paddingY);
            const val = Math.round(maxVal * (1 - ratio));
            return (
              <g key={idx}>
                <motion.line
                  x1={paddingX} y1={y} x2={width - paddingX} y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05, duration: 0.4 }}
                />
                <motion.text
                  x={paddingX - 8} y={y + 4}
                  fill="rgba(255,255,255,0.3)"
                  fontSize={9}
                  textAnchor="end"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 + 0.1, duration: 0.4 }}
                >
                  {val}
                </motion.text>
              </g>
            );
          })}

          {/* Gradient area — fades in after line starts drawing */}
          {areaPath && (
            <motion.path
              d={areaPath}
              fill="url(#trendGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            />
          )}

          {/* Main animated drawing line — draws from left to right */}
          {linePath && (
            <motion.path
              d={linePath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#lineGlow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ pathLength: { duration: 1.4, ease: 'easeInOut' }, opacity: { duration: 0.1 } }}
            />
          )}

          {/* Data point nodes — spring in staggered after line finishes */}
          {points.map((p, idx) => (
            <motion.g key={idx}>
              {/* Outer ring pulse */}
              <motion.circle
                cx={p.x} cy={p.y} r="8"
                fill="var(--color-primary)"
                opacity={0}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.6, 0], opacity: [0, 0.15, 0] }}
                transition={{ delay: idx * 0.1 + 1.3, duration: 0.6 }}
              />
              {/* Main dot */}
              <motion.circle
                cx={p.x} cy={p.y} r="5"
                fill="var(--color-bg)"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.8 }}
                transition={{ type: 'spring', stiffness: 340, damping: 14, delay: idx * 0.1 + 1.2 }}
                style={{ cursor: 'pointer' }}
              >
                <title>{`${new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${p.count} task${p.count !== 1 ? 's' : ''} completed`}</title>
              </motion.circle>
              {/* Count label above high-value nodes */}
              {p.count > 0 && (
                <motion.text
                  x={p.x} y={p.y - 10}
                  textAnchor="middle"
                  fill="var(--color-primary)"
                  fontSize={9}
                  fontWeight={700}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 + 1.5, duration: 0.3 }}
                >
                  {p.count}
                </motion.text>
              )}
            </motion.g>
          ))}

          {/* X-axis date labels */}
          {points.map((p, idx) => {
            const showLabel = idx === 0 || idx === Math.floor(points.length / 2) || idx === points.length - 1;
            if (!showLabel) return null;
            const label = new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <motion.text
                key={idx}
                x={p.x} y={height + 12}
                textAnchor="middle"
                fill="rgba(255,255,255,0.3)"
                fontSize={9}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6 + idx * 0.05, duration: 0.4 }}
              >
                {label}
              </motion.text>
            );
          })}
        </svg>
      </div>
    );
  };


  const totalTasks = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...Object.values(breakdown), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}
    >
      {/* Project Selector */}
      <div className="glass" style={{ padding: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <BarChart3 size={18} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Project Analytics</span>
        </div>
        <select
          className="tf-input"
          style={{ maxWidth: 280 }}
          value={selectedProjId}
          onChange={e => setSelectedProjId(e.target.value)}
        >
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {!selectedProjId ? (
        <div className="glass empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">No projects to analyze</div>
          <div className="empty-state-desc">Create a project first to view analytics.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-xl)' }}>

          {/* Completion Trend - Area Chart */}
          <motion.div
            className="glass"
            style={{ padding: 'var(--space-xl)', gridColumn: '1 / -1' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
              <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Task Completion Trend (Last 7 Days)</h3>
            </div>
            {renderTrendChart()}
          </motion.div>

          {/* Status Breakdown - Bar Chart */}
          <motion.div
            className="glass"
            style={{ padding: 'var(--space-xl)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Task Distribution</h3>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{totalTasks} total</span>
            </div>

            {Object.keys(breakdown).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {Object.entries(breakdown).map(([status, count], i) => (
                  <div key={status} className="chart-bar-row">
                    <div className="chart-bar-label">{status}</div>
                    <div className="chart-bar-track">
                      <motion.div
                        className="chart-bar-fill"
                        style={{ background: barGradients[i % barGradients.length] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / maxCount) * 100}%` }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {count > 0 ? count : ''}
                      </motion.div>
                    </div>
                    <div className="chart-bar-value">{count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                No task data available yet.
              </p>
            )}
          </motion.div>

          {/* Overdue Tasks */}
          <motion.div
            className="glass"
            style={{ padding: 'var(--space-xl)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
              <AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>
                Overdue Tasks
                {overdueTasks.length > 0 && (
                  <span style={{
                    marginLeft: 8, fontSize: 'var(--text-xs)', fontWeight: 700,
                    background: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)',
                    padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  }}>
                    {overdueTasks.length}
                  </span>
                )}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: 240, overflowY: 'auto' }}>
              {overdueTasks.length > 0 ? (
                overdueTasks.map((t: any) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t.title}</span>
                    <span className="badge badge-urgent">OVERDUE</span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🌟</div>
                  <p style={{ fontSize: 'var(--text-sm)' }}>No overdue tasks!</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Bottlenecks */}
          <motion.div
            className="glass"
            style={{ padding: 'var(--space-xl)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
              <TrendingUp size={18} style={{ color: 'var(--color-warning)' }} />
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Column Bottlenecks</h3>
            </div>

            {bottlenecks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {bottlenecks.map((b: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{b.columnName || b.column}</span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-warning)' }}>
                      {typeof b.avgDays === 'number' ? `${b.avgDays.toFixed(1)}d avg` : `${b.taskCount || b.count} tasks`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                No bottleneck data yet.
              </p>
            )}
          </motion.div>

          {/* Team Workload */}
          <motion.div
            className="glass"
            style={{ padding: 'var(--space-xl)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
              <Users size={18} style={{ color: 'var(--color-info)' }} />
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Team Workload</h3>
            </div>

            {workload.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {workload.map((w: any, i: number) => {
                  const total = (w.active || 0) + (w.completed || 0);
                  const completionPct = total > 0 ? Math.round(((w.completed || 0) / total) * 100) : 0;
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{w.userName || w.name}</span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          {w.active || 0} active · {w.completed || 0} done
                        </span>
                      </div>
                      <div className="progress-bar">
                        <motion.div
                          className="progress-fill success"
                          initial={{ width: 0 }}
                          animate={{ width: `${completionPct}%` }}
                          transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                No workload data available.
              </p>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
