import { useState, useEffect } from 'react';

const S = {
  bg: '#09090b',
  surface: '#0c0c0f',
  surface2: '#18181b',
  surface3: '#27272a',
  border: '#27272a',
  primary: '#a78bfa',
  primaryDim: '#a78bfa22',
  success: '#34d399',
  text1: '#fafafa',
  text2: '#a1a1aa',
  text3: '#71717a',
} as const;

const SHELL_KEY = 'synaptix_shell';
const THEME_KEY = 'synaptix_theme';

interface Props {
  onComplete: () => void;
}

type Step = 0 | 1 | 2 | 3 | 4;

const TOTAL_STEPS = 5;

// ── CSS keyframes injected once ──────────────────────────────────────────────

const SLIDE_CSS = `
@keyframes slide-in-fwd { from { transform: translateX(28px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes slide-in-back { from { transform: translateX(-28px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
`;

// ── SVG icon primitives ──────────────────────────────────────────────────────

function IconTerminal() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconCpu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="6" height="6" />
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <line x1="9" y1="2" x2="9" y2="6" /><line x1="15" y1="2" x2="15" y2="6" />
      <line x1="9" y1="18" x2="9" y2="22" /><line x1="15" y1="18" x2="15" y2="22" />
      <line x1="2" y1="9" x2="6" y2="9" /><line x1="2" y1="15" x2="6" y2="15" />
      <line x1="18" y1="9" x2="22" y2="9" /><line x1="18" y1="15" x2="22" y2="15" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
    </svg>
  );
}

function IconLayout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function IconKeyboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <line x1="6" y1="10" x2="6.01" y2="10" strokeWidth="2.5" />
      <line x1="10" y1="10" x2="10.01" y2="10" strokeWidth="2.5" />
      <line x1="14" y1="10" x2="14.01" y2="10" strokeWidth="2.5" />
      <line x1="18" y1="10" x2="18.01" y2="10" strokeWidth="2.5" />
      <line x1="6" y1="14" x2="18" y2="14" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" />
    </svg>
  );
}

function IconCheck({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Step 0: Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, padding: '32px 24px',
      opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(10px)',
      transition: 'opacity 400ms ease, transform 400ms ease',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 18,
        background: `linear-gradient(135deg, ${S.primary}22, ${S.primary}08)`,
        border: `1.5px solid ${S.primary}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
        boxShadow: `0 0 32px ${S.primary}18`,
      }}>
        <img src="/synaptix-logo.svg" alt="" style={{ width: 44, height: 44 }} />
      </div>

      <h1 style={{
        fontSize: 28, fontWeight: 700, color: S.text1,
        letterSpacing: -0.8, margin: '0 0 10px', textAlign: 'center',
      }}>
        Welcome to Synaptix
      </h1>
      <p style={{
        fontSize: 14, color: S.text2, textAlign: 'center',
        lineHeight: 1.6, maxWidth: 280, margin: '0 0 32px',
      }}>
        Your terminal, tunnels, and agents — always in your pocket.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
        <FeatureRow color={S.primary} icon={<IconTerminal />} label="Real terminal" desc="Full xterm, not a stripped-down shell" />
        <FeatureRow color="#60a5fa" icon={<IconGlobe />} label="Reach it from your phone" desc="SSH or ngrok tunnel, or your own network" />
        <FeatureRow color="#f472b6" icon={<IconCpu />} label="Agent control" desc="Run Claude Code, OpenCode & more" />
        <FeatureRow color={S.success} icon={<IconPhone />} label="PWA — install as app" desc="Add it to your home screen" />
      </div>

      <button
        type="button"
        onClick={onNext}
        style={{
          marginTop: 36, width: '100%', maxWidth: 300, height: 46, borderRadius: 12,
          border: 'none', background: S.primary, color: S.bg,
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          letterSpacing: -0.2,
        }}
      >
        Get Started →
      </button>
    </div>
  );
}

function FeatureRow({ icon, label, desc, color }: { icon: React.ReactNode; label: string; desc: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', background: S.surface2,
      border: `1px solid ${S.border}`, borderRadius: 10,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: `${color}14`,
        border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: S.text1, marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 11, color: S.text3 }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Step 1: How it works ─────────────────────────────────────────────────────

function StepHowItWorks({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  const installCmd = 'npm install -g synaptix-agent && synaptix-agent start';

  const copy = () => {
    void navigator.clipboard.writeText(installCmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '28px 24px' }}>
      <StepHeader step={1} title="Install on your server" subtitle="Synaptix runs a tiny agent on your Mac/Linux server that your phone connects to." />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
        <StepCard num="1" title="Open Terminal on your server">
          <p style={{ fontSize: 12, color: S.text2, margin: 0, lineHeight: 1.5 }}>
            On your Mac or Linux machine — the one you want to control remotely.
          </p>
        </StepCard>

        <StepCard num="2" title="Run the install command">
          <div style={{
            background: S.bg, border: `1px solid ${S.border}`, borderRadius: 8,
            padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <code style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: 10, color: S.primary, flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {installCmd}
            </code>
            <button
              type="button"
              onClick={copy}
              style={{
                flexShrink: 0, height: 26, padding: '0 10px', borderRadius: 6,
                border: `1px solid ${S.border}`, background: copied ? S.success : S.surface3,
                color: copied ? S.bg : S.text2, fontSize: 10, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms',
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </StepCard>

        <StepCard num="3" title="Scan the QR code or paste the token">
          <p style={{ fontSize: 12, color: S.text2, margin: 0, lineHeight: 1.5 }}>
            The agent shows a QR code in your terminal. Scan it from this app, or copy the token manually.
          </p>
        </StepCard>

        <div style={{
          background: `${S.primary}08`, border: `1px solid ${S.primary}25`,
          borderRadius: 10, padding: '12px 14px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <div style={{ color: S.primary, marginTop: 1, flexShrink: 0 }}>
            <IconInfo />
          </div>
          <p style={{ fontSize: 11, color: S.text2, margin: 0, lineHeight: 1.5 }}>
            <strong style={{ color: S.text1 }}>Already running?</strong> Skip ahead — just paste your token on the connect screen.
          </p>
        </div>
      </div>

      <StepActions onNext={onNext} onBack={onBack} label="Got it →" />
    </div>
  );
}

function StepCard({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 10, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%',
          background: S.primary, color: S.bg,
          fontSize: 10, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>{num}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: S.text1 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Step 2: Shell preference ─────────────────────────────────────────────────

function ShellBadge({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
      background: `${color}12`, border: `1px solid ${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <code style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize: 10, fontWeight: 700, color,
      }}>{label}</code>
    </div>
  );
}

function AgentBadge() {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
      background: `${S.primary}12`, border: `1px solid ${S.primary}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: S.primary,
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4z" />
        <rect x="6" y="8" width="12" height="10" rx="2" />
        <circle cx="9" cy="13" r="1" fill="currentColor" />
        <circle cx="15" cy="13" r="1" fill="currentColor" />
      </svg>
    </div>
  );
}

function StepShell({ onNext, onBack }: { onNext: (shell: string) => void; onBack: () => void }) {
  const [selected, setSelected] = useState(() => {
    try { return localStorage.getItem(SHELL_KEY) ?? 'zsh'; } catch { return 'zsh'; }
  });

  const shells = [
    { id: 'zsh', badge: <ShellBadge label="%" color={S.success} />, label: 'zsh', desc: 'Default on macOS Catalina+' },
    { id: 'bash', badge: <ShellBadge label="$" color="#60a5fa" />, label: 'bash', desc: 'Classic Unix shell' },
    { id: 'fish', badge: <ShellBadge label="~" color="#fbbf24" />, label: 'fish', desc: 'Smart, friendly shell' },
    { id: 'claude', badge: <AgentBadge />, label: 'claude', desc: 'Start a Claude Code agent directly' },
  ];

  const handleNext = () => {
    try { localStorage.setItem(SHELL_KEY, selected); } catch { /* storage unavailable */ }
    onNext(selected);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '28px 24px' }}>
      <StepHeader step={2} title="Your default shell" subtitle="What opens when you create a new terminal session?" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
        {shells.map((shell) => (
          <button
            key={shell.id}
            type="button"
            onClick={() => setSelected(shell.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', background: selected === shell.id ? S.primaryDim : S.surface2,
              border: `1.5px solid ${selected === shell.id ? S.primary : S.border}`,
              borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              textAlign: 'left', transition: 'all 120ms',
            }}
          >
            {shell.badge}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.text1 }}>{shell.label}</div>
              <div style={{ fontSize: 11, color: S.text3, marginTop: 1 }}>{shell.desc}</div>
            </div>
            {selected === shell.id && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={S.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
        <p style={{ fontSize: 11, color: S.text3, textAlign: 'center', margin: '8px 0 0' }}>
          You can change this anytime in Settings.
        </p>
      </div>

      <StepActions onNext={handleNext} onBack={onBack} label="Continue →" />
    </div>
  );
}

// ── Step 3: Theme ────────────────────────────────────────────────────────────

function StepTheme({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [selected, setSelected] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) ?? 'obsidian'; } catch { return 'obsidian'; }
  });

  const themes = [
    { id: 'obsidian', label: 'Obsidian', preview: '#09090b', accent: '#a78bfa', desc: 'Pure dark, violet accent' },
    { id: 'midnight', label: 'Midnight', preview: '#030712', accent: '#60a5fa', desc: 'Deep black, blue accent' },
    { id: 'forest', label: 'Forest', preview: '#0a0f0a', accent: '#34d399', desc: 'Dark green, emerald tones' },
    { id: 'amber', label: 'Amber Retro', preview: '#0c0a00', accent: '#fbbf24', desc: 'Retro terminal, amber glow' },
  ];

  const handleNext = () => {
    try { localStorage.setItem(THEME_KEY, selected); } catch { /* storage unavailable */ }
    onNext();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '28px 24px' }}>
      <StepHeader step={3} title="Pick your theme" subtitle="The look and feel of your terminal workspace." />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
        {themes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 14px', background: selected === t.id ? S.primaryDim : S.surface2,
              border: `1.5px solid ${selected === t.id ? S.primary : S.border}`,
              borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              textAlign: 'left', transition: 'all 120ms',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: t.preview,
              border: `2px solid ${t.accent}60`, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: t.accent }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: S.text1 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: S.text3, marginTop: 1 }}>{t.desc}</div>
            </div>
            {selected === t.id && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={S.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
        <p style={{ fontSize: 11, color: S.text3, textAlign: 'center', margin: '8px 0 0' }}>
          More themes available in Settings.
        </p>
      </div>

      <StepActions onNext={handleNext} onBack={onBack} label="Continue →" />
    </div>
  );
}

// ── Step 4: Done ─────────────────────────────────────────────────────────────

function StepDone({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  const tips: { icon: React.ReactNode; color: string; text: string }[] = [
    { icon: <IconLayout />, color: S.primary, text: 'Dashboard → sessions grid, stats, tunnels at a glance' },
    { icon: <IconKeyboard />, color: '#60a5fa', text: 'Terminals → custom keyboard with per-key colors' },
    { icon: <IconActivity />, color: S.success, text: 'Ports → see what is listening on this machine' },
    { icon: <IconSliders />, color: '#fbbf24', text: 'Settings → keyboard skins, themes, connection info' },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, padding: '32px 24px',
      opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(10px)',
      transition: 'opacity 400ms ease, transform 400ms ease',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: `${S.success}15`, border: `1.5px solid ${S.success}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, color: S.success,
      }}>
        <IconCheck size={28} />
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: S.text1, letterSpacing: -0.5, margin: '0 0 8px', textAlign: 'center' }}>
        All set!
      </h2>
      <p style={{ fontSize: 13, color: S.text2, textAlign: 'center', margin: '0 0 28px', lineHeight: 1.5, maxWidth: 260 }}>
        Connect your server and start working. Here's a quick map:
      </p>

      <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {tips.map((tip, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', background: S.surface2,
            border: `1px solid ${S.border}`, borderRadius: 10,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7, flexShrink: 0,
              background: `${tip.color}12`, border: `1px solid ${tip.color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: tip.color,
            }}>
              {tip.icon}
            </div>
            <span style={{ fontSize: 11, color: S.text2, lineHeight: 1.4 }}>{tip.text}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onComplete}
        style={{
          width: '100%', maxWidth: 300, height: 46, borderRadius: 12,
          border: 'none', background: S.primary, color: S.bg,
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          letterSpacing: -0.2,
        }}
      >
        Open Synaptix →
      </button>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: S.primary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
        Step {step} of {TOTAL_STEPS - 2}
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: S.text1, letterSpacing: -0.4, margin: '0 0 6px' }}>{title}</h2>
      <p style={{ fontSize: 12, color: S.text2, margin: 0, lineHeight: 1.5 }}>{subtitle}</p>
    </div>
  );
}

function StepActions({ onNext, onBack, label }: { onNext: () => void; onBack: () => void; label: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 20, flexShrink: 0 }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          border: `1.5px solid ${S.border}`, background: S.surface2,
          color: S.text2, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 120ms, color 120ms',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = S.primary;
          (e.currentTarget as HTMLButtonElement).style.color = S.primary;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = S.border;
          (e.currentTarget as HTMLButtonElement).style.color = S.text2;
        }}
        aria-label="Go back"
      >
        ←
      </button>
      <button
        type="button"
        onClick={onNext}
        style={{
          flex: 1, height: 46, borderRadius: 12,
          border: 'none', background: S.primary, color: S.bg,
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          letterSpacing: -0.2,
        }}
      >
        {label}
      </button>
    </div>
  );
}

// ── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: Step }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 6, padding: '14px 0 8px',
    }}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === step ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i <= step ? S.primary : S.surface3,
            transition: 'all 200ms ease',
          }}
        />
      ))}
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [slideDir, setSlideDir] = useState<'fwd' | 'back'>('fwd');

  const next = () => {
    setSlideDir('fwd');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1) as Step);
  };

  const back = () => {
    setSlideDir('back');
    setStep((s) => Math.max(s - 1, 0) as Step);
  };

  return (
    <div style={{
      height: '100%', background: S.bg,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <style>{SLIDE_CSS}</style>
      <ProgressDots step={step} />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div
          key={step}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto',
            animation: `${slideDir === 'fwd' ? 'slide-in-fwd' : 'slide-in-back'} 220ms ease both`,
          }}
        >
          {step === 0 && <StepWelcome onNext={next} />}
          {step === 1 && <StepHowItWorks onNext={next} onBack={back} />}
          {step === 2 && <StepShell onNext={() => next()} onBack={back} />}
          {step === 3 && <StepTheme onNext={next} onBack={back} />}
          {step === 4 && <StepDone onComplete={onComplete} />}
        </div>
      </div>
    </div>
  );
}
