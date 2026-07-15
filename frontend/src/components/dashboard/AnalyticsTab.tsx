import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { BarChart3, AlertTriangle, TrendingUp, Users, Activity } from 'lucide-react';

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

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] as any }
  }),
};

export default function AnalyticsTab({ projects, currentWs }: AnalyticsTabProps) {
  const [selectedProjId, setSelectedProjId] = useState('');
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-dim)', fontSize: 'var(--text-sm)' }}
      >
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3 }} style={{ fontSize: '2rem', marginBottom: '12px' }}>
          📈
        </motion.div>
        No completion data yet — complete some tasks to see your trend!
      </motion.div>
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

    const yGridRatios = [0, 0.25, 0.5, 0.75, 1];

    return (
      <div style={{ width: '100%', position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
            </linearGradient>
            <filter id="lineGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="dotGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
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
                  transition={{ delay: idx * 0.06, duration: 0.5 }}
                />
                <motion.text
                  x={paddingX - 8} y={y + 4}
                  fill="rgba(255,255,255,0.28)"
                  fontSize={9}
                  textAnchor="end"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.06 + 0.1, duration: 0.4 }}
                >
                  {val}
                </motion.text>
              </g>
            );
          })}

          {/* Gradient area */}
          {areaPath && (
            <motion.path
              d={areaPath}
              fill="url(#trendGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 1 }}
            />
          )}

          {/* Main animated drawing line */}
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
              transition={{ pathLength: { duration: 1.6, ease: 'easeInOut' }, opacity: { duration: 0.1 } }}
            />
          )}

          {/* Data point nodes */}
          {points.map((p, idx) => (
            <motion.g key={idx}>
              {/* Pulse ring */}
              <motion.circle
                cx={p.x} cy={p.y} r="10"
                fill="var(--color-primary)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.8, 0], opacity: [0, 0.2, 0] }}
                transition={{ delay: idx * 0.12 + 1.4, duration: 0.8 }}
              />
              {/* Main dot */}
              <motion.circle
                cx={p.x} cy={p.y} r="5"
                fill="var(--color-bg)"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                filter="url(#dotGlow)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 2 }}
                transition={{ type: 'spring', stiffness: 340, damping: 14, delay: idx * 0.12 + 1.3 }}
                style={{ cursor: 'pointer' }}
              >
                <title>{`${new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${p.count} task${p.count !== 1 ? 's' : ''} completed`}</title>
              </motion.circle>
              {/* Count label */}
              {p.count > 0 && (
                <motion.text
                  x={p.x} y={p.y - 12}
                  textAnchor="middle"
                  fill="var(--color-primary)"
                  fontSize={9}
                  fontWeight={700}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.12 + 1.6, duration: 0.3 }}
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
                x={p.x} y={height + 14}
                textAnchor="middle"
                fill="rgba(255,255,255,0.28)"
                fontSize={9}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 + idx * 0.06, duration: 0.4 }}
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}
    >
      {/* Project Selector */}
      <motion.div
        custom={0} variants={sectionVariants} initial="hidden" animate="visible"
        className="glass"
        style={{ padding: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', repeatDelay: 3 }}
          >
            <Activity size={18} style={{ color: 'var(--color-primary)' }} />
          </motion.div>
          <span style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Project Analytics</span>
        </div>
        <motion.select
          className="tf-input"
          style={{ maxWidth: 280 }}
          value={selectedProjId}
          onChange={e => setSelectedProjId(e.target.value)}
          whileFocus={{ borderColor: 'rgba(168,85,247,0.4)' }}
        >
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </motion.select>
      </motion.div>

      {!selectedProjId ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass empty-state"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="empty-state-icon"
          >
            📊
          </motion.div>
          <div className="empty-state-title">No projects to analyze</div>
          <div className="empty-state-desc">Create a project first to view analytics.</div>
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-xl)' }}>

          {/* Completion Trend */}
          <motion.div
            className="glass"
            style={{ padding: 'var(--space-xl)', gridColumn: '1 / -1', position: 'relative', overflow: 'hidden' }}
            custom={1} variants={sectionVariants} initial="hidden" animate="visible"
            whileHover={{ boxShadow: '0 8px 32px rgba(168,85,247,0.08)' }}
          >
            {/* Corner glow decoration */}
            <div style={{
              position: 'absolute', top: -30, right: -30, width: 120, height: 120,
              borderRadius: '50%', background: 'rgba(99,102,241,0.06)', filter: 'blur(40px)', pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              >
                <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
              </motion.div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Task Completion Trend (Last 7 Days)</h3>
            </div>
            {renderTrendChart()}
          </motion.div>

          {/* Status Breakdown */}
          <motion.div
            className="glass"
            style={{ padding: 'var(--space-xl)' }}
            custom={2} variants={sectionVariants} initial="hidden" animate="visible"
            whileHover={{ boxShadow: '0 8px 32px rgba(168,85,247,0.07)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                >
                  <BarChart3 size={16} style={{ color: 'var(--color-primary)' }} />
                </motion.div>
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Task Distribution</h3>
              </div>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.3 }}
                style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}
              >
                {totalTasks} total
              </motion.span>
            </div>

            {Object.keys(breakdown).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(breakdown).map(([status, count], i) => (
                  <motion.div
                    key={status}
                    className="chart-bar-row"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    onMouseEnter={() => setHoveredBar(status)}
                    onMouseLeave={() => setHoveredBar(null)}
                    style={{ cursor: 'default' }}
                  >
                    <div className="chart-bar-label" style={{ fontWeight: hoveredBar === status ? 700 : 500, transition: 'font-weight 0.2s' }}>{status}</div>
                    <div className="chart-bar-track" style={{ position: 'relative' }}>
                      <motion.div
                        className="chart-bar-fill"
                        style={{ background: barGradients[i % barGradients.length] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / maxCount) * 100}%` }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ filter: 'brightness(1.15)' }}
                      >
                        {count > 0 ? count : ''}
                      </motion.div>
                    </div>
                    <motion.div
                      className="chart-bar-value"
                      animate={{ scale: hoveredBar === status ? 1.15 : 1, color: hoveredBar === status ? '#f5f5f7' : undefined }}
                      transition={{ duration: 0.15 }}
                    >
                      {count}
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-xl)' }}
              >
                No task data available yet.
              </motion.p>
            )}
          </motion.div>

          {/* Overdue Tasks */}
          <motion.div
            className="glass"
            style={{ padding: 'var(--space-xl)' }}
            custom={3} variants={sectionVariants} initial="hidden" animate="visible"
            whileHover={{ boxShadow: '0 8px 32px rgba(239,68,68,0.07)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
              <motion.div
                animate={{ rotate: overdueTasks.length > 0 ? [0, 8, -8, 0] : 0 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut', repeatDelay: 2 }}
              >
                <AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />
              </motion.div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>
                Overdue Tasks
                <AnimatePresence>
                  {overdueTasks.length > 0 && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      style={{
                        marginLeft: 8, fontSize: 'var(--text-xs)', fontWeight: 700,
                        background: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)',
                        padding: '2px 8px', borderRadius: 'var(--radius-full)',
                        display: 'inline-block',
                      }}
                    >
                      {overdueTasks.length}
                    </motion.span>
                  )}
                </AnimatePresence>
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: 240, overflowY: 'auto' }}>
              {overdueTasks.length > 0 ? (
                overdueTasks.map((t: any, i: number) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ x: 4, borderColor: 'rgba(239,68,68,0.35)' }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 'var(--radius-md)', cursor: 'default',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t.title}</span>
                    <motion.span
                      animate={{ opacity: [1, 0.6, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="badge badge-urgent"
                    >
                      OVERDUE
                    </motion.span>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}
                >
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut', repeatDelay: 2 }}
                    style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}
                  >
                    🌟
                  </motion.div>
                  <p style={{ fontSize: 'var(--text-sm)' }}>No overdue tasks!</p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Bottlenecks */}
          <motion.div
            className="glass"
            style={{ padding: 'var(--space-xl)' }}
            custom={4} variants={sectionVariants} initial="hidden" animate="visible"
            whileHover={{ boxShadow: '0 8px 32px rgba(245,158,11,0.07)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              >
                <TrendingUp size={18} style={{ color: 'var(--color-warning)' }} />
              </motion.div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Column Bottlenecks</h3>
            </div>

            {bottlenecks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {bottlenecks.map((b: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ x: 4, background: 'rgba(245,158,11,0.06)' }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                      transition: 'background 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{b.columnName || b.column}</span>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.08, type: 'spring' }}
                      style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-warning)' }}
                    >
                      {typeof b.avgDays === 'number' ? `${b.avgDays.toFixed(1)}d avg` : `${b.taskCount || b.count} tasks`}
                    </motion.span>
                  </motion.div>
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
            custom={5} variants={sectionVariants} initial="hidden" animate="visible"
            whileHover={{ boxShadow: '0 8px 32px rgba(14,165,233,0.07)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              >
                <Users size={18} style={{ color: 'var(--color-info)' }} />
              </motion.div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Team Workload</h3>
            </div>

            {workload.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {workload.map((w: any, i: number) => {
                  const total = (w.active || 0) + (w.completed || 0);
                  const completionPct = total > 0 ? Math.round(((w.completed || 0) / total) * 100) : 0;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.09, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ x: 2 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)', alignItems: 'center' }}>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{w.userName || w.name}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                            {w.active || 0} active · {w.completed || 0} done
                          </span>
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 + i * 0.09 }}
                            style={{ fontSize: '10px', fontWeight: 700, color: '#10b981' }}
                          >
                            {completionPct}%
                          </motion.span>
                        </div>
                      </div>
                      <div className="progress-bar" style={{ position: 'relative', overflow: 'hidden' }}>
                        <motion.div
                          className="progress-fill success"
                          initial={{ width: 0 }}
                          animate={{ width: `${completionPct}%` }}
                          transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        />
                        {/* Shimmer effect */}
                        <motion.div
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ delay: 1.2 + i * 0.1, duration: 1.5, ease: 'easeInOut' }}
                          style={{
                            position: 'absolute', top: 0, left: 0, bottom: 0, width: '40%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                            pointerEvents: 'none',
                          }}
                        />
                      </div>
                    </motion.div>
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
