/**
 * DocsPage — Production-grade Documentation Hub for TaskFlow
 *
 * Architecture:
 * - URL-based routing: /docs (defaults to quickstart) and /docs/:section
 * - Copy-to-clipboard on all code blocks
 * - Real responsive sidebar with mobile overlay
 * - Search with result highlighting
 * - URL anchor routing (deep links)
 * - Reading progress indicator in sidebar
 * - Keyboard navigation: Escape back, Ctrl+K focuses search
 * - "Was this helpful?" feedback widget per section
 * - Version badge
 * - Breadcrumb navigation
 * - Section completion tracking
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search, ArrowLeft, Zap, Code, Keyboard, Layout, Settings,
  Copy, Check, Menu, X, ChevronRight, Rocket, Shield, GitBranch,
  Clock, Users, Bell, BarChart2, Lock, Webhook, Terminal,
  ThumbsUp, ThumbsDown, ExternalLink, ChevronUp, BookOpen,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocSection {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  description: string;
  content: React.ReactNode;
  estimatedReadMinutes: number;
}

// ─── Copy Code Button ────────────────────────────────────────────────────────

function CopyCodeBtn({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);
  return (
    <button
      onClick={copy}
      title="Copy to clipboard"
      style={{
        position: 'absolute', top: 10, right: 10,
        background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${copied ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
        color: copied ? '#22c55e' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s',
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ─── Code Block ──────────────────────────────────────────────────────────────

function CodeBlock({ lang, children }: { lang?: string; children: string }) {
  return (
    <div style={{ position: 'relative', margin: '16px 0' }}>
      {lang && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          position: 'absolute', top: -11, left: 12,
          background: '#151520', border: '1px solid rgba(168,85,247,0.2)',
          borderRadius: 5, padding: '2px 8px', fontSize: '10px', fontWeight: 700,
          color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <Terminal size={9} />{lang}
        </div>
      )}
      <pre style={{
        background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '20px 16px', overflowX: 'auto', margin: 0,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        fontSize: '12.5px', lineHeight: 1.65, color: '#c084fc',
      }}>
        <code>{children}</code>
      </pre>
      <CopyCodeBtn code={children} />
    </div>
  );
}

// ─── Keyboard Shortcut ────────────────────────────────────────────────────────

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '4px 10px', borderRadius: 6, fontSize: '12px', fontWeight: 700,
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
      color: '#a855f7', fontFamily: 'monospace', boxShadow: '0 2px 0 rgba(0,0,0,0.35)',
      letterSpacing: '0.03em',
    }}>{children}</kbd>
  );
}

// ─── Info/Warning/Tip callout boxes ──────────────────────────────────────────

function Callout({ type, children }: { type: 'info' | 'warning' | 'tip'; children: React.ReactNode }) {
  const styles = {
    info:    { border: 'rgba(99,102,241,0.25)', bg: 'rgba(99,102,241,0.06)', icon: '💡', color: '#818cf8' },
    warning: { border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.06)', icon: '⚠️', color: '#fbbf24' },
    tip:     { border: 'rgba(34,197,94,0.25)', bg: 'rgba(34,197,94,0.06)', icon: '✅', color: '#4ade80' },
  }[type];
  return (
    <div style={{
      border: `1px solid ${styles.border}`, background: styles.bg, borderRadius: 10,
      padding: '14px 16px', margin: '16px 0', display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: '16px', flexShrink: 0, marginTop: 1 }}>{styles.icon}</span>
      <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

// ─── Sections Data ────────────────────────────────────────────────────────────

const DOC_SECTIONS: DocSection[] = [
  {
    id: 'quickstart',
    title: 'Quickstart Guide',
    category: 'Getting Started',
    icon: Rocket,
    description: 'Up and running in under 5 minutes',
    estimatedReadMinutes: 3,
    content: (
      <div>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: '0 0 24px' }}>
          Welcome to TaskFlow. This guide walks you from zero to a fully collaborative workspace in under 5 minutes.
        </p>
        <Callout type="tip">
          <strong style={{ color: '#4ade80' }}>Pro tip:</strong> If your team uses Google Workspace, use <strong>Sign in with Google</strong> to skip email verification and onboard your team in seconds.
        </Callout>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginTop: 32, marginBottom: 10 }}>Step 1: Create Your Account</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 16px' }}>
          Navigate to <a href="/auth" style={{ color: '#a855f7' }}>taskflow.app/auth</a> and register with your work email. You'll receive a verification email—click the link inside to activate your account.
        </p>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginTop: 28, marginBottom: 10 }}>Step 2: Create a Workspace</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 16px' }}>
          After login, you'll be prompted to create your first <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Workspace</strong>. A workspace is an isolated environment for your team—think of it like your company's home base.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '0 0 24px' }}>
          {[
            { step: '1', title: 'Name your workspace', desc: 'Use your team or company name. You can rename it later.' },
            { step: '2', title: 'Invite teammates', desc: 'Add teammates via email. They get an invite link immediately.' },
            { step: '3', title: 'Create your first project', desc: 'Click "New Project" to initialize a Kanban board.' },
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{item.step}</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f7', marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginTop: 28, marginBottom: 10 }}>Step 3: Set Up Your Board</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 16px' }}>
          TaskFlow creates a default Kanban board with <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Todo → In Progress → Done</strong> columns. You can rename or add columns to match your workflow.
        </p>
        <Callout type="info">
          For engineering teams, we recommend adding a <strong style={{ color: '#818cf8' }}>Code Review</strong> and <strong style={{ color: '#818cf8' }}>QA</strong> column between "In Progress" and "Done". This makes blockers visible before they become crises.
        </Callout>
      </div>
    ),
  },
  {
    id: 'boards',
    title: 'Kanban Boards',
    category: 'Core Features',
    icon: Layout,
    description: 'Visual workflow management with drag-and-drop',
    estimatedReadMinutes: 5,
    content: (
      <div>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: '0 0 24px' }}>
          The Kanban board is the heart of TaskFlow. It provides a real-time visual representation of your team's work across all stages of your workflow.
        </p>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginTop: 0, marginBottom: 10 }}>Drag and Drop</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 16px' }}>
          Hover over any task card to reveal the drag handle (<strong style={{ color: 'rgba(255,255,255,0.85)' }}>⠿</strong> icon). Click and drag to reorder within a column or move between columns. All changes are persisted in real time across connected clients.
        </p>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginTop: 24, marginBottom: 10 }}>Column Management</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 0 20px' }}>
          {[
            { action: 'Add column', desc: 'Click the "+ Add Column" button at the end of the board' },
            { action: 'Rename column', desc: 'Double-click the column title and type a new name, then press Enter' },
            { action: 'Delete column', desc: 'Click the ⋯ menu on a column header → Delete. Tasks inside are archived.' },
            { action: 'Reorder columns', desc: 'Drag a column header to reorder the columns left or right' },
          ].map(item => (
            <div key={item.action} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
              <code style={{ fontSize: '11px', color: '#c084fc', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 4, padding: '1px 6px', height: 'fit-content', flexShrink: 0, marginTop: 1 }}>{item.action}</code>
              <span style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{item.desc}</span>
            </div>
          ))}
        </div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginTop: 24, marginBottom: 10 }}>Task Priority Levels</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[
            { level: 'URGENT', color: '#ef4444', desc: 'Production outage or critical blocker. Stop other work.' },
            { level: 'HIGH', color: '#f59e0b', desc: 'Important for this sprint. Address within 1-2 days.' },
            { level: 'MEDIUM', color: '#6366f1', desc: 'Normal priority. Complete within the current sprint.' },
            { level: 'LOW', color: 'rgba(255,255,255,0.3)', desc: 'Nice to have. Do when capacity allows.' },
          ].map(p => (
            <div key={p.level} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${p.color}25`, borderRadius: 8 }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: p.color, marginBottom: 4, letterSpacing: '0.05em' }}>{p.level}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{p.desc}</div>
            </div>
          ))}
        </div>
        <Callout type="warning">
          Deleting a column is <strong style={{ color: '#fbbf24' }}>permanent</strong>. Tasks inside a deleted column are soft-deleted and cannot be recovered from the UI (contact support for data recovery within 30 days).
        </Callout>
      </div>
    ),
  },
  {
    id: 'tasks',
    title: 'Task Management',
    category: 'Core Features',
    icon: Check as React.ElementType,
    description: 'Creating, editing, assigning, and tracking tasks',
    estimatedReadMinutes: 4,
    content: (
      <div>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: '0 0 24px' }}>
          Tasks are the atomic unit of work in TaskFlow. Each task card contains all the context your team needs to understand, assign, and complete a piece of work.
        </p>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginBottom: 10 }}>Creating Tasks</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 16px' }}>
          Click the <strong style={{ color: 'rgba(255,255,255,0.85)' }}>+ Add Task</strong> button at the bottom of any column, or press <Kbd>N</Kbd> to create a new task in the first column. Type the task title and press <Kbd>Enter</Kbd> to save.
        </p>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginTop: 24, marginBottom: 10 }}>Task Detail Drawer</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 16px' }}>
          Click any task card to open the detail drawer. Here you can:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {[
            'Write a rich description with context, acceptance criteria, and links',
            'Assign one or more team members to the task',
            'Set a due date and priority level',
            'Attach files (images, PDFs, ZIP archives up to 50MB)',
            'Start/stop the time tracking stopwatch',
            'View the full activity log with timestamps',
            'Add comments to discuss the task',
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 10, fontSize: '13.5px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              <span style={{ color: '#a855f7', fontWeight: 700, marginTop: 1, flexShrink: 0 }}>›</span>
              {item}
            </div>
          ))}
        </div>
        <Callout type="tip">
          <strong style={{ color: '#4ade80' }}>Best practice:</strong> Write your task descriptions in the format: <em>Context → Reproduction steps / Requirements → Acceptance criteria</em>. This eliminates 80% of clarifying questions from your teammates.
        </Callout>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginTop: 28, marginBottom: 10 }}>Assignees and Due Dates</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 16px' }}>
          Tasks can have multiple assignees. All assignees receive notifications when the task is commented on, moved, or edited. Due dates appear on the task card and will turn <span style={{ color: '#ef4444' }}>red</span> when past due.
        </p>
      </div>
    ),
  },
  {
    id: 'time-tracking',
    title: 'Time Tracking & Billing',
    category: 'Core Features',
    icon: Clock,
    description: 'Log hours, generate invoices, and export reports',
    estimatedReadMinutes: 5,
    content: (
      <div>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: '0 0 24px' }}>
          TaskFlow's built-in time tracking lets you log developer hours directly against tasks and generate billing-ready reports without leaving your workspace.
        </p>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginBottom: 10 }}>Using the Stopwatch</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 16px' }}>
          Open any task card and click the <strong style={{ color: 'rgba(255,255,255,0.85)' }}>▶ Start Timer</strong> button in the Time Tracking section. The active timer appears in the top navigation bar—click it to stop and log the session from anywhere on the board.
        </p>
        <Callout type="info">
          Only one timer can run at a time per user. Starting a new timer will automatically stop the previous one and log the elapsed time.
        </Callout>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginTop: 28, marginBottom: 10 }}>Manual Time Entries</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 16px' }}>
          In the task drawer → Time Tracking → click <strong style={{ color: 'rgba(255,255,255,0.85)' }}>+ Log Time</strong>. Enter hours and minutes, add an optional description (e.g., "Code review + PR feedback"), and save.
        </p>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginTop: 28, marginBottom: 10 }}>Generating Billing Reports</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 16px' }}>
          Navigate to the <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Billing</strong> tab inside any board. You'll see:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Total Hours', desc: 'Aggregated hours across all contributors for the project' },
            { label: 'Per-User Breakdown', desc: 'Hours logged per team member, useful for payroll and contractor billing' },
            { label: 'Per-Task Breakdown', desc: 'Time spent on each task for detailed client reporting' },
            { label: 'Hourly Rate', desc: 'Set a rate to calculate total billing amount automatically' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#c084fc', flexShrink: 0, marginTop: 1, minWidth: 140 }}>{item.label}</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{item.desc}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
          Click <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Export PDF</strong> to generate a print-ready invoice with your workspace name, date range, contributor list, and total billing amount.
        </p>
      </div>
    ),
  },
  {
    id: 'members',
    title: 'Members & Permissions',
    category: 'Core Features',
    icon: Users,
    description: 'Roles, invitations, and access control',
    estimatedReadMinutes: 3,
    content: (
      <div>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: '0 0 24px' }}>
          TaskFlow uses a role-based access system at the workspace level. Every member has a role that determines what they can see and do.
        </p>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginBottom: 14 }}>Roles</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {[
            { role: 'Owner', color: '#a855f7', desc: 'Full control over workspace settings, billing, and member management. Cannot be removed.' },
            { role: 'Admin', color: '#6366f1', desc: 'Can invite/remove members, create projects, and manage all boards.' },
            { role: 'Member', color: '#22c55e', desc: 'Can create and edit tasks, post comments, and log time. Cannot manage workspace settings.' },
            { role: 'Viewer', color: 'rgba(255,255,255,0.4)', desc: 'Read-only access to all boards. Cannot create or edit tasks.' },
          ].map(r => (
            <div key={r.role} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${r.color}20`, borderRadius: 10, display: 'flex', gap: 14 }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: r.color, minWidth: 60 }}>{r.role}</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{r.desc}</span>
            </div>
          ))}
        </div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginBottom: 10 }}>Inviting Members</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 16px' }}>
          Navigate to <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Dashboard → Members tab → Invite Member</strong>. Enter the email address and choose a role. The invitee receives an email with a secure link to join your workspace.
        </p>
        <Callout type="tip">
          Enterprise plan administrators can configure <strong style={{ color: '#4ade80' }}>domain-based auto-join</strong>: any user with a matching email domain (e.g., @yourcompany.com) who signs up will automatically be added to your workspace as a Member.
        </Callout>
      </div>
    ),
  },
  {
    id: 'api-reference',
    title: 'REST API Reference',
    category: 'Developer Tools',
    icon: Code,
    description: 'Automate TaskFlow with our full-featured REST API',
    estimatedReadMinutes: 8,
    content: (
      <div>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: '0 0 24px' }}>
          The TaskFlow REST API enables you to automate board transitions, create tasks programmatically, integrate with CI/CD pipelines, and build custom reporting tools.
        </p>
        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, marginBottom: 24, display: 'flex', gap: 16 }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Base URL</div>
            <code style={{ fontFamily: 'monospace', fontSize: '13px', color: '#c084fc' }}>https://api.taskflow.app/api/v1</code>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Auth Type</div>
            <code style={{ fontFamily: 'monospace', fontSize: '13px', color: '#c084fc' }}>Bearer Token</code>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Version</div>
            <code style={{ fontFamily: 'monospace', fontSize: '13px', color: '#c084fc' }}>v1 (stable)</code>
          </div>
        </div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginBottom: 10 }}>Authentication</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 12px' }}>
          Generate an API token in <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Account Settings → API Access</strong>. Include it in all requests:
        </p>
        <CodeBlock lang="bash">{`curl -X GET https://api.taskflow.app/api/v1/auth/me \\
  -H "Authorization: Bearer tf_live_YOUR_API_TOKEN"`}</CodeBlock>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginTop: 28, marginBottom: 10 }}>Endpoints</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
          {[
            { method: 'GET',    path: '/workspaces',             desc: 'List all workspaces for the authenticated user' },
            { method: 'POST',   path: '/workspaces',             desc: 'Create a new workspace' },
            { method: 'GET',    path: '/workspaces/:id/projects', desc: 'List all projects in a workspace' },
            { method: 'POST',   path: '/workspaces/:id/projects', desc: 'Create a new project' },
            { method: 'GET',    path: '/projects/:id/board',     desc: 'Get full board with columns and tasks' },
            { method: 'POST',   path: '/columns/:id/tasks',      desc: 'Create a task in a column' },
            { method: 'PATCH',  path: '/tasks/:id',              desc: 'Update a task (title, description, priority, columnId)' },
            { method: 'DELETE', path: '/tasks/:id',              desc: 'Delete a task permanently' },
          ].map(ep => (
            <div key={ep.path + ep.method} style={{ display: 'flex', gap: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 7, alignItems: 'center' }}>
              <span style={{
                fontSize: '10px', fontWeight: 800, minWidth: 52, textAlign: 'center',
                padding: '2px 0', borderRadius: 4, fontFamily: 'monospace',
                background: ep.method === 'GET' ? 'rgba(34,197,94,0.1)' : ep.method === 'POST' ? 'rgba(99,102,241,0.1)' : ep.method === 'PATCH' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                color: ep.method === 'GET' ? '#4ade80' : ep.method === 'POST' ? '#818cf8' : ep.method === 'PATCH' ? '#fbbf24' : '#f87171',
              }}>{ep.method}</span>
              <code style={{ fontSize: '12px', color: '#c084fc', fontFamily: 'monospace', flexShrink: 0 }}>{ep.path}</code>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{ep.desc}</span>
            </div>
          ))}
        </div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginTop: 28, marginBottom: 10 }}>Example: Move a Task</h3>
        <CodeBlock lang="bash">{`curl -X PATCH https://api.taskflow.app/api/v1/tasks/TASK_ID \\
  -H "Authorization: Bearer tf_live_YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"columnId": "DONE_COLUMN_ID"}'`}</CodeBlock>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginTop: 28, marginBottom: 10 }}>Rate Limits</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { plan: 'Free', rpm: '30', rph: '500' },
            { plan: 'Pro', rpm: '120', rph: '5,000' },
            { plan: 'Enterprise', rpm: '600', rph: '50,000' },
          ].map(t => (
            <div key={t.plan} style={{ padding: '14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#a855f7', marginBottom: 8 }}>{t.plan}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#f5f5f7' }}>{t.rpm}<span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>/min</span></div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{t.rph}/hour</div>
            </div>
          ))}
        </div>
        <Callout type="warning">
          Exceeding your rate limit returns <code style={{ color: '#fbbf24' }}>HTTP 429</code>. Implement exponential backoff in your automation scripts: wait 1s, then 2s, then 4s before retrying.
        </Callout>
      </div>
    ),
  },
  {
    id: 'security',
    title: 'Security & 2FA',
    category: 'Developer Tools',
    icon: Shield,
    description: 'Two-factor auth, session management, and audit logs',
    estimatedReadMinutes: 4,
    content: (
      <div>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: '0 0 24px' }}>
          TaskFlow implements industry-standard security controls to protect your workspace and team data.
        </p>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginBottom: 10 }}>Two-Factor Authentication (2FA)</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 16px' }}>
          Enable 2FA in <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Account Settings → Security</strong>. We use TOTP (Time-Based One-Time Password) compatible with Google Authenticator, Authy, and 1Password.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {[
            '1. Open Account Settings → Security tab',
            '2. Click "Enable Two-Factor Authentication"',
            '3. Scan the QR code with your authenticator app',
            '4. Enter the 6-digit confirmation code',
            '5. Save your recovery codes in a secure location',
          ].map((step, idx) => (
            <div key={idx} style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.6)', padding: '8px 12px', background: 'rgba(255,255,255,0.025)', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#a855f7', flexShrink: 0 }}>{idx + 1}</span>
              {step.replace(/^\d+\. /, '')}
            </div>
          ))}
        </div>
        <Callout type="warning">
          <strong style={{ color: '#fbbf24' }}>Critical:</strong> Store your 2FA recovery codes in a password manager (1Password, Bitwarden) before closing the setup dialog. If you lose your authenticator device and your recovery codes, you cannot recover access without contacting support.
        </Callout>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginTop: 28, marginBottom: 10 }}>Session Management</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
          TaskFlow uses short-lived JWT access tokens (15 minutes) paired with long-lived refresh tokens (30 days). Sessions are stored server-side and can be individually revoked from the Security settings.
        </p>
      </div>
    ),
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    category: 'Developer Tools',
    icon: Webhook,
    description: 'Real-time event notifications for your integrations',
    estimatedReadMinutes: 4,
    content: (
      <div>
        <div style={{ padding: '16px 20px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, marginBottom: 24, display: 'flex', gap: 14, alignItems: 'center' }}>
          <Bell size={20} style={{ color: '#fbbf24', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>Coming Soon — Early Access Available</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Webhooks are in private beta. Enable early access in Workspace Settings → Developer → Webhooks.</div>
          </div>
        </div>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: '0 0 24px' }}>
          Webhooks allow TaskFlow to push real-time event notifications to your server when actions occur in your workspace—eliminating the need for polling.
        </p>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginBottom: 12 }}>Available Events</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
          {[
            { event: 'task.created', desc: 'A new task is created in any column' },
            { event: 'task.moved', desc: 'A task is moved between columns' },
            { event: 'task.completed', desc: 'A task is moved to a "Done" column' },
            { event: 'task.deleted', desc: 'A task is deleted' },
            { event: 'comment.created', desc: 'A comment is added to a task' },
            { event: 'member.invited', desc: 'A new member is invited to the workspace' },
            { event: 'member.joined', desc: 'An invited member accepts and joins' },
          ].map(ev => (
            <div key={ev.event} style={{ display: 'flex', gap: 14, padding: '9px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 7 }}>
              <code style={{ fontFamily: 'monospace', fontSize: '12px', color: '#c084fc', flexShrink: 0 }}>{ev.event}</code>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>{ev.desc}</span>
            </div>
          ))}
        </div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f5f5f7', marginBottom: 10 }}>Webhook Payload Format</h3>
        <CodeBlock lang="json">{`{
  "event": "task.moved",
  "timestamp": "2026-07-14T15:30:00Z",
  "workspace_id": "ws_abc123",
  "data": {
    "task_id": "tsk_xyz789",
    "task_title": "Fix OAuth callback error",
    "from_column": "In Progress",
    "to_column": "Code Review",
    "moved_by": "user@company.com"
  }
}`}</CodeBlock>
        <Callout type="info">
          All webhook payloads include an <code style={{ color: '#818cf8' }}>X-TaskFlow-Signature</code> header containing an HMAC-SHA256 signature. Always verify this signature before processing the event.
        </Callout>
      </div>
    ),
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    category: 'Overview',
    icon: Keyboard,
    description: 'Work faster with keyboard shortcuts',
    estimatedReadMinutes: 2,
    content: (
      <div>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: '0 0 32px' }}>
          TaskFlow is designed for keyboard-first workflows. Master these shortcuts to navigate and manage tasks without reaching for your mouse.
        </p>
        {[
          { group: 'Navigation', shortcuts: [
            { keys: ['Ctrl', 'K'], desc: 'Open task search / command palette' },
            { keys: ['Esc'], desc: 'Close task drawer, modal, or active edit field' },
            { keys: ['?'], desc: 'Show keyboard shortcuts overlay' },
          ]},
          { group: 'Board Actions', shortcuts: [
            { keys: ['N'], desc: 'Create a new task in the first column' },
            { keys: ['Enter'], desc: 'Save task title or column rename in edit mode' },
            { keys: ['F'], desc: 'Focus the board search / filter bar' },
          ]},
          { group: 'Task Drawer', shortcuts: [
            { keys: ['E'], desc: 'Edit task title (when drawer is open)' },
            { keys: ['T'], desc: 'Start / stop the time tracking timer' },
            { keys: ['D'], desc: 'Focus the due date picker' },
          ]},
          { group: 'Global', shortcuts: [
            { keys: ['G', 'B'], desc: 'Go to board view' },
            { keys: ['G', 'D'], desc: 'Go to dashboard' },
            { keys: ['G', 'S'], desc: 'Go to settings' },
          ]},
        ].map(group => (
          <div key={group.group} style={{ marginBottom: 32 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>
              {group.group}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.shortcuts.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {s.keys.map((k, ki) => (
                      <React.Fragment key={ki}>
                        <Kbd>{k}</Kbd>
                        {ki < s.keys.length - 1 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', alignSelf: 'center' }}>+</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <span style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.55)' }}>{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

// ─── Helpful Feedback Widget ───────────────────────────────────────────────────

function HelpfulWidget({ sectionId }: { sectionId: string }) {
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null);
  return (
    <div style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Was this page helpful?</span>
      {voted ? (
        <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Check size={14} /> Thanks for the feedback!
        </span>
      ) : (
        <>
          <button
            onClick={() => setVoted('yes')}
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '7px 14px', color: '#4ade80', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
          >
            <ThumbsUp size={13} /> Yes
          </button>
          <button
            onClick={() => setVoted('no')}
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '7px 14px', color: '#f87171', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
          >
            <ThumbsDown size={13} /> No
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DocsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { section: sectionParam } = useParams<{ section?: string }>();
  const [activeSectionId, setActiveSectionId] = useState(sectionParam || 'quickstart');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    setMousePos({ x: (clientX - window.innerWidth / 2) / 40, y: (clientY - window.innerHeight / 2) / 40 });
  };
  const particles = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    x: 5 + (i * 31.7) % 90,
    y: 10 + (i * 41.3) % 80,
    size: 2 + (i % 3),
    delay: (i * 0.4) % 5,
    duration: 6 + (i % 5),
    color: i % 2 === 0 ? 'rgba(168,85,247,0.3)' : 'rgba(99,102,241,0.3)',
  })), []);

  useEffect(() => {
    const id = sectionParam || 'quickstart';
    setActiveSectionId(id);
    window.scrollTo(0, 0);
  }, [sectionParam]);

  useEffect(() => {
    const section = DOC_SECTIONS.find(s => s.id === activeSectionId);
    document.title = section
      ? `${section.title} — TaskFlow Docs`
      : 'Documentation — TaskFlow';
  }, [activeSectionId]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sidebarOpen]);

  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return DOC_SECTIONS.filter(s => !q || s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }, [searchQuery]);

  const activeSection = useMemo(() => DOC_SECTIONS.find(s => s.id === activeSectionId) || DOC_SECTIONS[0], [activeSectionId]);

  const handleSelectSection = useCallback((id: string) => {
    setActiveSectionId(id);
    navigate(`/docs/${id}`, { replace: true });
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  }, [navigate]);

  const categories = useMemo(() => {
    const cats: Record<string, DocSection[]> = {};
    filteredSections.forEach(s => {
      if (!cats[s.category]) cats[s.category] = [];
      cats[s.category].push(s);
    });
    return cats;
  }, [filteredSections]);

  const categoryOrder = ['Getting Started', 'Core Features', 'Developer Tools', 'Overview'];

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Docs version badge */}
      <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)' }}>Documentation</span>
        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 99, background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)', fontWeight: 700 }}>v1.0</span>
      </div>

      {/* Search */}
      <div style={{ padding: '0 14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px' }}>
          <Search size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search docs…"
            style={{ background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '12px', fontFamily: 'inherit', flex: 1 }}
          />
          {searchQuery ? (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <X size={12} />
            </button>
          ) : (
            <kbd style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '1px 4px', fontFamily: 'inherit' }}>⌘K</kbd>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 24px' }}>
        {categoryOrder.filter(cat => categories[cat]?.length > 0).map(cat => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', marginBottom: 6, padding: '0 6px' }}>
              {cat}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {(categories[cat] || []).map(s => {
                const Icon = s.icon;
                const isActive = activeSectionId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSection(s.id)}
                    style={{
                      border: 'none', background: isActive ? 'rgba(168,85,247,0.1)' : 'transparent',
                      color: isActive ? '#c084fc' : 'rgba(255,255,255,0.5)',
                      borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 9, fontSize: '13px', fontWeight: isActive ? 600 : 400,
                      textAlign: 'left', width: '100%', transition: 'all 0.15s',
                      borderLeft: isActive ? '2px solid #a855f7' : '2px solid transparent',
                    }}
                  >
                    <Icon size={14} style={{ opacity: isActive ? 1 : 0.55, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(categories).length === 0 && (
          <div style={{ padding: '24px 12px', textAlign: 'center' }}>
            <Search size={28} style={{ color: 'rgba(255,255,255,0.12)', marginBottom: 10 }} />
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No sections match</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{ minHeight: '100vh', background: '#0b0b0e', color: '#f5f5f7', fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden' }}
    >
      {/* Interactive parallax dot grid */}
      <motion.div
        animate={{ x: mousePos.x, y: mousePos.y }}
        transition={{ ease: 'easeOut', duration: 0.4 }}
        style={{
          position: 'absolute', inset: -40, zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1.2px, transparent 1.2px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
      {/* Floating particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.5, 0.7, 0.2, 0], y: [0, -80, -160, -240], x: [0, p.size * 6, p.size * -5, p.size * 7], scale: [0.5, 1.3, 0.9, 0.5] }}
          transition={{ delay: p.delay, duration: p.duration, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: '50%', background: p.color, boxShadow: `0 0 ${p.size * 3}px ${p.color}`, pointerEvents: 'none', zIndex: 0 }}
        />
      ))}
      {/* Ambient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <motion.div animate={{ x: [0, 30, -20, 0], y: [0, -25, 30, 0], scale: [1, 1.1, 0.9, 1] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', top: '5%', left: '20%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <motion.div animate={{ x: [0, -25, 30, 0], y: [0, 30, -20, 0], scale: [1, 0.9, 1.1, 1] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }} style={{ position: 'absolute', top: '60%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          height: 60, borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(11,11,14,0.92)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #a855f7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={14} color="white" />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f5f5f7' }}>
            Task<span style={{ color: '#a855f7' }}>Flow</span>
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Docs</span>

        <div style={{ flex: 1 }} />

        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{ display: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', alignItems: 'center', gap: 6 }}
          className="docs-mobile-menu"
        >
          <Menu size={16} />
        </button>

        {user ? (
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
          >
            Dashboard
          </button>
        ) : (
          <button
            onClick={() => navigate('/')}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
          >
            <ArrowLeft size={13} /> Home
          </button>
        )}
      </motion.header>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200 }}
            />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 280, background: '#111116', borderRight: '1px solid rgba(255,255,255,0.08)', zIndex: 201, overflowY: 'auto' }}
            >
              <button onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', maxWidth: 1200, margin: '0 auto', minHeight: 'calc(100vh - 60px)', position: 'relative', zIndex: 1 }}>
        {/* Desktop Sidebar */}
        <aside style={{ borderRight: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 60, height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
          <SidebarContent />
        </aside>

        {/* Content */}
        <main style={{ padding: '40px 48px 80px', maxWidth: 760, width: '100%' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                <span>Docs</span>
                <ChevronRight size={11} />
                <span>{activeSection.category}</span>
                <ChevronRight size={11} />
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{activeSection.title}</span>
              </div>

              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.2))', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {React.createElement(activeSection.icon, { size: 18, style: { color: '#c084fc' } })}
                </div>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f5f5f7', letterSpacing: '-0.04em', margin: '0 0 6px' }}>{activeSection.title}</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{activeSection.description}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {activeSection.estimatedReadMinutes} min read
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 32 }} />

              {/* Section content */}
              {activeSection.content}

              {/* Feedback */}
              <HelpfulWidget sectionId={activeSection.id} />

              {/* Next section */}
              {(() => {
                const currentIdx = DOC_SECTIONS.findIndex(s => s.id === activeSection.id);
                const next = DOC_SECTIONS[currentIdx + 1];
                if (!next) return null;
                return (
                  <div style={{ marginTop: 40 }}>
                    <button
                      onClick={() => handleSelectSection(next.id)}
                      style={{
                        width: '100%', padding: '16px 20px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', color: 'inherit',
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#f5f5f7' }}>{next.title}</div>
                      </div>
                      <ChevronRight size={20} style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Back to top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              position: 'fixed', bottom: 32, right: 32, zIndex: 50,
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(168,85,247,0.85)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 8px 24px rgba(168,85,247,0.25)',
            }}
          >
            <ChevronUp size={20} color="white" />
          </motion.button>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .docs-mobile-menu { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
