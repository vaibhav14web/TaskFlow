/**
 * PricingPage — Standalone production-grade pricing page for TaskFlow
 *
 * Features:
 * - Animated hero with social proof stats
 * - Monthly/Yearly billing toggle with animated price transition
 * - 3-tier pricing cards with feature lists and highlighted differences
 * - Full feature comparison table (like Linear, Vercel, Stripe pricing pages)
 * - Per-seat calculator for Pro plan
 * - FAQ accordion section
 * - Trust/compliance badges (SOC2, GDPR, 99.9% SLA)
 * - Money-back guarantee callout
 * - CTA section at bottom
 * - Framer Motion animations throughout
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Zap, Check, X, ChevronDown, ArrowRight, Users, Shield,
  Clock, Star, Minus, HelpCircle, Building2, Sparkles,
  DollarSign, Globe, Lock, BarChart2, Webhook, Mail,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type BillingCycle = 'monthly' | 'yearly';

interface PlanFeature {
  name: string;
  free: string | boolean | null;
  pro: string | boolean | null;
  enterprise: string | boolean | null;
  tooltip?: string;
}

interface FAQItem {
  q: string;
  a: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRICES = {
  free:       { monthly: 0,    yearly: 0   },
  pro:        { monthly: 12,   yearly: 10  },
  enterprise: { monthly: null, yearly: null },
};

const FEATURE_TABLE: { category: string; features: PlanFeature[] }[] = [
  {
    category: 'Workspaces & Projects',
    features: [
      { name: 'Workspaces',             free: '1',          pro: 'Unlimited',   enterprise: 'Unlimited' },
      { name: 'Active projects',        free: '3',          pro: 'Unlimited',   enterprise: 'Unlimited' },
      { name: 'Archived projects',      free: '10',         pro: 'Unlimited',   enterprise: 'Unlimited' },
      { name: 'Workspace members',      free: '10',         pro: 'Unlimited',   enterprise: 'Unlimited' },
    ],
  },
  {
    category: 'Kanban & Tasks',
    features: [
      { name: 'Kanban boards',             free: true,   pro: true,        enterprise: true },
      { name: 'Custom columns',            free: '3',    pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Task priorities',           free: true,   pro: true,        enterprise: true },
      { name: 'Assignees per task',        free: '1',    pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'File attachments',          free: '5MB',  pro: '50MB',      enterprise: '1GB' },
      { name: 'Activity history',          free: '7 days', pro: '1 year',  enterprise: 'Unlimited' },
    ],
  },
  {
    category: 'Time Tracking & Billing',
    features: [
      { name: 'Time tracking',             free: true,  pro: true,    enterprise: true },
      { name: 'Manual time entries',       free: true,  pro: true,    enterprise: true },
      { name: 'Billing PDF export',        free: false, pro: true,    enterprise: true },
      { name: 'CSV export',                free: false, pro: true,    enterprise: true },
      { name: 'Custom hourly rates',       free: false, pro: true,    enterprise: true },
      { name: 'Per-member rate cards',     free: false, pro: false,   enterprise: true },
    ],
  },
  {
    category: 'Collaboration',
    features: [
      { name: 'Task comments',             free: true,  pro: true,    enterprise: true },
      { name: 'Member roles (Admin/Viewer)', free: false, pro: true,  enterprise: true },
      { name: 'Audit log',                 free: false, pro: '30 days', enterprise: 'Unlimited' },
      { name: 'Real-time updates',         free: true,  pro: true,    enterprise: true },
    ],
  },
  {
    category: 'Developer & API',
    features: [
      { name: 'REST API access',           free: false, pro: true,     enterprise: true },
      { name: 'API rate limit',            free: 'None', pro: '120/min', enterprise: '600/min' },
      { name: 'Webhooks',                  free: false, pro: false,    enterprise: 'Beta' },
      { name: 'OAuth / SSO (SAML, Okta)', free: false, pro: false,    enterprise: true },
      { name: 'Dedicated environments',    free: false, pro: false,    enterprise: true },
    ],
  },
  {
    category: 'Security & Compliance',
    features: [
      { name: '2FA / TOTP',                free: true,  pro: true,    enterprise: true },
      { name: 'SOC 2 Type II',             free: false, pro: false,   enterprise: true },
      { name: 'GDPR data processing',      free: true,  pro: true,    enterprise: true },
      { name: 'Custom data residency',     free: false, pro: false,   enterprise: true },
      { name: 'SLA guarantee',             free: '99%', pro: '99.9%', enterprise: '99.99%' },
    ],
  },
  {
    category: 'Support',
    features: [
      { name: 'Community support',         free: true,  pro: true,    enterprise: true },
      { name: 'Email support',             free: false, pro: true,    enterprise: true },
      { name: 'Priority support SLA',      free: false, pro: '24h',   enterprise: '4h' },
      { name: 'Dedicated account manager', free: false, pro: false,   enterprise: true },
      { name: 'Custom onboarding',         free: false, pro: false,   enterprise: true },
    ],
  },
];

const FAQS: FAQItem[] = [
  {
    q: 'Is the Free plan really free forever?',
    a: 'Yes. The Free plan is free forever with no credit card required. You get 1 workspace, 3 active projects, and up to 10 team members. It is designed for solo developers, freelancers, and small side projects.',
  },
  {
    q: 'How does per-seat billing work for Pro?',
    a: 'You pay for each active workspace member. If you have 6 members on Pro (yearly), you pay 6 × $10/month = $60/month billed annually. You can add or remove seats at any time — we prorate charges on the next billing cycle.',
  },
  {
    q: 'Can I change plans at any time?',
    a: 'Yes. You can upgrade at any time and the upgrade takes effect immediately. Downgrades take effect at the end of your current billing cycle. We never lock you in.',
  },
  {
    q: 'Do you offer a trial for Pro?',
    a: 'Yes — all new workspaces start with a 14-day Pro trial, no credit card required. After 14 days, the workspace moves to the Free plan unless you upgrade.',
  },
  {
    q: 'What happens to my data if I downgrade?',
    a: 'Your data is safe. You keep all existing tasks, boards, and time logs. Features above the Free plan\'s limits (e.g., extra projects, API access) become read-only until you upgrade again.',
  },
  {
    q: 'Is there a money-back guarantee?',
    a: 'Yes. We offer a 30-day money-back guarantee on all paid plans. If you are not satisfied for any reason, contact support within 30 days of your first payment and we will issue a full refund.',
  },
  {
    q: 'How does Enterprise pricing work?',
    a: 'Enterprise is custom-priced based on your team size, required SLA, and contract length. Most Enterprise customers are on annual contracts. Contact our sales team for a custom quote — typically responded to within 24 hours.',
  },
  {
    q: 'Do you offer discounts for nonprofits or startups?',
    a: 'Yes. We offer 50% off Pro for registered nonprofits and startups in their first year. Contact us with your organization\'s details and we will set up a discount code.',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function GlowOrb({ x, y, color, size = 500 }: { x: string; y: string; color: string; size?: number }) {
  return (
    <motion.div
      animate={{ x: [0, 30, -20, 0], y: [0, -25, 30, 0], scale: [1, 1.1, 0.9, 1] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute', left: x, top: y, width: size, height: size,
        borderRadius: '50%', background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        transform: 'translate(-50%, -50%)', pointerEvents: 'none', filter: 'blur(120px)',
      }}
    />
  );
}

function FloatingParticle({ x, y, size, delay, duration, color = 'rgba(168,85,247,0.35)' }: {
  x: number; y: number; size: number; delay: number; duration: number; color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: [0, 0.6, 0.8, 0.3, 0],
        y: [0, -80, -160, -240],
        x: [0, size * 6, size * -5, size * 7],
        scale: [0.5, 1.3, 0.9, 0.5],
      }}
      transition={{
        delay,
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size * 3}px ${color}`,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

function FeatureValue({ value }: { value: string | boolean | null }) {
  if (value === true)  return <Check size={16} style={{ color: '#22c55e' }} />;
  if (value === false) return <X size={16} style={{ color: 'rgba(255,255,255,0.15)' }} />;
  if (value === null)  return <Minus size={16} style={{ color: 'rgba(255,255,255,0.15)' }} />;
  return <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{value}</span>;
}

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, idx) => (
        <motion.div
          key={idx}
          initial={false}
          style={{
            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, overflow: 'hidden',
            borderColor: open === idx ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.07)',
            transition: 'border-color 0.2s',
          }}
        >
          <button
            onClick={() => setOpen(open === idx ? null : idx)}
            style={{
              width: '100%', padding: '18px 20px', background: 'none', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', fontFamily: 'inherit', gap: 16,
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f7', textAlign: 'left', lineHeight: 1.5 }}>{item.q}</span>
            <motion.div animate={{ rotate: open === idx ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0 }}>
              <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {open === idx && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '0 20px 20px', fontSize: '13.5px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                  {item.a}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

interface PlanCardProps {
  name: string;
  description: string;
  price: number | null;
  priceSuffix?: string;
  features: string[];
  ctaLabel: string;
  isPopular?: boolean;
  isEnterprise?: boolean;
  billingCycle: BillingCycle;
  yearlyNote?: string;
  onCta: () => void;
  delay?: number;
  accentColor?: string;
}

function PlanCard({
  name, description, price, priceSuffix = '/ member / month', features,
  ctaLabel, isPopular, isEnterprise, billingCycle, yearlyNote,
  onCta, delay = 0, accentColor = '#a855f7',
}: PlanCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        position: 'relative',
        background: isPopular
          ? 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(99,102,241,0.05))'
          : 'rgba(255,255,255,0.025)',
        border: isPopular ? '1px solid rgba(168,85,247,0.35)' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, padding: '36px 32px',
        display: 'flex', flexDirection: 'column',
        boxShadow: isPopular
          ? '0 16px 56px rgba(168,85,247,0.12), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 4px 24px rgba(0,0,0,0.2)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Popular badge */}
      {isPopular && (
        <div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #a855f7, #6366f1)',
          padding: '5px 18px', borderRadius: 99, fontSize: '11px', fontWeight: 750,
          color: '#fff', whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(168,85,247,0.4)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Star size={10} fill="white" /> MOST POPULAR
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#f5f5f7', marginBottom: 6 }}>{name}</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{description}</div>
      </div>

      {/* Price */}
      <div style={{ marginBottom: 28 }}>
        {price === null ? (
          <div>
            <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#f5f5f7', letterSpacing: '-0.04em', lineHeight: 1 }}>Custom</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>Annual contract, custom volume</div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>$</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={`${price}-${billingCycle}`}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.2 }}
                  style={{ fontSize: '2.8rem', fontWeight: 900, color: '#f5f5f7', letterSpacing: '-0.05em', lineHeight: 1 }}
                >
                  {price}
                </motion.span>
              </AnimatePresence>
            </div>
            {price > 0 ? (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>{priceSuffix}</div>
            ) : (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>forever free</div>
            )}
            {billingCycle === 'yearly' && price > 0 && yearlyNote && (
              <div style={{ marginTop: 6, fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>
                ✓ {yearlyNote}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feature list */}
      <ul style={{ padding: 0, margin: '0 0 32px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
            <Check size={14} style={{ color: isPopular ? '#c084fc' : '#a855f7', flexShrink: 0, marginTop: 1 }} />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <motion.button
        onClick={onCta}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%', padding: '13px',
          background: isPopular
            ? 'linear-gradient(135deg, #a855f7, #6366f1)'
            : isEnterprise
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(255,255,255,0.06)',
          border: isPopular ? 'none' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: '14px',
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: isPopular ? '0 8px 32px rgba(168,85,247,0.35)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          transition: 'all 0.2s',
        }}
      >
        {ctaLabel} {isEnterprise ? <ArrowRight size={14} /> : null}
      </motion.button>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [seatCount, setSeatCount] = useState(10);
  const [showTable, setShowTable] = useState(false);

  const goToAuth = useCallback(() => navigate('/auth'), [navigate]);
  const proPrice = PRICES.pro[billingCycle];
  const monthlyTotal = proPrice * seatCount;
  const annualTotal = monthlyTotal * 12;

  // Mouse Parallax coordinates for grid Tilt
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    setMousePos({
      x: (clientX - window.innerWidth / 2) / 35,
      y: (clientY - window.innerHeight / 2) / 35,
    });
  };

  // Generate background particles once
  const particles = useMemo(() => Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    x: 5 + (i * 27.3) % 90,
    y: 10 + (i * 35.7) % 80,
    size: 2 + (i % 4),
    delay: (i * 0.3) % 5,
    duration: 6 + (i % 5),
    color: i % 2 === 0 ? 'rgba(168,85,247,0.3)' : 'rgba(99,102,241,0.3)',
  })), []);

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
        <FloatingParticle key={p.id} {...p} />
      ))}

      {/* Ambient orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <GlowOrb x="10%" y="20%" color="rgba(168,85,247,0.07)" size={700} />
        <GlowOrb x="85%" y="35%" color="rgba(99,102,241,0.06)" size={600} />
        <GlowOrb x="45%" y="75%" color="rgba(168,85,247,0.05)" size={500} />
      </div>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: 64, borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(11,11,14,0.9)', backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #a855f7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={14} color="white" />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f5f5f7' }}>
            Task<span style={{ color: '#a855f7' }}>Flow</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 16px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Home</button>
          {user ? (
            <button onClick={() => navigate('/dashboard')} style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', borderRadius: 8, padding: '6px 16px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Dashboard</button>
          ) : (
            <button onClick={goToAuth} style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', borderRadius: 8, padding: '6px 16px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Get Started</button>
          )}
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── HERO ── */}
        <section style={{ padding: '80px 24px 60px', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 99, padding: '5px 14px 5px 8px', marginBottom: 24 }}>
              <Sparkles size={12} style={{ color: '#c084fc' }} />
              <span style={{ fontSize: '12px', color: '#c084fc', fontWeight: 600 }}>14-day Pro trial · No credit card required</span>
            </div>

            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', fontWeight: 900, letterSpacing: '-0.05em', margin: '0 0 16px', lineHeight: 1.1 }}>
              Simple, transparent pricing
            </h1>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.45)', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.7 }}>
              Start for free and scale as your team grows. No hidden fees, no surprise charges. Cancel or downgrade any time.
            </p>

            {/* Social proof */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 52, flexWrap: 'wrap' }}>
              {[
                { value: '10,000+', label: 'Active teams' },
                { value: '99.9%', label: 'Uptime SLA' },
                { value: '4.9/5', label: 'Average rating' },
                { value: '30-day', label: 'Money-back' },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #a855f7, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stat.value}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Billing toggle */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 99, padding: 4 }}>
              {(['monthly', 'yearly'] as BillingCycle[]).map(cycle => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  style={{
                    border: 'none', borderRadius: 99, padding: '8px 20px',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    background: billingCycle === cycle ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'transparent',
                    color: billingCycle === cycle ? '#fff' : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {cycle === 'yearly' ? 'Yearly' : 'Monthly'}
                  {cycle === 'yearly' && (
                    <span style={{ fontSize: '10px', background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>
                      Save 20%
                    </span>
                  )}
                </button>
              ))}
            </div>
            {billingCycle === 'yearly' && (
              <motion.div
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                style={{ fontSize: '12px', color: '#4ade80', marginTop: 12, fontWeight: 500 }}
              >
                ✓ Billed annually — save up to $24/member/year
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* ── PLAN CARDS ── */}
        <section style={{ padding: '0 24px 80px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'stretch' }}>
            <PlanCard
              name="Free"
              description="For solo developers, freelancers, and side projects that need a solid foundation."
              price={0}
              billingCycle={billingCycle}
              features={[
                '1 workspace',
                'Up to 3 active projects',
                'Up to 10 team members',
                'Kanban boards with 3 columns',
                'Basic time tracking',
                '7-day activity history',
                'Community support',
              ]}
              ctaLabel="Start for Free"
              onCta={goToAuth}
              delay={0.1}
            />
            <PlanCard
              name="Pro"
              description="For growing teams that need full power, unlimited projects, and advanced reporting."
              price={proPrice}
              billingCycle={billingCycle}
              yearlyNote="Save $24/member/year vs monthly"
              isPopular
              features={[
                'Unlimited workspaces & projects',
                'Unlimited team members',
                'Unlimited kanban columns',
                'Advanced time tracking & billing reports',
                'PDF & CSV export for client invoicing',
                'Custom task categories & tags',
                'Role-based access (Admin / Viewer)',
                '1-year activity history',
                'REST API access (120 req/min)',
                'Priority email support (24h SLA)',
              ]}
              ctaLabel="Start Pro Trial"
              onCta={goToAuth}
              delay={0.2}
            />
            <PlanCard
              name="Enterprise"
              description="For organizations requiring custom security, compliance, SLA guarantees and dedicated infrastructure."
              price={null}
              billingCycle={billingCycle}
              isEnterprise
              features={[
                'Everything in Pro',
                'SSO / SAML (Okta, Auth0, Azure AD)',
                'Dedicated database nodes',
                '99.99% guaranteed SLA contract',
                'Custom data residency (EU/US/APAC)',
                'SOC 2 Type II compliance reports',
                'Dedicated account manager',
                'Custom onboarding & training',
                'Per-member rate cards & billing',
                'API webhooks + custom integrations',
              ]}
              ctaLabel="Contact Sales"
              onCta={() => window.open('mailto:sales@taskflow.app?subject=Enterprise%20Inquiry', '_blank')}
              delay={0.3}
            />
          </div>
        </section>

        {/* ── PER-SEAT CALCULATOR ── */}
        <section style={{ padding: '0 24px 80px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{
                background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(168,85,247,0.15)',
                borderRadius: 20, padding: '36px 40px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <DollarSign size={18} style={{ color: '#c084fc' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f5f5f7', margin: 0 }}>Pro Plan Calculator</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: 28, marginTop: 6 }}>
                Estimate your monthly cost based on team size.
              </p>

              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Team members</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => setSeatCount(Math.max(1, seatCount - 1))} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f7', cursor: 'pointer', fontFamily: 'inherit', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#f5f5f7', minWidth: 40, textAlign: 'center' }}>{seatCount}</span>
                    <button onClick={() => setSeatCount(Math.min(500, seatCount + 1))} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f5f7', cursor: 'pointer', fontFamily: 'inherit', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
                <input
                  type="range" min={1} max={200} value={seatCount}
                  onChange={e => setSeatCount(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                  <span>1</span><span>50</span><span>100</span><span>200</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {[
                  { label: billingCycle === 'yearly' ? 'Monthly cost (billed annually)' : 'Monthly cost', value: `$${monthlyTotal.toLocaleString()}`, highlight: true },
                  { label: 'Per member / month', value: `$${proPrice}`, highlight: false },
                ].map(item => (
                  <div key={item.label} style={{ padding: '16px 18px', background: item.highlight ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.025)', border: `1px solid ${item.highlight ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12 }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: 6, fontWeight: 500 }}>{item.label}</div>
                    <AnimatePresence mode="wait">
                      <motion.div key={`${item.value}-${billingCycle}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ fontSize: '1.6rem', fontWeight: 900, color: item.highlight ? '#c084fc' : '#f5f5f7', letterSpacing: '-0.04em' }}>
                        {item.value}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {billingCycle === 'yearly' && (
                <div style={{ padding: '12px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10, fontSize: '13px', color: '#4ade80', fontWeight: 500 }}>
                  💰 You save <strong>${(seatCount * 24).toLocaleString()}/year</strong> vs monthly billing
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* ── TRUST BADGES ── */}
        <section style={{ padding: '0 24px 80px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}
            >
              {[
                { icon: Shield, label: 'SOC 2 Type II', desc: 'Enterprise plan', color: '#a855f7' },
                { icon: Globe, label: 'GDPR Compliant', desc: 'All plans', color: '#6366f1' },
                { icon: Lock, label: '2FA / TOTP', desc: 'All plans', color: '#22c55e' },
                { icon: Clock, label: '99.9% SLA', desc: 'Pro & Enterprise', color: '#f59e0b' },
                { icon: BarChart2, label: 'Transparent Billing', desc: 'No hidden fees', color: '#06b6d4' },
                { icon: Mail, label: '30-day Refund', desc: 'No questions asked', color: '#f43f5e' },
              ].map(badge => (
                <div key={badge.label} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${badge.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <badge.icon size={14} style={{ color: badge.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f5f5f7' }}>{badge.label}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{badge.desc}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── COMPARISON TABLE ── */}
        <section style={{ padding: '0 24px 80px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{ textAlign: 'center', marginBottom: 36 }}
            >
              <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, letterSpacing: '-0.04em', margin: '0 0 12px' }}>
                Compare all features
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
                Everything you get on each plan, clearly laid out.
              </p>
            </motion.div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '20px 24px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Feature</div>
                {['Free', 'Pro', 'Enterprise'].map((plan, i) => (
                  <div key={plan} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: i === 1 ? '#c084fc' : '#f5f5f7' }}>{plan}</div>
                    {i === 1 && <div style={{ fontSize: '10px', color: '#a855f7', fontWeight: 600 }}>POPULAR</div>}
                  </div>
                ))}
              </div>

              {/* Table body */}
              {FEATURE_TABLE.map((group, gi) => (
                <React.Fragment key={group.category}>
                  <div style={{ padding: '12px 24px', background: 'rgba(168,85,247,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', borderTop: gi > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)' }}>{group.category}</span>
                  </div>
                  {group.features.map((feat, fi) => (
                    <div
                      key={feat.name}
                      style={{
                        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                        padding: '13px 24px', borderBottom: fi < group.features.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        background: fi % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {feat.name}
                      </div>
                      {[feat.free, feat.pro, feat.enterprise].map((val, vi) => (
                        <div key={vi} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <FeatureValue value={val} />
                        </div>
                      ))}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ padding: '0 24px 80px' }}>
          <div style={{ maxWidth: 740, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{ textAlign: 'center', marginBottom: 40 }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: 99, padding: '4px 14px 4px 8px', marginBottom: 18 }}>
                <HelpCircle size={12} style={{ color: '#c084fc' }} />
                <span style={{ fontSize: '11px', color: '#c084fc', fontWeight: 600 }}>FAQ</span>
              </div>
              <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, letterSpacing: '-0.04em', margin: '0 0 12px' }}>
                Frequently asked questions
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
                Can't find your answer? <a href="mailto:support@taskflow.app" style={{ color: '#a855f7', textDecoration: 'none' }}>Email us</a>.
              </p>
            </motion.div>
            <FAQAccordion items={FAQS} />
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ padding: '0 24px 100px' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{
                background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(99,102,241,0.07))',
                border: '1px solid rgba(168,85,247,0.2)', borderRadius: 24, padding: '60px 48px',
                textAlign: 'center', boxShadow: '0 20px 80px rgba(168,85,247,0.08)',
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #a855f7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(168,85,247,0.35)' }}>
                <Zap size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 12px' }}>
                Start your free 14-day trial
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: '0 0 32px', lineHeight: 1.7 }}>
                Full Pro access for 14 days. No credit card required. Your workspace, your team, up and running in 5 minutes.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <motion.button
                  onClick={goToAuth}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                    border: 'none', borderRadius: 12, padding: '13px 28px',
                    color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 8px 32px rgba(168,85,247,0.4)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  Get Started Free <ArrowRight size={15} />
                </motion.button>
                <motion.button
                  onClick={() => window.open('mailto:sales@taskflow.app?subject=Enterprise%20Inquiry', '_blank')}
                  whileHover={{ scale: 1.02 }}
                  style={{
                    background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
                    padding: '13px 28px', color: 'rgba(255,255,255,0.7)', fontSize: '14px',
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <Building2 size={15} /> Talk to Sales
                </motion.button>
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: 20 }}>
                30-day money-back guarantee on all paid plans
              </p>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
            {[
              { label: 'Home', action: () => navigate('/') },
              { label: 'Blog', action: () => navigate('/blog') },
              { label: 'Docs', action: () => navigate('/docs') },
              { label: 'Privacy Policy', action: () => {} },
              { label: 'Terms of Service', action: () => {} },
            ].map(link => (
              <button key={link.label} onClick={link.action} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                {link.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>© 2026 TaskFlow. Built with ❤️ for engineering teams.</div>
        </footer>
      </div>
    </div>
  );
}
