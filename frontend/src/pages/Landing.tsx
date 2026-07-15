import React, { useState, useEffect, useRef } from 'react';
import { 
  motion, 
  useMotionValue, 
  useTransform, 
  useMotionTemplate, 
  AnimatePresence,
  useScroll,
  useSpring,
  useInView
} from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Briefcase, 
  FolderSimple, 
  CheckSquare, 
  ShieldCheck, 
  Clock, 
  ArrowsInLineHorizontal,
  ArrowRight,
  Sparkle,
  TerminalWindow,
  BookOpen
} from '@phosphor-icons/react';

interface PublicStats {
  users: number;
  workspaces: number;
  projects: number;
  tasks: number;
  uptimeSla: string;
}

const docTabs = [
  {
    id: 'auth',
    title: 'Authentication',
    method: 'POST',
    url: '/api/v1/auth/login',
    request: `{
  "email": "developer@taskflow.app",
  "password": "securepassword123"
}`,
    response: `{
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "c6d1d784a5...",
    "user": {
      "id": "usr-8a2b4c",
      "name": "Alex Dev",
      "email": "developer@taskflow.app"
    }
  }
}`
  },
  {
    id: 'tasks',
    title: 'Kanban Tasks',
    method: 'PATCH',
    url: '/api/v1/tasks/tsk-9f8e7d',
    request: `{
  "columnId": "col-uuid-done",
  "order": 2
}`,
    response: `{
  "data": {
    "id": "tsk-9f8e7d",
    "title": "Deploy API to Production",
    "columnId": "col-uuid-done",
    "order": 2,
    "priority": "HIGH"
  }
}`
  },
  {
    id: 'billing',
    title: 'Billing & TimeLogs',
    method: 'GET',
    url: '/api/v1/projects/proj-3f2d1c/billing',
    request: `// Query project billable time logs`,
    response: `{
  "data": {
    "projectId": "proj-3f2d1c",
    "projectName": "Mobile App V2",
    "totalDurationHours": 42.5,
    "totalBillableAmount": 6375.00,
    "currency": "USD",
    "logs": [
      {
        "id": "log-4r5t6y",
        "durationSeconds": 14400,
        "description": "Implemented Stripe Webhooks"
      }
    ]
  }
}`
  }
];

const NumberTicker: React.FC<{ value: number }> = ({ value }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { stiffness: 50, damping: 15 });
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (isInView) {
      motionVal.set(value);
    }
  }, [isInView, value, motionVal]);

  useEffect(() => {
    return springVal.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Math.floor(latest).toLocaleString();
      }
    });
  }, [springVal]);

  return <span ref={ref}>0</span>;
};

// Premium Card with Laser Glow Borders
const GlowingCard: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  glowColor?: string;
}> = ({ children, className = "", glowColor = "rgba(163, 249, 55, 0.25)" }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`relative overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950/40 backdrop-blur-md p-6 group transition-all duration-300 hover:border-zinc-800 ${className}`}
    >
      {/* Dynamic Laser Spotlight */}
      <motion.div
        style={{
          background: useMotionTemplate`radial-gradient(180px circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, 0.04), transparent 80%)`
        }}
        className="absolute inset-0 pointer-events-none z-0"
      />
      {/* Light Border Glow */}
      <motion.div
        style={{
          background: useMotionTemplate`radial-gradient(80px circle at ${mouseX}px ${mouseY}px, ${glowColor}, transparent 80%)`,
          opacity: 0.2
        }}
        className="absolute -inset-[1px] rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 blur-[1px]"
      />
      <div className="relative z-20">
        {children}
      </div>
    </div>
  );
};

// Interactive mini Kanban Board demonstrating app actions
const InteractiveMiniBoard: React.FC = () => {
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Implement MFA Check', col: 'todo', priority: 'HIGH', label: 'Security' },
    { id: '2', title: 'Spotlight Grid Effects', col: 'progress', priority: 'MEDIUM', label: 'UI/UX' },
    { id: '3', title: 'Supabase Prisma Sync', col: 'done', priority: 'CRITICAL', label: 'Database' }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTasks((prevTasks) => {
        const next = [...prevTasks];
        // Cycle columns
        const inProgress = next.find(t => t.col === 'progress');
        const done = next.find(t => t.col === 'done');
        const todo = next.find(t => t.col === 'todo');

        if (done) done.col = 'todo';
        if (inProgress) inProgress.col = 'done';
        if (todo) todo.col = 'progress';

        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full rounded-2xl bg-zinc-950/60 border border-zinc-900 p-4 font-sans text-xs space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-550">WORKSPACE_DEMO // REALTIME</span>
        </div>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-800" />
          <span className="w-2 h-2 rounded-full bg-zinc-800" />
          <span className="w-2 h-2 rounded-full bg-zinc-800" />
        </div>
      </div>

      {/* Grid columns */}
      <div className="grid grid-cols-3 gap-3">
        {['todo', 'progress', 'done'].map((colName) => (
          <div key={colName} className="space-y-3">
            {/* Column Label */}
            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-zinc-500 font-bold px-1">
              <span>{colName === 'todo' ? 'Backlog' : colName === 'progress' ? 'In Progress' : 'Completed'}</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400">
                {tasks.filter(t => t.col === colName).length}
              </span>
            </div>

            {/* Tasks list */}
            <div className="space-y-2 min-h-[140px]">
              <AnimatePresence mode="popLayout">
                {tasks
                  .filter((t) => t.col === colName)
                  .map((task) => (
                    <motion.div
                      layout
                      key={task.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className="bg-zinc-900/60 border border-zinc-850 p-3 rounded-xl flex flex-col justify-between gap-3 shadow-md hover:border-zinc-800 transition-colors cursor-grab active:cursor-grabbing"
                    >
                      <div className="font-medium text-zinc-200 text-xs leading-snug">{task.title}</div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
                          task.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          task.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="text-[8px] text-zinc-500 font-medium">{task.label}</span>
                      </div>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Landing() {
  const { data: stats, isLoading } = useQuery<PublicStats>({
    queryKey: ['publicStats'],
    queryFn: () => apiRequest<PublicStats>('/public/stats'),
    refetchInterval: 60000,
  });

  const [activeDocTab, setActiveDocTab] = useState('auth');

  // Navbar dynamic scroll tracking
  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 50], ["rgba(9, 9, 11, 0)", "rgba(9, 9, 11, 0.75)"]);
  const navBorder = useTransform(scrollY, [0, 50], ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.05)"]);
  const navPadding = useTransform(scrollY, [0, 50], ["1.25rem", "0.75rem"]);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const headlineWords = "Orchestrate your team workflows in real-time.".split(" ");
  const activeTabDetails = docTabs.find(tab => tab.id === activeDocTab)!;

  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-zinc-950 text-zinc-100 selection:bg-lime-400/30 selection:text-lime-400 overflow-x-hidden pt-20">
      
      {/* High-visibility Volt / Cyber Cyan Mesh Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Glow Spheres */}
        <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-lime-500/10 blur-[130px] animate-aurora-1 will-change-transform" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-cyan-500/10 blur-[130px] animate-aurora-2 will-change-transform" />
        <div className="absolute top-[35%] left-[25%] w-[40vw] h-[40vw] rounded-full bg-emerald-500/5 blur-[120px] animate-aurora-1 will-change-transform" />
        
        {/* Animated grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] animate-grid will-change-transform" />
      </div>

      {/* Dynamic Animated Header */}
      <motion.header 
        style={{ backgroundColor: navBg, borderColor: navBorder, paddingTop: navPadding, paddingBottom: navPadding }}
        className="fixed top-0 left-0 right-0 z-50 w-full border-b backdrop-blur-md transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="w-9 h-9 rounded-xl bg-gradient-to-tr from-lime-400 to-cyan-400 flex items-center justify-center font-black text-zinc-950 shadow-lg shadow-lime-400/20 active:scale-95 transition-transform">
              T
            </Link>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              TaskFlow
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a 
              href="#features" 
              onClick={(e) => handleSmoothScroll(e, 'features')}
              className="hover:text-zinc-100 transition-colors relative group py-2"
            >
              Features
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-lime-400 transition-all group-hover:w-full" />
            </a>
            <a 
              href="#stats" 
              onClick={(e) => handleSmoothScroll(e, 'stats')}
              className="hover:text-zinc-100 transition-colors relative group py-2"
            >
              Metrics
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-lime-400 transition-all group-hover:w-full" />
            </a>
            <a 
              href="#docs" 
              onClick={(e) => handleSmoothScroll(e, 'docs')}
              className="hover:text-zinc-100 transition-colors relative group py-2"
            >
              Documentation
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-lime-400 transition-all group-hover:w-full" />
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              to="/login" 
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/register" 
              className="inline-flex h-10 items-center justify-center px-5 rounded-xl bg-lime-400 text-zinc-950 text-sm font-semibold hover:bg-lime-300 active:scale-[0.98] transition-all shadow-md shadow-lime-400/10"
            >
              Start Free
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col">
        
        {/* Hero Section */}
        <section className="w-full max-w-7xl mx-auto px-6 pt-20 lg:pt-32 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Hero Copy */}
          <div className="lg:col-span-6 flex flex-col justify-center text-left">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-semibold mb-6"
              >
                <Sparkle size={14} className="animate-spin-slow" />
                <span>Next-Gen Workspaces</span>
              </motion.div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-none text-zinc-100 mb-6">
                {headlineWords.map((word, i) => (
                  <motion.span
                    key={i}
                    className="inline-block mr-[0.25em]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: i * 0.08,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                  >
                    {word === "workflows" ? (
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-emerald-400 to-cyan-400 font-extrabold">
                        {word}
                      </span>
                    ) : word}
                  </motion.span>
                ))}
              </h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-base text-zinc-400 leading-relaxed mb-10 max-w-[48ch]"
              >
                A high-performance workspace with granular RBAC, timeline tracking, and integrated time billing.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center"
              >
                <Link 
                  to="/register" 
                  className="inline-flex h-12 items-center justify-center gap-2 px-8 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 text-zinc-950 font-bold hover:from-lime-300 hover:to-emerald-300 active:scale-[0.98] transition-all shadow-lg shadow-lime-400/10"
                >
                  <span>Start a workspace</span>
                  <ArrowRight size={16} />
                </Link>
                <a 
                  href="#features" 
                  onClick={(e) => handleSmoothScroll(e, 'features')}
                  className="inline-flex h-12 items-center justify-center px-8 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium hover:bg-zinc-850 active:scale-[0.98] transition-all"
                >
                  Explore features
                </a>
              </motion.div>
            </div>
          </div>

          {/* Right Hero Interactive Board Mock */}
          <div className="lg:col-span-6 flex justify-center items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[540px]"
            >
              <div className="relative rounded-3xl border border-zinc-800 bg-zinc-900/35 backdrop-blur-lg p-5 shadow-2xl">
                {/* Visual coordinate labels */}
                <div className="absolute top-2 left-4 text-[7px] font-mono text-zinc-650">SYS: KANBAN_LIVE_DND</div>
                <InteractiveMiniBoard />
              </div>
            </motion.div>
          </div>

        </section>

        {/* Public Stats Section */}
        <section id="stats" className="w-full border-t border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md py-16 relative">
          <div className="w-full max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
            
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col items-center group"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-400 group-hover:text-lime-400 group-hover:border-lime-500/20 transition-all duration-300 mb-4 shadow-inner">
                <Users size={22} />
              </div>
              <span className="text-3xl font-black tracking-tight text-zinc-100">
                {isLoading ? '...' : <NumberTicker value={stats?.users || 120} />}
              </span>
              <span className="text-xs text-zinc-500 mt-2 uppercase tracking-widest font-bold">Active Developers</span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-center group"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-400 group-hover:text-lime-400 group-hover:border-lime-500/20 transition-all duration-300 mb-4 shadow-inner">
                <Briefcase size={22} />
              </div>
              <span className="text-3xl font-black tracking-tight text-zinc-100">
                {isLoading ? '...' : <NumberTicker value={stats?.workspaces || 18} />}
              </span>
              <span className="text-xs text-zinc-500 mt-2 uppercase tracking-widest font-bold">Workspaces</span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col items-center group"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-400 group-hover:text-lime-400 group-hover:border-lime-500/20 transition-all duration-300 mb-4 shadow-inner">
                <FolderSimple size={22} />
              </div>
              <span className="text-3xl font-black tracking-tight text-zinc-100">
                {isLoading ? '...' : <NumberTicker value={stats?.projects || 45} />}
              </span>
              <span className="text-xs text-zinc-500 mt-2 uppercase tracking-widest font-bold">Active Projects</span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col items-center group"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-400 group-hover:text-lime-400 group-hover:border-lime-500/20 transition-all duration-300 mb-4 shadow-inner">
                <CheckSquare size={22} />
              </div>
              <span className="text-3xl font-black tracking-tight text-zinc-100">
                {isLoading ? '...' : <NumberTicker value={stats?.tasks || 382} />}
              </span>
              <span className="text-xs text-zinc-500 mt-2 uppercase tracking-widest font-bold">Completed Tasks</span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-col items-center group col-span-2 md:col-span-1"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/20 transition-all duration-300 mb-4 shadow-inner">
                <ShieldCheck size={22} />
              </div>
              <span className="text-3xl font-black tracking-tight text-emerald-455">
                {isLoading ? '99.99%' : (stats?.uptimeSla || '99.99%')}
              </span>
              <span className="text-xs text-zinc-500 mt-2 uppercase tracking-widest font-bold">Uptime SLA</span>
            </motion.div>

          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full max-w-7xl mx-auto px-6 py-24">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl font-black tracking-tight text-zinc-100 sm:text-4xl">
              Engineered for absolute performance.
            </h2>
            <p className="text-zinc-400 mt-4">
              Everything your engineering team needs to collaborate in real-time, log progress, and execute securely.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Bento Grid Item 1: Real-time board */}
            <GlowingCard>
              <div className="w-12 h-12 rounded-2xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400 mb-6">
                <ArrowsInLineHorizontal size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100 mb-3 group-hover:text-lime-400 transition-colors">Real-time Kanban</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Socket-driven dragging and status transitions update within 60ms across all team member screens.
                </p>
              </div>
            </GlowingCard>

            {/* Bento Grid Item 2: Security */}
            <GlowingCard>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100 mb-3 group-hover:text-cyan-400 transition-colors">Granular Security</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Protect endpoints via strict Role-Based Access Control (RBAC), multi-factor auth (2FA), and secure domain locks.
                </p>
              </div>
            </GlowingCard>

            {/* Bento Grid Item 3: Time Tracking & Invoicing */}
            <GlowingCard>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100 mb-3 group-hover:text-emerald-400 transition-colors">Billing & Time Log</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Log time directly within cards to automatically correlate project billable hours and export structured billing reports.
                </p>
              </div>
            </GlowingCard>
          </div>
        </section>

        {/* Dynamic Documentation Section */}
        <section id="docs" className="w-full max-w-7xl mx-auto px-6 py-24 border-t border-zinc-900">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            
            {/* Left explanation column */}
            <div className="lg:col-span-5 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6">
                <BookOpen size={14} />
                <span>API Reference</span>
              </div>
              
              <h2 className="text-3xl font-black tracking-tight text-zinc-100 mb-6">
                Fully documented rest API.
              </h2>
              <p className="text-zinc-400 mb-10 leading-relaxed">
                Connect your external deployment pipelines, scripts, and billing tools directly to TaskFlow. Access fully typed JSON schemas.
              </p>

              {/* Interactive Doc Tabs */}
              <div className="space-y-4">
                {docTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDocTab(tab.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200 ${
                      activeDocTab === tab.id 
                        ? 'bg-zinc-900/80 border-lime-400/40 text-zinc-100 shadow-md' 
                        : 'bg-zinc-950/20 border-zinc-900 text-zinc-450 hover:border-zinc-800 hover:text-zinc-300'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-semibold block uppercase tracking-wider text-zinc-500 mb-1">
                        Endpoint
                      </span>
                      <span className="font-bold text-sm block">
                        {tab.title}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                      tab.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      tab.method === 'PATCH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                      'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    }`}>
                      {tab.method}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right code terminal mock */}
            <div className="lg:col-span-7 w-full">
              <div className="rounded-2xl border border-zinc-850 bg-zinc-950 shadow-2xl overflow-hidden text-left font-mono text-xs">
                
                {/* Terminal Header */}
                <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-850 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-zinc-700" />
                    <span className="w-3 h-3 rounded-full bg-zinc-700" />
                    <span className="w-3 h-3 rounded-full bg-zinc-700" />
                    <span className="text-zinc-500 text-[10px] ml-2 font-medium">terminal — bash</span>
                  </div>
                  <TerminalWindow size={16} className="text-zinc-600" />
                </div>

                {/* Terminal Console */}
                <div className="p-6 space-y-6 overflow-x-auto min-h-[380px]">
                  
                  {/* Command Row */}
                  <div>
                    <span className="text-lime-400">$</span> <span className="text-zinc-300">curl -X {activeTabDetails.method} https://taskflow.app{activeTabDetails.url} \</span>
                    <div className="text-zinc-500 pl-4 mt-1">
                      -H "Content-Type: application/json" \
                      {activeTabDetails.method !== 'GET' && '-d \'' + activeTabDetails.request.trim() + '\''}
                    </div>
                  </div>

                  {/* Response Console */}
                  <div className="border-t border-zinc-900 pt-4 space-y-2">
                    <div className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">
                      Response Payload
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.pre
                        key={activeDocTab}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="text-zinc-400 overflow-x-auto leading-relaxed bg-zinc-900/40 p-4 rounded-xl border border-zinc-900/60"
                      >
                        {activeTabDetails.response}
                      </motion.pre>
                    </AnimatePresence>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-10 border-t border-zinc-900/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-500 bg-zinc-950/40">
        <div>
          &copy; {new Date().getFullYear()} TaskFlow. All rights reserved.
        </div>
        <div className="flex gap-6">
          <a href="#privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</a>
          <a href="#terms" className="hover:text-zinc-300 transition-colors">Terms of Service</a>
        </div>
      </footer>

    </div>
  );
}
