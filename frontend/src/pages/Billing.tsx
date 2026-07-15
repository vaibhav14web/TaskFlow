import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  ArrowLeft,
  CurrencyDollar,
  Clock,
  Export,
  Trash,
  PlusCircle,
  CheckCircle,
  Warning,
  ListBullets,
  User
} from '@phosphor-icons/react';

interface Project {
  id: string;
  name: string;
}

interface TimeLog {
  id: string;
  durationSeconds: number;
  description: string;
  userId: string;
  loggedAt: string;
  task: {
    id: string;
    title: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface TaskBreakdown {
  taskId: string;
  taskTitle: string;
  totalSeconds: number;
}

interface UserBreakdown {
  userId: string;
  userName: string;
  userEmail: string;
  totalSeconds: number;
}

interface BillingPayload {
  projectName: string;
  totalSeconds: number;
  logs: TimeLog[];
  taskBreakdown: TaskBreakdown[];
  userBreakdown: UserBreakdown[];
}

interface Task {
  id: string;
  title: string;
}

interface Board {
  columns: {
    tasks: Task[];
  }[];
}

export default function Billing() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  useAuth();

  // Project selector
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [billingRate, setBillingRate] = useState<number>(50); // Default hourly rate

  // Stopwatch state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [stopwatchDescription, setStopwatchDescription] = useState('');
  const [stopwatchSuccessMsg, setStopwatchSuccessMsg] = useState<string | null>(null);
  const [stopwatchErrorMsg, setStopwatchErrorMsg] = useState<string | null>(null);

  // Manual log state
  const [manualTaskId, setManualTaskId] = useState('');
  const [manualHours, setManualHours] = useState<number>(1);
  const [manualDescription, setManualDescription] = useState('');
  const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);
  const [manualErrorMsg, setManualErrorMsg] = useState<string | null>(null);

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

  // 2. Fetch project billing info
  const { data: billingInfo, isLoading: isLoadingBilling } = useQuery<BillingPayload>({
    queryKey: ['billing', activeProjectId],
    queryFn: () => apiRequest<BillingPayload>(`/projects/${activeProjectId}/billing`),
    enabled: !!activeProjectId
  });

  // 3. Fetch board tasks for time assignment dropdown
  const { data: board } = useQuery<Board>({
    queryKey: ['board', activeProjectId],
    queryFn: () => apiRequest<Board>(`/projects/${activeProjectId}/board`),
    enabled: !!activeProjectId
  });

  // Flatten tasks list
  const tasksList: Task[] = React.useMemo(() => {
    if (!board) return [];
    return board.columns.flatMap(col => col.tasks);
  }, [board]);

  // Stopwatch Ticker logic
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // Mutations
  // Log Time
  const logTimeMutation = useMutation({
    mutationFn: (params: { taskId: string; durationSeconds: number; description: string }) => apiRequest(`/tasks/${params.taskId}/time-logs`, {
      method: 'POST',
      body: JSON.stringify({
        durationSeconds: params.durationSeconds,
        description: params.description
      })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', activeProjectId] });
      queryClient.invalidateQueries({ queryKey: ['board', activeProjectId] });
    }
  });

  // Delete Time Log
  const deleteTimeLogMutation = useMutation({
    mutationFn: (params: { taskId: string; logId: string }) => apiRequest(`/tasks/${params.taskId}/time-logs/${params.logId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', activeProjectId] });
    }
  });

  const handleStopwatchSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) {
      setStopwatchErrorMsg('Please select a target task card.');
      return;
    }
    if (timerSeconds <= 0) {
      setStopwatchErrorMsg('Stopwatch has no elapsed time to record.');
      return;
    }

    setStopwatchErrorMsg(null);
    setStopwatchSuccessMsg(null);

    logTimeMutation.mutate({
      taskId: selectedTaskId,
      durationSeconds: timerSeconds,
      description: stopwatchDescription.trim() || 'Tracked labor log'
    }, {
      onSuccess: () => {
        setStopwatchSuccessMsg('Stopwatch log saved successfully.');
        setIsTimerRunning(false);
        setTimerSeconds(0);
        setStopwatchDescription('');
        setTimeout(() => setStopwatchSuccessMsg(null), 3000);
      },
      onError: (err: any) => {
        setStopwatchErrorMsg(err.message || 'Failed to submit stopwatch log.');
      }
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTaskId) {
      setManualErrorMsg('Please select a target task card.');
      return;
    }
    if (manualHours <= 0) {
      setManualErrorMsg('Hours logged must be greater than zero.');
      return;
    }

    setManualErrorMsg(null);
    setManualSuccessMsg(null);

    logTimeMutation.mutate({
      taskId: manualTaskId,
      durationSeconds: manualHours * 3600,
      description: manualDescription.trim() || 'Manual labor entry'
    }, {
      onSuccess: () => {
        setManualSuccessMsg('Manual hours logged successfully.');
        setManualDescription('');
        setManualHours(1);
        setTimeout(() => setManualSuccessMsg(null), 3000);
      },
      onError: (err: any) => {
        setManualErrorMsg(err.message || 'Failed to submit manual log.');
      }
    });
  };

  const handleExportInvoice = () => {
    if (!billingInfo) return;
    
    // Open a printable popup window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedTotalAmount = ((billingInfo.totalSeconds / 3600) * billingRate).toFixed(2);
    const invoiceNo = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    const lineItemsHtml = billingInfo.logs.map((log, index) => {
      const hours = log.durationSeconds / 3600;
      const rate = billingRate;
      const subtotal = hours * rate;
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">${index + 1}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">
            <strong>${log.task?.title || 'General Task'}</strong><br>
            <span style="color: #64748b; font-size: 11px;">${log.description || 'Consulting Labor'}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">${log.user?.name || 'Developer'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right;">${hours.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right;">$${rate.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right;"><strong>$${subtotal.toFixed(2)}</strong></td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${invoiceNo}</title>
          <style>
            body { font-family: sans-serif; color: #1e293b; margin: 40px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .invoice-title { font-size: 24px; font-weight: bold; color: #0f172a; }
            .meta-grid { display: grid; grid-template-cols: 2fr 1fr; gap: 40px; margin: 40px 0; }
            .meta-block h3 { margin-bottom: 8px; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f8fafc; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
            .total-section { float: right; width: 300px; margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 20px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .grand-total { font-size: 18px; font-weight: bold; color: #6366f1; }
            .signature { margin-top: 80px; display: flex; justify-content: space-between; }
            .sig-line { width: 200px; border-top: 1px dashed #cbd5e1; text-align: center; padding-top: 8px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="invoice-title">TaskFlow Invoice</div>
              <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Workspace Project Billing System</p>
            </div>
            <div style="text-align: right;">
              <strong style="color: #6366f1;">Invoice #: ${invoiceNo}</strong><br>
              <span style="font-size: 12px; color: #64748b;">Date: ${new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-block">
              <h3>Billed To</h3>
              <strong style="font-size: 15px;">${billingInfo.projectName} Studio</strong><br>
              <span style="font-size: 13px; color: #64748b; line-height: 1.6;">
                TaskFlow Workspace Project Office<br>
                Workspace ID: ${workspaceId}
              </span>
            </div>
            <div class="meta-block" style="text-align: right;">
              <h3>Payment Status</h3>
              <span style="display: inline-block; padding: 4px 12px; background-color: #fef3c7; color: #d97706; font-weight: bold; font-size: 11px; border-radius: 9999px; text-transform: uppercase;">
                Pending Review
              </span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px;">Item</th>
                <th>Labor Description</th>
                <th>Staff</th>
                <th style="text-align: right; width: 80px;">Hours</th>
                <th style="text-align: right; width: 100px;">Rate</th>
                <th style="text-align: right; width: 120px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span>Subtotal Hours:</span>
              <span>${(billingInfo.totalSeconds / 3600).toFixed(2)} hrs</span>
            </div>
            <div class="total-row">
              <span>Tax Rate:</span>
              <span>0.00%</span>
            </div>
            <div class="total-row grand-total" style="border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px;">
              <span>Total Due:</span>
              <span>$${formattedTotalAmount}</span>
            </div>
          </div>

          <div style="clear: both;"></div>

          <div class="signature">
            <div class="sig-line">Prepared By</div>
            <div class="sig-line">Approved By</div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatStopwatch = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden selection:bg-lime-400/30 selection:text-lime-400">
      
      {/* Background aurora spots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute bottom-[20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px),linear-gradient(to_bottom,#ffffff01_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Main Container */}
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

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-850 px-3 py-1 rounded-xl text-xs">
              <CurrencyDollar size={14} className="text-lime-400" />
              <span className="text-zinc-500 font-bold">Rate:</span>
              <input
                type="number"
                value={billingRate}
                onChange={(e) => setBillingRate(Math.max(1, Number(e.target.value)))}
                className="w-12 bg-transparent text-center font-bold text-zinc-150 focus:outline-none focus:text-lime-400"
              />
              <span className="text-zinc-500">/hr</span>
            </div>
            
            <button
              onClick={handleExportInvoice}
              disabled={!billingInfo || billingInfo.logs.length === 0}
              className="inline-flex h-9 items-center gap-1.5 px-4 rounded-xl bg-lime-400 text-zinc-950 text-xs font-bold hover:bg-lime-300 transition-all shadow-md shadow-lime-400/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <Export size={14} />
              <span>Export Printable Invoice</span>
            </button>
          </div>
        </header>

        {/* Content grid */}
        <div className="flex-grow overflow-y-auto p-8 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Stopwatches / Log forms */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Stopwatch Tracker */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950/40 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-lime-400/5 blur-2xl" />
              
              <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-6 flex items-center gap-2">
                <Clock size={15} className="text-lime-400" />
                <span>Stopwatch Tracker</span>
              </h3>

              {stopwatchSuccessMsg && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2 items-center">
                  <CheckCircle size={14} />
                  <span>{stopwatchSuccessMsg}</span>
                </div>
              )}

              {stopwatchErrorMsg && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex gap-2 items-center">
                  <Warning size={14} />
                  <span>{stopwatchErrorMsg}</span>
                </div>
              )}

              <div className="relative text-center py-8 flex flex-col items-center justify-center">
                {isTimerRunning && (
                  <>
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                      className="absolute w-32 h-32 rounded-full border border-lime-400/20 z-0 pointer-events-none"
                    />
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.3 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{ duration: 2, delay: 0.6, repeat: Infinity, ease: "easeOut" }}
                      className="absolute w-32 h-32 rounded-full border border-lime-400/10 z-0 pointer-events-none"
                    />
                  </>
                )}

                <motion.div 
                  animate={isTimerRunning ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="relative z-10 font-mono text-4xl font-black text-zinc-100 tracking-tight"
                >
                  {formatStopwatch(timerSeconds)}
                </motion.div>
                <div className="relative z-10 text-[10px] text-zinc-550 mt-1 uppercase tracking-widest font-mono">
                  Elapsed Seconds: {timerSeconds}
                </div>
              </div>

              {/* Stopwatch controls */}
              <div className="flex justify-center gap-3 mb-6">
                {isTimerRunning ? (
                  <button
                    onClick={() => setIsTimerRunning(false)}
                    className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-350 active:scale-95 transition-all"
                    title="Pause Stopwatch"
                  >
                    <Pause size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsTimerRunning(true)}
                    className="w-12 h-12 rounded-full bg-lime-400 hover:bg-lime-300 flex items-center justify-center text-zinc-950 active:scale-95 transition-all shadow-md shadow-lime-400/10"
                    title="Start Stopwatch"
                  >
                    <Play size={18} weight="fill" />
                  </button>
                )}
                
                <button
                  onClick={() => { setIsTimerRunning(false); setTimerSeconds(0); }}
                  className="px-4 h-12 rounded-2xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Form details link */}
              <form onSubmit={handleStopwatchSave} className="space-y-4 pt-4 border-t border-zinc-900/60">
                <div className="space-y-2">
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Assign to Task Card</label>
                  <select
                    required
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-900 text-xs text-zinc-250 focus:outline-none focus:border-lime-550/40"
                  >
                    <option value="">-- Choose Task --</option>
                    {tasksList.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Labor Log Description</label>
                  <input
                    type="text"
                    required
                    value={stopwatchDescription}
                    onChange={(e) => setStopwatchDescription(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-900 text-xs focus:outline-none focus:border-lime-550/40 text-zinc-150"
                    placeholder="Consulting services..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={logTimeMutation.isPending}
                  className="w-full h-10 rounded-xl bg-lime-400 text-zinc-950 font-bold text-xs hover:bg-lime-300 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Submit Labor Log</span>
                </button>
              </form>
            </div>

            {/* Manual Entry */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950/40 p-6">
              <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-5 flex items-center gap-2">
                <PlusCircle size={15} className="text-lime-400" />
                <span>Manual Entry</span>
              </h3>

              {manualSuccessMsg && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2 items-center">
                  <CheckCircle size={14} />
                  <span>{manualSuccessMsg}</span>
                </div>
              )}

              {manualErrorMsg && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex gap-2 items-center">
                  <Warning size={14} />
                  <span>{manualErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Assign to Task Card</label>
                  <select
                    required
                    value={manualTaskId}
                    onChange={(e) => setManualTaskId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-900 text-xs text-zinc-250 focus:outline-none focus:border-lime-550/40"
                  >
                    <option value="">-- Choose Task --</option>
                    {tasksList.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Hours Logged</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      max="24"
                      required
                      value={manualHours}
                      onChange={(e) => setManualHours(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-900 text-xs focus:outline-none focus:border-lime-550/40 text-zinc-150"
                      placeholder="1.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
                    <input
                      type="text"
                      required
                      value={manualDescription}
                      onChange={(e) => setManualDescription(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-900 text-xs focus:outline-none focus:border-lime-550/40 text-zinc-150"
                      placeholder="UI design review..."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={logTimeMutation.isPending}
                  className="w-full h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-bold text-xs hover:bg-zinc-850 transition-colors flex items-center justify-center"
                >
                  <span>Record Entry</span>
                </button>
              </form>
            </div>

          </div>

          {/* Right Columns - Details, Timeline charts */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Project Overview Analytics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950/20 p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-lime-400/5 blur-xl" />
                <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest">Total Seconds</span>
                <span className="text-xl font-black text-zinc-100 tracking-tight mt-3">
                  {billingInfo ? billingInfo.totalSeconds : 0}s
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 font-mono">
                  {billingInfo ? (billingInfo.totalSeconds / 3600).toFixed(2) : '0.00'} hours
                </span>
              </div>

              <div className="rounded-2xl border border-zinc-900 bg-zinc-950/20 p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-cyan-400/5 blur-xl" />
                <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest">Hourly Value</span>
                <span className="text-xl font-black text-zinc-100 tracking-tight mt-3">
                  ${billingRate.toFixed(2)}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 font-mono">Active multiplier</span>
              </div>

              <div className="rounded-2xl border border-zinc-900 bg-zinc-950/20 p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-lime-400/5 blur-xl" />
                <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest">Billed Sum</span>
                <span className="text-xl font-black text-lime-400 tracking-tight mt-3">
                  ${billingInfo ? ((billingInfo.totalSeconds / 3600) * billingRate).toFixed(2) : '0.00'}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 font-mono">Invoice estimate</span>
              </div>

            </div>

            {/* Aggregations breakdowns charts grid */}
            {billingInfo && (billingInfo.taskBreakdown.length > 0 || billingInfo.userBreakdown.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Tasks breakdown */}
                <div className="rounded-3xl border border-zinc-900 bg-zinc-950/20 p-6 space-y-4">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <ListBullets size={14} />
                    <span>Grouped by Task</span>
                  </h4>
                  
                  <div className="space-y-3.5">
                    {billingInfo.taskBreakdown.map(t => {
                      const percentage = billingInfo.totalSeconds > 0 ? (t.totalSeconds / billingInfo.totalSeconds) * 100 : 0;
                      return (
                        <div key={t.taskId} className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center text-zinc-300 font-medium">
                            <span className="truncate max-w-[20ch]">{t.taskTitle}</span>
                            <span className="font-mono text-[10px] font-bold text-zinc-400">
                              {(t.totalSeconds / 3600).toFixed(2)}h ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                            <div style={{ width: `${percentage}%` }} className="h-full bg-gradient-to-r from-lime-400 to-cyan-400 rounded-full" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Users breakdown */}
                <div className="rounded-3xl border border-zinc-900 bg-zinc-950/20 p-6 space-y-4">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <User size={14} />
                    <span>Grouped by Staff</span>
                  </h4>

                  <div className="space-y-3.5">
                    {billingInfo.userBreakdown.map(u => {
                      const percentage = billingInfo.totalSeconds > 0 ? (u.totalSeconds / billingInfo.totalSeconds) * 100 : 0;
                      return (
                        <div key={u.userId} className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center text-zinc-300 font-medium">
                            <span>{u.userName}</span>
                            <span className="font-mono text-[10px] font-bold text-zinc-400">
                              {(u.totalSeconds / 3600).toFixed(2)}h ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                            <div style={{ width: `${percentage}%` }} className="h-full bg-gradient-to-r from-lime-400 to-cyan-400 rounded-full" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* Time Log Timeline Logs list */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest px-1">Labor logs timeline</h4>
              <div className="rounded-3xl border border-zinc-900 bg-zinc-950/20 divide-y divide-zinc-900/60 overflow-hidden">
                {isLoadingBilling ? (
                  <div className="p-8 text-center text-xs text-zinc-550 animate-pulse">Syncing timeline records...</div>
                ) : billingInfo && billingInfo.logs.length > 0 ? (
                  billingInfo.logs.map((log) => (
                    <div key={log.id} className="p-4 flex items-center justify-between text-xs gap-4 hover:bg-zinc-900/10 transition-colors">
                      <div className="truncate space-y-1">
                        <div className="font-bold text-zinc-200 truncate flex items-center gap-2">
                          <span>{log.task?.title || 'General Task'}</span>
                          <span className="text-[9px] bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 text-zinc-500 rounded font-mono uppercase tracking-wider">
                            {log.user.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 truncate leading-relaxed">
                          {log.description || 'Labor Log'} • {new Date(log.loggedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lime-400 bg-lime-400/5 border border-lime-400/20 px-2 py-0.5 rounded font-bold text-[10px]">
                          {(log.durationSeconds / 3600).toFixed(2)}h
                        </span>
                        
                        <button
                          onClick={() => {
                            if (window.confirm('Revoke and delete this logged time?')) {
                              deleteTimeLogMutation.mutate({ taskId: log.task.id, logId: log.id });
                            }
                          }}
                          className="w-8 h-8 rounded-lg border border-zinc-900 hover:border-rose-500/20 text-zinc-650 hover:text-rose-400 flex items-center justify-center transition-colors"
                          title="Delete Log"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-zinc-650">No billable time logs saved for this project.</div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
