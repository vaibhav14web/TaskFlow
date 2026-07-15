import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  ArrowLeft,
  ChartPie,
  TrendUp,
  Warning,
  Users,
  Hourglass,
  CheckCircle,
  FileText
} from '@phosphor-icons/react';

interface Project {
  id: string;
  name: string;
}

interface StatusBreakdownItem {
  columnId: string;
  columnName: string;
  count: number;
}

interface OverdueTask {
  id: string;
  title: string;
  dueDate: string;
}

interface CompletionTrendItem {
  date: string;
  completedCount: number;
}

interface BottleneckItem {
  columnId: string;
  columnName: string;
  averageLingerTimeMs: number;
  avgDays: number;
}

interface MemberWorkload {
  userId: string;
  name: string;
  email: string;
  activeTasksCount: number;
  completedTasksCount: number;
}

const COLORS = ['#a3f95b', '#22d3ee', '#818cf8', '#fb7185', '#fbbf24', '#34d399'];

export default function Analytics() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  useAuth();

  // Project selector
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<'7d' | '30d' | '90d'>('30d');

  // 1. Fetch workspace projects
  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects', workspaceId],
    queryFn: () => apiRequest<Project[]>(`/workspaces/${workspaceId}/projects`),
    enabled: !!workspaceId
  });

  const projectsList = projects || [];

  // Sync first project
  useEffect(() => {
    if (projectsList.length > 0 && !activeProjectId) {
      setActiveProjectId(projectsList[0].id);
    }
  }, [projectsList, activeProjectId]);

  // 2. Fetch Status Breakdown
  const { data: statusBreakdown, isLoading: isLoadingStatus } = useQuery<StatusBreakdownItem[]>({
    queryKey: ['analytics', 'status-breakdown', activeProjectId],
    queryFn: () => apiRequest<StatusBreakdownItem[]>(`/projects/${activeProjectId}/analytics/status-breakdown`),
    enabled: !!activeProjectId
  });

  // 3. Fetch Overdue Tasks
  const { data: overdueTasks } = useQuery<OverdueTask[]>({
    queryKey: ['analytics', 'overdue', activeProjectId],
    queryFn: () => apiRequest<OverdueTask[]>(`/projects/${activeProjectId}/analytics/overdue`),
    enabled: !!activeProjectId
  });

  // 4. Fetch Completion Trend
  const { data: completionTrend, isLoading: isLoadingTrend } = useQuery<CompletionTrendItem[]>({
    queryKey: ['analytics', 'completion-trend', activeProjectId, trendRange],
    queryFn: () => apiRequest<CompletionTrendItem[]>(`/projects/${activeProjectId}/analytics/completion-trend?range=${trendRange}`),
    enabled: !!activeProjectId
  });

  // 5. Fetch Bottleneck linger duration
  const { data: bottlenecks, isLoading: isLoadingBottlenecks } = useQuery<BottleneckItem[]>({
    queryKey: ['analytics', 'bottlenecks', activeProjectId],
    queryFn: () => apiRequest<BottleneckItem[]>(`/projects/${activeProjectId}/analytics/bottlenecks`),
    enabled: !!activeProjectId
  });

  // 6. Fetch Member workloads
  const { data: workloads } = useQuery<MemberWorkload[]>({
    queryKey: ['analytics', 'workload', workspaceId],
    queryFn: () => apiRequest<MemberWorkload[]>(`/workspaces/${workspaceId}/analytics/workload`),
    enabled: !!workspaceId
  });

  const totalTasksCount = statusBreakdown?.reduce((acc, curr) => acc + curr.count, 0) || 0;
  const overdueCount = overdueTasks?.length || 0;
  const doneCount = statusBreakdown?.find(c => c.columnName.toLowerCase() === 'done')?.count || 0;
  const completionRate = totalTasksCount > 0 ? Math.round((doneCount / totalTasksCount) * 100) : 0;

  // Custom tooltips styling for dark mode charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-950/90 border border-zinc-850 p-3 rounded-xl shadow-2xl text-xs font-semibold">
          <p className="text-zinc-400 mb-1">{label}</p>
          <p className="text-lime-400">
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden selection:bg-lime-400/30 selection:text-lime-400">
      
      {/* Background spotlights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-lime-500/5 blur-[120px]" />
        <div className="absolute bottom-[20%] right-[20%] w-[50vw] h-[50vw] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px),linear-gradient(to_bottom,#ffffff01_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative z-10 flex-grow flex flex-col min-w-0">
        
        {/* Header control */}
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-sm px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="h-8 w-8 rounded-lg border border-zinc-900 hover:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
              <ArrowLeft size={14} />
            </Link>

            <div className="flex items-center gap-2">
              <select
                value={activeProjectId || ''}
                onChange={(e) => setActiveProjectId(e.target.value || null)}
                className="bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-lime-500/40 text-zinc-150"
              >
                {projectsList.map(proj => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider bg-zinc-900/60 border border-zinc-850 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
              <span>Real-time Workspace Analytics</span>
            </span>
          </div>
        </header>

        {/* Content list body */}
        <div className="flex-grow overflow-y-auto p-8 max-w-7xl w-full mx-auto space-y-8">
          
          {/* Summary metrics row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/20 p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-lime-400/5 blur-xl" />
              <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={12} />
                <span>Total Project Tasks</span>
              </span>
              <span className="text-xl font-black text-zinc-100 tracking-tight mt-3">
                {totalTasksCount}
              </span>
              <span className="text-[10px] text-zinc-500 mt-1">Sum of tasks in board</span>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/20 p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-rose-400/5 blur-xl" />
              <span className="text-[8px] font-bold text-rose-450 uppercase tracking-widest flex items-center gap-1.5">
                <Warning size={12} />
                <span>Overdue Tasks</span>
              </span>
              <span className="text-xl font-black text-rose-400 tracking-tight mt-3">
                {overdueCount}
              </span>
              <span className="text-[10px] text-zinc-500 mt-1">Pending after due date</span>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/20 p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-cyan-400/5 blur-xl" />
              <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle size={12} />
                <span>Completion Rate</span>
              </span>
              <span className="text-xl font-black text-zinc-100 tracking-tight mt-3">
                {completionRate}%
              </span>
              <span className="text-[10px] text-zinc-500 mt-1">Tasks in 'Done' column</span>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/20 p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-indigo-400/5 blur-xl" />
              <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest flex items-center gap-1.5">
                <Hourglass size={12} />
                <span>Max Linger Column</span>
              </span>
              <span className="text-sm font-black text-zinc-200 tracking-tight truncate mt-3.5">
                {bottlenecks && bottlenecks.length > 0 ? bottlenecks[0].columnName : 'None'}
              </span>
              <span className="text-[10px] text-zinc-500 mt-1 font-mono">
                {bottlenecks && bottlenecks.length > 0 ? `${bottlenecks[0].avgDays} days avg` : 'No lingers'}
              </span>
            </div>

          </div>

          {/* Charts Row 1: Status distribution & Completion velocity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Status Breakdown Pie */}
            <div className="lg:col-span-1 rounded-3xl border border-zinc-900 bg-zinc-950/20 p-6 space-y-4 flex flex-col justify-between">
              <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-2">
                <ChartPie size={15} className="text-lime-400" />
                <span>Status Breakdown</span>
              </h3>

              <div className="h-64 flex items-center justify-center">
                {isLoadingStatus ? (
                  <span className="text-xs text-zinc-650 animate-pulse">Loading status...</span>
                ) : statusBreakdown && statusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="count"
                        nameKey="columnName"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                      >
                        {statusBreakdown.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-zinc-650">No tasks in project</span>
                )}
              </div>

              {/* Legends list */}
              {statusBreakdown && statusBreakdown.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center text-[10px] font-semibold text-zinc-400">
                  {statusBreakdown.map((item, index) => (
                    <div key={item.columnId} className="flex items-center gap-1.5">
                      <span style={{ backgroundColor: COLORS[index % COLORS.length] }} className="w-2.5 h-2.5 rounded-full inline-block" />
                      <span>{item.columnName} ({item.count})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completion Trend Area */}
            <div className="lg:col-span-2 rounded-3xl border border-zinc-900 bg-zinc-950/20 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-2">
                  <TrendUp size={15} className="text-lime-400" />
                  <span>Completion Trend</span>
                </h3>
                <div className="flex bg-zinc-900 border border-zinc-850 p-0.5 rounded-lg text-[10px] font-bold text-zinc-400">
                  {(['7d', '30d', '90d'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setTrendRange(r)}
                      className={`px-2.5 py-1 rounded-md transition-colors ${trendRange === r ? 'bg-zinc-950 text-lime-400 shadow-sm border border-zinc-850/40' : 'hover:text-zinc-200'}`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-64">
                {isLoadingTrend ? (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-650 animate-pulse">Loading trend...</div>
                ) : completionTrend && completionTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={completionTrend}>
                      <defs>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a3f95b" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#a3f95b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                      <XAxis dataKey="date" stroke="#52525b" fontSize={9} />
                      <YAxis stroke="#52525b" fontSize={9} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="completedCount" name="Completed Tasks" stroke="#a3f95b" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-650">No task completion logs in range</div>
                )}
              </div>
            </div>

          </div>

          {/* Charts Row 2: Bottlenecks linger times & Member workloads table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Linger time bottlenecks */}
            <div className="lg:col-span-1 rounded-3xl border border-zinc-900 bg-zinc-950/20 p-6 space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-2">
                <Hourglass size={15} className="text-lime-400" />
                <span>Column Linger Times</span>
              </h3>

              <div className="h-64">
                {isLoadingBottlenecks ? (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-650 animate-pulse">Calculating bottlenecks...</div>
                ) : bottlenecks && bottlenecks.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bottlenecks}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                      <XAxis dataKey="columnName" stroke="#52525b" fontSize={9} />
                      <YAxis label={{ value: 'Avg Days', angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 9 }} stroke="#52525b" fontSize={9} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="avgDays" name="Average Days Linger" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-650">No lingering active tasks</div>
                )}
              </div>
            </div>

            {/* Member workloads table */}
            <div className="lg:col-span-2 rounded-3xl border border-zinc-900 bg-zinc-950/20 p-6 space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-2">
                <Users size={15} className="text-lime-400" />
                <span>Staff Workload Allocation</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] text-zinc-550 uppercase tracking-widest border-b border-zinc-900">
                      <th className="pb-3 font-bold">Team Member</th>
                      <th className="pb-3 font-bold text-center">Active Tasks</th>
                      <th className="pb-3 font-bold text-center">Completed Tasks</th>
                      <th className="pb-3 font-bold text-right">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60">
                    {workloads && workloads.length > 0 ? (
                      workloads.map((member) => {
                        const total = member.activeTasksCount + member.completedTasksCount;
                        const percentage = total > 0 ? Math.round((member.completedTasksCount / total) * 100) : 0;
                        return (
                          <tr key={member.userId} className="text-zinc-200">
                            <td className="py-3">
                              <span className="font-bold block">{member.name}</span>
                              <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{member.email}</span>
                            </td>
                            <td className="py-3 text-center font-semibold text-zinc-400">{member.activeTasksCount}</td>
                            <td className="py-3 text-center font-semibold text-lime-400">{member.completedTasksCount}</td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <span className="font-mono text-[10px] text-zinc-500">{percentage}%</span>
                                <div className="h-1.5 w-16 bg-zinc-900 rounded-full overflow-hidden shrink-0">
                                  <div style={{ width: `${percentage}%` }} className="h-full bg-lime-400 rounded-full" />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-zinc-650">No member workloads logged</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
