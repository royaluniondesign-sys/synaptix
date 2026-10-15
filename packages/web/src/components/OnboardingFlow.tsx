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

interface Props {
  onComplete: () => void;
}

type Step = 0 | 1 | 2 | 3 | 4;

const TOTAL_STEPS = 5;

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
        <img src="/termora-logo.svg" alt="" style={{ width: 44, height: 44 }} />
      </div>

      <h1 style={{
        fontSize: 28, fontWeight: 700, color: S.text1,
        letterSpacing: -0.8, margin: '0 0 10px', textAlign: 'center',
      }}>
        Welcome to termora
      </h1>
      <p style={{
        fontSize: 14, color: S.text2, textAlign: 'center',
        lineHeight: 1.6, maxWidth: 280, margin: '0 0 32px',
      }}>
        Your terminal, tunnels, and agents — always in your pocket.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
        <FeatureRow icon="⚡" label="Real SSH terminal" desc="Full xterm, not a stripped-down shell" />
        <FeatureRow icon="🌐" label="Instant tunnels" desc="ngrok, SSH reverse — one tap" />
        <FeatureRow icon="🤖" label="Agent control" desc="Run Claude Code, OpenCode & more" />
        <FeatureRow icon="📱" label="PWA — install as app" desc="Works offline, opens instantly" />
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

function FeatureRow({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', background: S.surface2,
      border: `1px solid ${S.border}`, borderRadius: 10,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: S.text1, marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 11, color: S.text3 }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Step 1: How it works ─────────────────────────────────────────────────────

function StepHowItWorks({ onNext }: { onNext: () => void }) {
  const [copied, setCopied] = useState(false);
  const installCmd = 'npm install -g termora-agent && termora-agent start';

  const copy = () => {
    void navigator.clipboard.writeText(installCmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '28px 24px' }}>
      <StepHeader step={1} title="Install on your server" subtitle="termora runs a tiny agent on your Mac/Linux server that your phone connects to." />

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
        }}>
          <p style={{ fontSize: 11, color: S.text2, margin: 0, lineHeight: 1.5 }}>
            💡 <strong style={{ color: S.text1 }}>Already running?</strong> Skip ahead — just paste your token on the connect screen.
          </p>
        </div>
      </div>

      <NextButton onClick={onNext} label="Got it →" />
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

function StepShell({ onNext }: { onNext: (shell: string) => void }) {
  const [selected, setSelected] = useState('zsh');

  const shells = [
    { id: 'zsh', icon: '🐚', label: 'zsh', desc: 'Default on macOS Catalina+' },
    { id: 'bash', icon: '⚡', label: 'bash', desc: 'Classic Unix shell' },
    { id: 'fish', icon: '🐟', label: 'fish', desc: 'Smart, friendly shell' },
    { id: 'claude', icon: '🤖', label: 'claude', desc: 'Start a Claude Code agent directly' },
  ];

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
            <span style={{ fontSize: 22, flexShrink: 0 }}>{shell.icon}</span>
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

      <NextButton onClick={() => onNext(selected)} label="Continue →" />
    </div>
  );
}

// ── Step 3: Theme ────────────────────────────────────────────────────────────

function StepTheme({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState('obsidian');

  const themes = [
    { id: 'obsidian', label: 'Obsidian', preview: '#09090b', accent: '#a78bfa', desc: 'Pure dark, violet accent' },
    { id: 'midnight', label: 'Midnight', preview: '#030712', accent: '#60a5fa', desc: 'Deep black, blue accent' },
    { id: 'forest', label: 'Forest', preview: '#0a0f0a', accent: '#34d399', desc: 'Dark green, emerald tones' },
    { id: 'amber', label: 'Amber Retro', preview: '#0c0a00', accent: '#fbbf24', desc: 'Retro terminal, amber glow' },
  ];

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

      <NextButton onClick={onNext} label="Continue →" />
    </div>
  );
}

// ── Step 4: Done ─────────────────────────────────────────────────────────────

function StepDone({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  const tips = [
    { icon: '📋', text: 'Tap Dashboard → sessions grid, stats, tunnels at a glance' },
    { icon: '⌨️', text: 'Terminals → custom keyboard with per-key colors' },
    { icon: '🌐', text: 'Tunnels → expose local ports to the internet in one tap' },
    { icon: '⚙️', text: 'Settings → keyboard skins, themes, connection info' },
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
        marginBottom: 20,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={S.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
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
            <span style={{ fontSize: 16, flexShrink: 0 }}>{tip.icon}</span>
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
        Open termora →
      </button>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: S.primary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
        Step {step} of {TOTAL_STEPS - 1}
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: S.text1, letterSpacing: -0.4, margin: '0 0 6px' }}>{title}</h2>
      <p style={{ fontSize: 12, color: S.text2, margin: 0, lineHeight: 1.5 }}>{subtitle}</p>
    </div>
  );
}

function NextButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        marginTop: 20, width: '100%', height: 46, borderRadius: 12,
        border: 'none', background: S.primary, color: S.bg,
        fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        letterSpacing: -0.2, flexShrink: 0,
      }}
    >
      {label}
    </button>
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

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1) as Step);

  return (
    <div style={{
      height: '100%', background: S.bg,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <ProgressDots step={step} />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto',
        }}>
          {step === 0 && <StepWelcome onNext={next} />}
          {step === 1 && <StepHowItWorks onNext={next} />}
          {step === 2 && <StepShell onNext={(_shell) => next()} />}
          {step === 3 && <StepTheme onNext={next} />}
          {step === 4 && <StepDone onComplete={onComplete} />}
        </div>
      </div>
    </div>
  );
}
