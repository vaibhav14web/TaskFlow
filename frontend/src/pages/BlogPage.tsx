/**
 * BlogPage — Production-grade Blog Hub for TaskFlow
 *
 * Architecture:
 * - URL-based routing: /blog (index) and /blog/:slug (individual article)
 * - Real markdown parser (bold, italic, code blocks, blockquotes, numbered lists, links)
 * - Reading progress bar (sticky, shows scroll %)
 * - Table of contents (generated from H2/H3 headings, desktop sidebar)
 * - Social share: Copy link, Twitter, LinkedIn
 * - Related posts (by category)
 * - Author bio section
 * - SEO meta injection via document.title + meta tags
 * - Back navigation with breadcrumb trail
 * - Empty state, error state
 * - Keyboard: Escape closes article, Ctrl+K focuses search
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search, ArrowLeft, Clock, Calendar, Zap, Copy, Check,
  ChevronRight, ExternalLink, BookOpen, Tag, Share2,
  Menu, X, ChevronUp
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Category = 'Engineering' | 'Security' | 'Product' | 'Tutorial';

interface Author {
  name: string;
  role: string;
  avatar: string;
  bio: string;
}

interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  category: Category;
  publishedAt: string;
  updatedAt?: string;
  readTime: number; // minutes
  tags: string[];
  summary: string;
  content: string;
  author: Author;
  accentColor: string;
  ogDescription: string;
  featured?: boolean;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const AUTHORS: Record<string, Author> = {
  sarah: {
    name: 'Sarah Lin',
    role: 'Head of Product',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    bio: 'Sarah leads product strategy at TaskFlow. Previously at Figma and Notion, she obsesses over how teams coordinate work.',
  },
  david: {
    name: 'David Kowalski',
    role: 'Security Architect',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'David designs TaskFlow\'s security infrastructure. Former lead security engineer at Cloudflare with 12 years in application security.',
  },
  elena: {
    name: 'Elena Rostova',
    role: 'Senior Integration Engineer',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    bio: 'Elena builds developer tooling and API integrations at TaskFlow. She has contributed to dozens of open-source developer tools.',
  },
  marcus: {
    name: 'Marcus Chen',
    role: 'Engineering Manager',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    bio: 'Marcus leads the core platform team at TaskFlow. Ex-Linear and Stripe, he is passionate about developer experience and team velocity.',
  },
};

const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'maximizing-team-velocity-kanban',
    title: 'Maximizing Team Velocity with Kanban Boards',
    subtitle: 'How WIP limits, column design, and cumulative flow diagrams unlock consistent shipping',
    category: 'Product',
    publishedAt: 'July 12, 2026',
    readTime: 7,
    tags: ['kanban', 'velocity', 'workflow', 'sprints'],
    summary: 'Learn how to configure your board columns, limit work-in-progress (WIP), and use analytics to double your team\'s shipping speed—without burning anyone out.',
    accentColor: '#a855f7',
    featured: true,
    ogDescription: 'A practical guide to designing Kanban workflows that scale from 3 to 300 engineers.',
    author: AUTHORS.sarah,
    content: `
## The Problem with Unlimited Work

Most teams don't have a productivity problem. They have a *focus* problem.

Walk into any engineering org and you'll find the same pattern: every engineer has 4-7 things "in progress." Pull requests sit in review for days. The board is full, but nothing ships.

The root cause is a misunderstanding of how knowledge work flows. Unlike factory work, software tasks don't stack in a predictable queue. Each blocked task creates invisible coordination overhead—Slack messages, status calls, re-context-switching—that compounds across the team.

**The solution is counterintuitive:** to go faster, you must take on less.

## 1. Limit Your Work-In-Progress

The single most impactful change you can make to a Kanban board is adding WIP limits.

A WIP limit is a hard cap on how many tasks can exist in a given column simultaneously. When you hit the limit, no new task can enter until one exits.

### Why This Works

When the board *forces* a constraint, engineers stop starting new work and start finishing existing work. This is called **"Stop starting, start finishing"**—a principle from Lean manufacturing that translates directly to software teams.

### Recommended Starting Limits

Here's a starting formula:

| Team Size | In Progress WIP | Review WIP |
|-----------|-----------------|------------|
| 1-3 devs  | 3               | 2          |
| 4-8 devs  | 5               | 3          |
| 9-15 devs | 8               | 5          |

Don't try to be perfect on day one. Set a limit that feels slightly uncomfortable—that friction is the point.

## 2. Design Columns That Reflect Reality

Most boards use three columns: **Todo → In Progress → Done**. This works fine for personal projects. It fails for teams.

The problem is that "In Progress" contains too many different states. Is this task being coded? Waiting for a code review? Blocked on a dependency? In QA testing?

### A Better Column Structure

For a modern engineering team:

\`\`\`
Backlog → Ready → In Progress → Code Review → QA → Done
\`\`\`

Each column represents a *handoff point*—a moment where one person finishes and another begins. This visibility is what makes blockers obvious before they become crises.

### The "Blocked" Tag

Don't create a "Blocked" column. Instead, use a **Blocked** label/tag that turns the card red. This keeps the card in its current stage while making the impediment visible.

## 3. Use the Cumulative Flow Diagram

TaskFlow's analytics tab includes a Cumulative Flow Diagram (CFD). Most teams ignore this chart. That's a mistake.

A healthy CFD shows parallel bands that grow together at roughly the same rate. When you see one band widening (e.g. "Code Review" getting thick), that's a bottleneck in real-time.

### How to Read Bottlenecks

If the **Code Review** band is wide: you have too few reviewers, or reviews are too slow. Solution: make reviewing PRs the top-priority task each morning before writing new code.

If the **QA** band is wide: your test coverage may be too manual, or QA cycles are too infrequent. Solution: invest in automated testing pipelines.

If the **Ready** band is growing but **In Progress** isn't: engineers are blocked choosing tasks. Solution: hold a 10-minute planning meeting to explicitly pick tasks.

## 4. The Weekly Board Review

Cadence beats intensity. A 20-minute weekly board review with the team does more than a 4-hour monthly retrospective.

**The agenda:**
1. Review the CFD together (5 min)
2. Identify the top blocker for the week (5 min)
3. Agree on one WIP adjustment (5 min)
4. Celebrate one shipped task (5 min)

This creates a continuous improvement loop that compounds over quarters. Teams that practice this consistently report 40-60% velocity improvements within 6 months.

## Summary

The highest-leverage actions you can take today:

1. **Set a WIP limit** on your "In Progress" column right now
2. **Add a Code Review column** if you don't have one
3. **Open the CFD** in TaskFlow's Analytics tab and identify your current bottleneck
4. **Schedule a 20-minute weekly review** with your team

Velocity isn't about working harder. It's about designing systems that make the right work the obvious work.
    `,
  },
  {
    slug: 'two-factor-authentication-enterprise-security',
    title: 'Two-Factor Authentication: The Complete Enterprise Security Guide',
    subtitle: 'TOTP, recovery codes, SSO considerations, and why SMS 2FA is insufficient for serious teams',
    category: 'Security',
    publishedAt: 'July 8, 2026',
    readTime: 9,
    tags: ['security', '2fa', 'totp', 'enterprise', 'authentication'],
    summary: 'A deep technical walkthrough of how TaskFlow implements TOTP-based two-factor authentication—plus what every engineering team should know about credential security.',
    accentColor: '#22c55e',
    featured: true,
    ogDescription: 'Everything engineering teams need to know about deploying robust 2FA—from TOTP internals to recovery code security.',
    author: AUTHORS.david,
    content: `
## Why Passwords Alone Are No Longer Sufficient

In 2024, the DBIR (Verizon Data Breach Investigations Report) found that stolen or compromised credentials account for 44% of all data breaches. Yet most teams still treat their project management tools like public forums—a single password stands between an attacker and your entire product roadmap.

This is especially dangerous for software teams. Your Kanban board contains:
- Upcoming features your competitors would love to know
- Architecture decisions with security implications
- External integration credentials in task descriptions
- Sprint plans that reveal your competitive priorities

Strong authentication is not optional for professional teams.

## Understanding TOTP (Time-Based One-Time Passwords)

TaskFlow uses TOTP as defined in [RFC 6238](https://tools.ietf.org/html/rfc6238). Here's exactly how it works.

### Step 1: Secret Key Generation

When you enable 2FA, TaskFlow's backend generates a cryptographically secure 160-bit secret using \`crypto.randomBytes(20)\`. This secret never leaves the server in plaintext—it's used only to generate the QR code URI.

\`\`\`
Secret: JBSWY3DPEHPK3PXP (Base32 encoded)
\`\`\`

### Step 2: QR Code Generation

The secret is encoded into a Key URI format:

\`\`\`
otpauth://totp/TaskFlow:user@company.com?secret=JBSWY3DPEHPK3PXP&issuer=TaskFlow
\`\`\`

This URI is rendered as a QR code on your screen. Your authenticator app (Google Authenticator, Authy, 1Password, Bitwarden) scans it and stores the secret locally on your device.

### Step 3: Code Generation Algorithm

Every 30 seconds, your authenticator app:

1. Takes the current Unix timestamp and divides by 30 (the time step)
2. Computes \`HMAC-SHA1(secret, timestamp_step)\` 
3. Applies dynamic truncation to extract 4 bytes from the hash
4. Converts to a 6-digit decimal code

### Step 4: Server Verification

When you submit your 6-digit code, TaskFlow's server runs the same algorithm and compares. We accept codes from the previous and next 30-second window to account for clock drift.

## Why Not SMS?

SMS-based 2FA is better than no 2FA—but it has known weaknesses:

**SIM Swap Attacks**: An attacker convinces your carrier to transfer your phone number to their SIM card. This is surprisingly easy to execute with basic social engineering. In 2019, Twitter CEO Jack Dorsey's account was compromised this way.

**SS7 Protocol Vulnerabilities**: The decades-old telecom backbone protocol has known interception vulnerabilities that state-level actors (and sophisticated criminals) can exploit.

**For enterprise teams, TOTP is the minimum standard.** Hardware security keys (FIDO2/WebAuthn) are even better.

## Recovery Codes: The Critical Detail Most Teams Miss

During 2FA setup, TaskFlow generates 10 single-use recovery codes. These are the **only way to recover access** if you lose your authenticator device.

### Where to Store Them

**❌ Wrong**: Email draft, screenshot, Slack DM to yourself  
**✓ Right**: Password manager (1Password, Bitwarden), printed and locked in a physical safe, encrypted notes app

### How They Work Internally

Each recovery code is a randomly generated 16-character alphanumeric string. On our backend:

\`\`\`
Hash: bcrypt(code, salt_rounds=12)
Stored: hashed_value + used_boolean + created_at
\`\`\`

When you use a recovery code, we mark it as used and it can never be used again. After all 10 are used, you must generate new ones while authenticated.

## Enterprise Considerations: SSO vs. 2FA

Enterprise teams often ask: "If we have SSO (Okta, Azure AD), do we still need 2FA?"

**Yes—but at the IdP level.**

When you connect TaskFlow to Okta or Azure AD, authentication flows through your identity provider. Your SSO provider should enforce MFA for all users. TaskFlow trusts the assertion from your IdP.

This means your Okta/Azure MFA policy applies to TaskFlow logins automatically—no per-app 2FA configuration needed.

## Implementing 2FA in TaskFlow

1. Navigate to your **Account Settings** (avatar → Settings)
2. Select the **Security** tab
3. Click **Enable Two-Factor Authentication**
4. Scan the QR code with your authenticator app
5. Enter the 6-digit code to confirm setup
6. **Save your recovery codes before closing the modal**

After setup, every login will require your authenticator code after your password.

## Security Best Practices for Teams

- **Mandate 2FA for all workspace members** (Enterprise plan enforces this at the workspace level)
- **Audit login history monthly** in the Security settings
- **Rotate recovery codes** if you suspect any were compromised
- **Use hardware security keys** for admin accounts
- **Never screenshot your QR code** or recovery codes

Strong security is the foundation of team trust. When clients and partners know your tools are protected, it strengthens every relationship.
    `,
  },
  {
    slug: 'rest-api-integration-cicd',
    title: 'Integrating TaskFlow with Your CI/CD Pipeline',
    subtitle: 'Automate card transitions, create tasks from GitHub Issues, and sync deployments—without writing a custom app',
    category: 'Engineering',
    publishedAt: 'July 3, 2026',
    readTime: 8,
    tags: ['api', 'cicd', 'github', 'automation', 'developer-tools'],
    summary: 'A practical guide to using the TaskFlow REST API to automate board transitions, create tasks from external events, and keep your project management in sync with your code.',
    accentColor: '#6366f1',
    ogDescription: 'Stop manually updating your task board. Wire TaskFlow to GitHub, CI, and deployment systems with our REST API.',
    author: AUTHORS.elena,
    content: `
## The Problem: Manual Board Updates Are Waste

Every time a developer has to open TaskFlow and drag a card from "In Progress" to "In Review" after pushing a PR—that's waste. Not moral waste. Pure Lean-definition waste: an action that consumes time and creates zero value.

In a team of 8 engineers pushing 15-20 PRs per week, manual board updates consume 2-3 hours per week of collective attention. Over a year: 100-150 hours. Automation eliminates this.

## Authentication: Bearer Tokens

All TaskFlow API endpoints use Bearer token authentication. Generate your API key in **Account Settings → API Access**.

\`\`\`bash
# Test your token
curl -X GET https://api.taskflow.app/api/v1/auth/me \\
  -H "Authorization: Bearer tf_live_YOUR_API_TOKEN"
\`\`\`

**Security note**: Always store tokens in CI/CD secrets, never in code. Rotate tokens every 90 days.

## Use Case 1: Auto-Move Card on PR Merge

When a GitHub pull request is merged, automatically move the linked TaskFlow task to your "Done" column.

### GitHub Actions Workflow

\`\`\`yaml
# .github/workflows/taskflow-sync.yml
name: Sync TaskFlow on PR Merge

on:
  pull_request:
    types: [closed]

jobs:
  update-taskflow:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Extract TaskFlow Task ID
        id: extract
        run: |
          # Parse task ID from PR title like "[TF-abc123] Fix login bug"
          TASK_ID=$(echo "\${{ github.event.pull_request.title }}" | grep -oP '\\[TF-\\K[a-z0-9]+(?=\\])')
          echo "task_id=$TASK_ID" >> $GITHUB_OUTPUT

      - name: Move Task to Done
        if: steps.extract.outputs.task_id != ''
        run: |
          curl -X PATCH "https://api.taskflow.app/api/v1/tasks/\${{ steps.extract.outputs.task_id }}" \\
            -H "Authorization: Bearer \${{ secrets.TASKFLOW_API_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d "{\\\"columnId\\\": \\\"\${{ secrets.DONE_COLUMN_ID }}\\\"}"
\`\`\`

## Use Case 2: Create a Task from a GitHub Issue

When a high-priority issue is opened on GitHub, automatically create a TaskFlow task.

\`\`\`yaml
name: Sync GitHub Issues to TaskFlow

on:
  issues:
    types: [opened, labeled]

jobs:
  create-taskflow-task:
    if: contains(github.event.issue.labels.*.name, 'taskflow')
    runs-on: ubuntu-latest
    steps:
      - name: Create TaskFlow Task
        run: |
          curl -X POST "https://api.taskflow.app/api/v1/columns/\${{ secrets.BACKLOG_COLUMN_ID }}/tasks" \\
            -H "Authorization: Bearer \${{ secrets.TASKFLOW_API_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "title": "\${{ github.event.issue.title }}",
              "description": "GitHub Issue #\${{ github.event.issue.number }}\\n\\n\${{ github.event.issue.body }}",
              "priority": "HIGH"
            }'
\`\`\`

## Use Case 3: Deployment Notification via Comment

When a deployment completes, add a comment to the related task.

\`\`\`bash
# Using curl in your deployment script
add_deployment_comment() {
  local task_id=$1
  local env=$2
  local sha=$3

  curl -X POST "https://api.taskflow.app/api/v1/tasks/$task_id/comments" \\
    -H "Authorization: Bearer $TASKFLOW_API_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d "{
      \"content\": \"✅ Deployed to **$env** — commit \\\`$sha\\\` — $(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }"
}
\`\`\`

## API Rate Limits

| Plan       | Requests/minute | Requests/hour |
|------------|-----------------|---------------|
| Free       | 30              | 500           |
| Pro        | 120             | 5,000         |
| Enterprise | 600             | 50,000        |

Implement exponential backoff in automation scripts to handle rate limit responses gracefully:

\`\`\`javascript
async function callWithRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429 && attempt < maxRetries - 1) {
        const waitMs = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
      throw error;
    }
  }
}
\`\`\`

## Webhook Events (Coming Soon)

We're building outbound webhooks so TaskFlow can push events to your systems:
- \`task.created\`
- \`task.moved\`
- \`task.completed\`
- \`comment.created\`
- \`member.invited\`

Sign up for early access in your workspace settings.

## Summary

The integrations that deliver the most value:
1. **PR Merge → Task Done** — eliminates the most common manual update
2. **GitHub Issue → TaskFlow Task** — keeps product and engineering in sync
3. **Deployment → Task Comment** — closes the loop for stakeholders

Start with one automation, measure the time saved, then expand. Teams typically reclaim 3-5 hours per week once all three are in place.
    `,
  },
  {
    slug: 'building-high-performance-remote-teams',
    title: 'Building High-Performance Remote Engineering Teams',
    subtitle: 'Async-first culture, structured handoffs, and the tools that make distributed teams outperform co-located ones',
    category: 'Product',
    publishedAt: 'June 28, 2026',
    readTime: 6,
    tags: ['remote', 'team', 'async', 'management', 'culture'],
    summary: 'How the best remote engineering teams use async-first workflows, clear documentation, and structured communication to consistently outship co-located teams.',
    accentColor: '#f59e0b',
    ogDescription: 'The async-first playbook that high-performance remote teams actually use.',
    author: AUTHORS.marcus,
    content: `
## The Remote Team Paradox

The data is clear: the highest-performing engineering teams in the world are increasingly remote or hybrid. GitLab (1,500+ employees, fully remote) ships faster than many co-located teams ten times its size. Stripe, Linear, and Figma all built foundational products with distributed engineering teams.

Yet most companies that "went remote" during 2020-2022 experienced a *decrease* in productivity. The difference isn't geography—it's *culture and tooling*.

## Principle 1: Async by Default

The most common mistake remote teams make: treating remote work like co-located work with video calls. This is exhausting and ineffective.

High-performing remote teams are **async by default**. Meetings are for decisions that require consensus, not information transfer. Information is written down.

### The Async-First Rule

Before scheduling a meeting, ask: *Could this be a well-written message?*

- Status update? Write it in Slack or the TaskFlow task.
- Code review feedback? Write it in the PR.
- Architecture decision? Write a short design doc.
- Blocker? Document it in the task with context, then ask for help.

Reserve synchronous time for: brainstorming sessions, difficult interpersonal conversations, and major decisions.

## Principle 2: High-Fidelity Task Cards

The quality of your task cards directly predicts your team's asynchronous effectiveness.

A bad task card: *"Fix the login bug"*  
A good task card:

\`\`\`
Title: Fix OAuth callback 500 error on production

Context: Users authenticating with Google are getting a 500 error 
after the OAuth callback. Started after deploy abc123 on June 25.

Reproduction: 
1. Click "Sign in with Google" 
2. Authenticate successfully
3. See 500 error page instead of dashboard

Root cause (suspected): The Google OAuth client secret may not be 
set in the production environment. Check GOOGLE_CLIENT_SECRET in Render.

Acceptance criteria:
- Google OAuth login succeeds for all test accounts
- No 500 errors in Sentry for oauth/callback route
- Verified on staging before merging

Related: Sentry issue #1234, Slack thread in #prod-incidents
\`\`\`

The investment in writing a good task card pays for itself 10x when it eliminates the back-and-forth of clarifying questions.

## Principle 3: Structured Daily Updates

Replace the daily standup meeting with async written updates. Use a simple template:

\`\`\`
**Yesterday**: Shipped the authentication fix. Reviewed 2 PRs.
**Today**: Starting the billing export feature. Will need design input on the CSV format.
**Blockers**: Waiting on API key from Stripe integration. Pinged @marcus.
\`\`\`

Post this in a dedicated Slack channel at the start of your workday (in your timezone). Managers read updates asynchronously. No meeting required.

## Principle 4: Explicit Handoffs

The biggest source of delays in remote teams: ambiguous handoffs.

When you finish a piece of work that someone else needs to continue, the handoff must be explicit:

❌ **Bad**: Move task to "Code Review" and hope someone notices  
✅ **Good**: Move task to "Code Review", @mention the reviewer in a comment, include context on what to look for

TaskFlow's comment system is designed for this. Tag the next person, provide context, and move the card.

## The Tooling Stack That Works

After talking to 50+ remote engineering teams, here's what the highest performers consistently use:

| Need              | Tool                  |
|-------------------|-----------------------|
| Task Management   | TaskFlow              |
| Code Review       | GitHub/GitLab         |
| Async Comms       | Slack (with discipline) |
| Video Calls       | Zoom / Loom           |
| Documentation     | Notion / Confluence   |
| Design            | Figma                 |

**The common thread**: each tool has a clear purpose and teams have clear norms about *which* communication goes in *which* tool.

## Measuring Remote Team Health

Track these leading indicators monthly:

1. **Cycle Time**: Average days from task start to done (target: decreasing trend)
2. **PR Review Time**: Average hours from PR open to first review (target: < 24h)
3. **Blocker Duration**: Average hours a task stays "blocked" (target: < 8h)
4. **Meeting Load**: Average meetings per engineer per week (target: < 5)

If any metric trends the wrong direction, investigate the root cause before adding more process.

## The Compounding Effect

Remote teams that master async culture have a structural advantage: they can hire globally, are not constrained by office hours, and develop documentation habits that make onboarding new engineers dramatically faster.

The companies that figure this out in the next 5 years will have a meaningful talent and velocity advantage over those that don't.
    `,
  },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function estimateReadTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / 200); // avg 200 wpm
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return progress;
}

function useCopyToClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    });
  }, [timeout]);
  return { copied, copy };
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────

function CopyCodeButton({ code }: { code: string }) {
  const { copied, copy } = useCopyToClipboard();
  return (
    <button
      onClick={() => copy(code)}
      title="Copy code"
      style={{
        position: 'absolute', top: 10, right: 10,
        background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
        color: copied ? '#22c55e' : 'rgba(255,255,255,0.4)',
        transition: 'all 0.2s',
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

interface TableRow { cells: string[] }
function parseTable(lines: string[]): { headers: string[], rows: TableRow[] } | null {
  if (lines.length < 3) return null;
  const headerLine = lines[0];
  const separatorLine = lines[1];
  if (!separatorLine.match(/^\|[-| :]+\|$/)) return null;
  const headers = headerLine.split('|').map(c => c.trim()).filter(Boolean);
  const rows = lines.slice(2).map(line => ({
    cells: line.split('|').map(c => c.trim()).filter(Boolean)
  }));
  return { headers, rows };
}

function renderInline(text: string): React.ReactNode {
  // Process bold (**text**), italic (*text*), inline code (`code`), links [text](url)
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/);
    // Inline code
    const codeMatch = remaining.match(/`([^`]+?)`/);
    // Link
    const linkMatch = remaining.match(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/);

    const matches = [
      boldMatch && { type: 'bold', match: boldMatch, index: boldMatch.index! },
      italicMatch && { type: 'italic', match: italicMatch, index: italicMatch.index! },
      codeMatch && { type: 'code', match: codeMatch, index: codeMatch.index! },
      linkMatch && { type: 'link', match: linkMatch, index: linkMatch.index! },
    ].filter(Boolean) as Array<{ type: string, match: RegExpMatchArray, index: number }>;

    if (matches.length === 0) {
      parts.push(<React.Fragment key={key++}>{remaining}</React.Fragment>);
      break;
    }

    const first = matches.reduce((a, b) => a.index < b.index ? a : b);
    if (first.index > 0) {
      parts.push(<React.Fragment key={key++}>{remaining.slice(0, first.index)}</React.Fragment>);
    }

    const [fullMatch, content] = first.match;
    if (first.type === 'bold') {
      parts.push(<strong key={key++} style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 700 }}>{content}</strong>);
    } else if (first.type === 'italic') {
      parts.push(<em key={key++} style={{ color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>{content}</em>);
    } else if (first.type === 'code') {
      parts.push(
        <code key={key++} style={{
          background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)',
          borderRadius: 4, padding: '1px 6px', fontFamily: 'monospace', fontSize: '0.88em',
          color: '#c084fc',
        }}>{content}</code>
      );
    } else if (first.type === 'link') {
      const url = first.match[2];
      parts.push(
        <a key={key++} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
          {content} <ExternalLink size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
        </a>
      );
    }

    remaining = remaining.slice(first.index + fullMatch.length);
  }
  return parts;
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let listItems: string[] = [];
  let orderedItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${i}`} style={{ paddingLeft: 20, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, listStyleType: 'none', paddingLeft: 16, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: '#a855f7', fontWeight: 700 }}>›</span>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
    if (orderedItems.length > 0) {
      elements.push(
        <ol key={`ol-${i}`} style={{ paddingLeft: 20, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 6, counterReset: 'ordered' }}>
          {orderedItems.map((item, idx) => (
            <li key={idx} style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, listStyleType: 'decimal', paddingLeft: 4 }}>
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      orderedItems = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      flushList();
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const code = codeLines.join('\n');
      elements.push(
        <div key={`code-${i}`} style={{ position: 'relative', margin: '20px 0' }}>
          {lang && (
            <div style={{
              position: 'absolute', top: 0, left: 16, transform: 'translateY(-50%)',
              background: '#1a1a2e', border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: 4, padding: '1px 8px', fontSize: '10px', fontWeight: 700,
              color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{lang}</div>
          )}
          <pre style={{
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '20px 16px', overflowX: 'auto',
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            fontSize: '13px', lineHeight: 1.6, color: '#c084fc', margin: 0,
          }}>
            <code>{code}</code>
          </pre>
          <CopyCodeButton code={code} />
        </div>
      );
      i++;
      continue;
    }

    // Table
    if (trimmed.startsWith('|')) {
      flushList();
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = parseTable(tableLines);
      if (table) {
        elements.push(
          <div key={`table-${i}`} style={{ overflowX: 'auto', margin: '20px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(168,85,247,0.2)' }}>
                  {table.headers.map((h, idx) => (
                    <th key={idx} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#f5f5f7', whiteSpace: 'nowrap' }}>
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ridx) => (
                  <tr key={ridx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {row.cells.map((cell, cidx) => (
                      <td key={cidx} style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Headings
    if (trimmed.startsWith('## ')) {
      flushList();
      const text = trimmed.slice(3);
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      elements.push(
        <h2 key={`h2-${i}`} id={id} style={{
          fontSize: '22px', fontWeight: 800, color: '#f5f5f7',
          letterSpacing: '-0.03em', marginTop: 40, marginBottom: 12,
          paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)',
          scrollMarginTop: 80,
        }}>{renderInline(text)}</h2>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flushList();
      const text = trimmed.slice(4);
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      elements.push(
        <h3 key={`h3-${i}`} id={id} style={{
          fontSize: '17px', fontWeight: 700, color: '#f5f5f7',
          letterSpacing: '-0.02em', marginTop: 28, marginBottom: 8,
          scrollMarginTop: 80,
        }}>{renderInline(text)}</h3>
      );
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      const text = trimmed.slice(2);
      elements.push(
        <blockquote key={`bq-${i}`} style={{
          borderLeft: '3px solid #a855f7', paddingLeft: 20, margin: '20px 0',
          color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', fontSize: '15px', lineHeight: 1.7,
        }}>
          {renderInline(text)}
        </blockquote>
      );
      i++;
      continue;
    }

    // Unordered list item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
      i++;
      continue;
    }

    // Ordered list item
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (orderedMatch) {
      orderedItems.push(orderedMatch[1]);
      i++;
      continue;
    }

    // Paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} style={{ fontSize: '15px', color: 'rgba(255,255,255,0.68)', lineHeight: 1.75, margin: '0 0 16px' }}>
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  flushList();
  return <>{elements}</>;
}

// ─── TOC ─────────────────────────────────────────────────────────────────────

function TableOfContents({ content }: { content: string }) {
  const headings = useMemo(() => {
    return content.split('\n')
      .filter(l => l.startsWith('## ') || l.startsWith('### '))
      .map(l => {
        const isH3 = l.startsWith('### ');
        const text = l.replace(/^#{2,3}\s/, '');
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return { text, id, level: isH3 ? 3 : 2 };
      });
  }, [content]);

  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-64px 0px -70% 0px' }
    );
    headings.forEach(h => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="Table of contents" style={{ position: 'sticky', top: 80, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
        On this page
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {headings.map(h => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={e => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' }); }}
              style={{
                display: 'block', padding: `5px ${h.level === 3 ? '16px' : '0'}`,
                paddingLeft: h.level === 3 ? 16 : 0,
                fontSize: '12px', lineHeight: 1.4,
                color: activeId === h.id ? '#a855f7' : 'rgba(255,255,255,0.4)',
                textDecoration: 'none',
                borderLeft: h.level === 3 ? `2px solid ${activeId === h.id ? '#a855f7' : 'rgba(255,255,255,0.08)'}` : 'none',
                transition: 'color 0.15s, border-color 0.15s',
                fontWeight: activeId === h.id ? 600 : 400,
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ─── Shared Navbar ─────────────────────────────────────────────────────────────

function BlogNavbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    setMousePos({ x: (clientX - window.innerWidth / 2) / 40, y: (clientY - window.innerHeight / 2) / 40 });
  };
  const particles = useMemo(() => Array.from({ length: 10 }).map((_, i) => ({
    id: i,
    x: 5 + (i * 31.7) % 90,
    y: 10 + (i * 41.3) % 80,
    size: 2 + (i % 3),
    delay: (i * 0.4) % 5,
    duration: 6 + (i % 5),
    color: i % 2 === 0 ? 'rgba(168,85,247,0.3)' : 'rgba(99,102,241,0.3)',
  })), []);

  return (
    <>
      {/* Interactive parallax dot grid */}
      <motion.div
        animate={{ x: mousePos.x, y: mousePos.y }}
        transition={{ ease: 'easeOut', duration: 0.4 }}
        onMouseMove={handleMouseMove}
        style={{
          position: 'fixed', inset: -40, zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1.2px, transparent 1.2px)',
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
          style={{ position: 'fixed', left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: '50%', background: p.color, boxShadow: `0 0 ${p.size * 3}px ${p.color}`, pointerEvents: 'none', zIndex: 0 }}
        />
      ))}
      {/* Ambient orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <motion.div animate={{ x: [0, 30, -20, 0], y: [0, -25, 30, 0], scale: [1, 1.1, 0.9, 1] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', top: '5%', left: '15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <motion.div animate={{ x: [0, -25, 30, 0], y: [0, 30, -20, 0], scale: [1, 0.9, 1.1, 1] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }} style={{ position: 'absolute', top: '50%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>
      {/* Navbar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          height: 60, borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(11,11,14,0.92)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
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
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Blog</span>
        <div style={{ flex: 1 }} />
        {user ? (
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none',
              borderRadius: 8, padding: '6px 14px', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}
          >
            Dashboard
          </button>
        ) : (
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '6px 14px', color: 'rgba(255,255,255,0.6)',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}
          >
            <ArrowLeft size={13} /> Home
          </button>
        )}
      </motion.header>
    </>
  );
}

// ─── Category Pill ─────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string }> = {
  Engineering: { bg: 'rgba(99,102,241,0.12)', text: '#818cf8', border: 'rgba(99,102,241,0.2)' },
  Security:    { bg: 'rgba(34,197,94,0.12)', text: '#4ade80', border: 'rgba(34,197,94,0.2)' },
  Product:     { bg: 'rgba(168,85,247,0.12)', text: '#c084fc', border: 'rgba(168,85,247,0.2)' },
  Tutorial:    { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
};

function CategoryPill({ category }: { category: Category }) {
  const colors = CATEGORY_COLORS[category];
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: 99,
      background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>{category}</span>
  );
}

// ─── Blog Index ─────────────────────────────────────────────────────────────────

function BlogIndex() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const searchRef = useRef<HTMLInputElement>(null);

  const categories: Array<string> = ['All', 'Product', 'Engineering', 'Security', 'Tutorial'];

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    document.title = 'Blog — TaskFlow | Product & Engineering Insights';
  }, []);

  const filtered = useMemo(() => BLOG_POSTS.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q) || p.tags.some(t => t.includes(q));
    const matchesCat = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCat;
  }), [searchQuery, activeCategory]);

  const featured = BLOG_POSTS.filter(p => p.featured);
  const showFeatured = !searchQuery && activeCategory === 'All';

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b0e', color: '#f5f5f7', fontFamily: 'Inter, sans-serif' }}>
      {/* Ambient background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '15%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <BlogNavbar />

      <main style={{ maxWidth: 1060, margin: '0 auto', padding: '48px 24px 100px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: 56 }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, letterSpacing: '-0.05em', margin: '0 0 14px', lineHeight: 1.1 }}>
            TaskFlow <span style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Blog</span>
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', maxWidth: 480, lineHeight: 1.6, margin: 0 }}>
            Practical insights on engineering velocity, team management, product thinking, and developer tools from the people building TaskFlow.
          </p>
        </motion.div>

        {/* Featured posts */}
        {showFeatured && featured.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: 64 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
              Featured
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: featured.length > 1 ? '1fr 1fr' : '1fr', gap: 20 }}>
              {featured.map((post, idx) => (
                <motion.article
                  key={post.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid rgba(255,255,255,0.08)`,
                    borderRadius: 18, padding: '28px', cursor: 'pointer',
                    position: 'relative', overflow: 'hidden',
                    transition: 'all 0.2s',
                  }}
                  whileHover={{ y: -4, borderColor: `${post.accentColor}40`, boxShadow: `0 16px 48px ${post.accentColor}15` }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${post.accentColor}, ${post.accentColor}66)` }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <CategoryPill category={post.category} />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {post.readTime} min read
                    </span>
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f5f5f7', letterSpacing: '-0.03em', lineHeight: 1.3, margin: '0 0 10px' }}>
                    {post.title}
                  </h2>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: '0 0 24px' }}>
                    {post.summary}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                        {post.author.avatar}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#f5f5f7' }}>{post.author.name}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{post.publishedAt}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: post.accentColor, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                      Read <ChevronRight size={13} />
                    </span>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.div>
        )}

        {/* Filters + Search */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                border: 'none', borderRadius: 99, padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                background: activeCategory === cat ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'rgba(255,255,255,0.04)',
                borderWidth: 1, borderStyle: 'solid', borderColor: activeCategory === cat ? 'transparent' : 'rgba(255,255,255,0.08)',
                color: activeCategory === cat ? '#fff' : 'rgba(255,255,255,0.45)',
              }}>{cat}</button>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '8px 12px',
            }}>
              <Search size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search posts…"
                style={{ background: 'none', border: 'none', outline: 'none', color: '#f5f5f7', fontSize: '13px', fontFamily: 'inherit', flex: 1 }}
              />
              {searchQuery ? (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <X size={13} />
                </button>
              ) : (
                <kbd style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 5px', fontFamily: 'inherit' }}>
                  ⌘K
                </kbd>
              )}
            </div>
          </div>
        </div>

        {/* Post grid */}
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
              {filtered.map((post, idx) => (
                <motion.article
                  key={post.slug}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  style={{
                    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 16, padding: '22px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
                    transition: 'all 0.2s',
                  }}
                  whileHover={{ y: -3, borderColor: 'rgba(168,85,247,0.2)', boxShadow: '0 10px 32px rgba(168,85,247,0.06)' }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: post.accentColor }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <CategoryPill category={post.category} />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Clock size={11} /> {post.readTime} min
                    </span>
                  </div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f5f5f7', letterSpacing: '-0.02em', lineHeight: 1.35, margin: '0 0 10px', flexGrow: 0 }}>
                    {post.title}
                  </h2>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.55, margin: '0 0 20px', flexGrow: 1 }}>
                    {post.summary}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0, overflow: 'hidden' }}>
                      {post.author.avatar.startsWith('http') ? (
                        <img src={post.author.avatar} alt={post.author.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        post.author.avatar
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#f5f5f7' }}>{post.author.name}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{post.publishedAt}</div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
              textAlign: 'center', padding: '80px 24px',
              border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 16,
            }}>
              <BookOpen size={44} style={{ color: 'rgba(255,255,255,0.12)', marginBottom: 16 }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>No articles found</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', marginBottom: 20 }}>
                Try a different category or search term.
              </div>
              <button onClick={() => { setSearchQuery(''); setActiveCategory('All'); }} style={{
                background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
                borderRadius: 8, padding: '8px 16px', color: '#c084fc', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Clear filters</button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── Blog Post View ─────────────────────────────────────────────────────────────

function BlogPostView({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const post = BLOG_POSTS.find(p => p.slug === slug);
  const scrollProgress = useScrollProgress();
  const { copied, copy } = useCopyToClipboard();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (post) {
      document.title = `${post.title} — TaskFlow Blog`;
    }
    window.scrollTo(0, 0);
  }, [post]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/blog');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  if (!post) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0b0e', color: '#f5f5f7', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <BookOpen size={48} style={{ color: 'rgba(255,255,255,0.2)' }} />
        <div style={{ fontSize: '18px', fontWeight: 700 }}>Article not found</div>
        <button onClick={() => navigate('/blog')} style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', borderRadius: 8, padding: '10px 20px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          ← Back to Blog
        </button>
      </div>
    );
  }

  const relatedPosts = BLOG_POSTS.filter(p => p.slug !== slug && p.category === post.category).slice(0, 2);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b0e', color: '#f5f5f7', fontFamily: 'Inter, sans-serif' }}>
      {/* Reading progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 100, background: 'rgba(255,255,255,0.04)' }}>
        <div style={{ height: '100%', background: `linear-gradient(90deg, ${post.accentColor}, #6366f1)`, width: `${scrollProgress}%`, transition: 'width 0.1s' }} />
      </div>

      <BlogNavbar />

      {/* Ambient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', right: '10%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${post.accentColor}08 0%, transparent 70%)`, filter: 'blur(40px)' }} />
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 48, alignItems: 'start' }}>
          {/* Main content */}
          <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ paddingTop: 48, paddingBottom: 100 }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
              <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', padding: 0 }}>Home</button>
              <ChevronRight size={12} />
              <button onClick={() => navigate('/blog')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', padding: 0 }}>Blog</button>
              <ChevronRight size={12} />
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{post.category}</span>
            </div>

            {/* Category + metadata */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <CategoryPill category={post.category} />
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} /> {post.publishedAt}
              </span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> {post.readTime} min read
              </span>
            </div>

            {/* Title */}
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.15, margin: '0 0 16px', color: '#f5f5f7' }}>
              {post.title}
            </h1>
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: '0 0 32px', fontWeight: 400 }}>
              {post.subtitle}
            </p>

            {/* Author */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, marginBottom: 40 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, overflow: 'hidden' }}>
                {post.author.avatar.startsWith('http') ? (
                  <img src={post.author.avatar} alt={post.author.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  post.author.avatar
                )}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f7', marginBottom: 2 }}>{post.author.name}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{post.author.role}</div>
              </div>
            </div>

            {/* Content */}
            <div>
              <MarkdownRenderer content={post.content} />
            </div>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 40, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <Tag size={13} style={{ color: 'rgba(255,255,255,0.3)', marginRight: 4, alignSelf: 'center' }} />
                {post.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: '11px', padding: '3px 10px', borderRadius: 99, fontWeight: 600,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace',
                  }}>#{tag}</span>
                ))}
              </div>
            )}

            {/* Share */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 32, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>Share:</span>
              <button onClick={() => copy(shareUrl)} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
                color: copied ? '#22c55e' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s',
              }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              <a href={twitterUrl} target="_blank" rel="noopener noreferrer" style={{
                background: 'rgba(29,161,242,0.08)', border: '1px solid rgba(29,161,242,0.2)',
                borderRadius: 8, padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: '12px', fontWeight: 600, textDecoration: 'none', color: '#1da1f2',
              }}>
                <Share2 size={13} /> Twitter
              </a>
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" style={{
                background: 'rgba(10,102,194,0.08)', border: '1px solid rgba(10,102,194,0.2)',
                borderRadius: 8, padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: '12px', fontWeight: 600, textDecoration: 'none', color: '#0a66c2',
              }}>
                <ExternalLink size={13} /> LinkedIn
              </a>
            </div>

            {/* Author bio */}
            <div style={{ marginTop: 48, padding: '24px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>About the Author</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                  {post.author.avatar}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f5f5f7', marginBottom: 4 }}>{post.author.name}</div>
                  <div style={{ fontSize: '12px', color: '#a855f7', fontWeight: 600, marginBottom: 8 }}>{post.author.role}</div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>{post.author.bio}</p>
                </div>
              </div>
            </div>

            {/* Related posts */}
            {relatedPosts.length > 0 && (
              <div style={{ marginTop: 56 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
                  More from {post.category}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: relatedPosts.length > 1 ? '1fr 1fr' : '1fr', gap: 16 }}>
                  {relatedPosts.map(related => (
                    <motion.div
                      key={related.slug}
                      onClick={() => navigate(`/blog/${related.slug}`)}
                      style={{
                        background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 12, padding: '18px', cursor: 'pointer',
                      }}
                      whileHover={{ y: -2, borderColor: 'rgba(168,85,247,0.2)' }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#f5f5f7', lineHeight: 1.35, marginBottom: 6 }}>{related.title}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {related.readTime} min read
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Back link */}
            <div style={{ marginTop: 64 }}>
              <button
                onClick={() => navigate('/blog')}
                style={{
                  background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 18px',
                  color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                }}
              >
                <ArrowLeft size={14} /> All posts
              </button>
            </div>
          </motion.article>

          {/* Right sidebar — TOC */}
          <div style={{ paddingTop: 120, display: 'block' }}>
            <TableOfContents content={post.content} />
          </div>
        </div>
      </div>

      {/* Back to top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              position: 'fixed', bottom: 32, right: 32, zIndex: 50,
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(168,85,247,0.9)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 8px 24px rgba(168,85,247,0.3)',
            }}
          >
            <ChevronUp size={20} color="white" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────────

export default function BlogPage() {
  const { slug } = useParams<{ slug?: string }>();
  return slug ? <BlogPostView slug={slug} /> : <BlogIndex />;
}
