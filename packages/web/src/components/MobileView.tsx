import { useState } from 'react';
import type { ConnectionStatus } from '../lib/ws-client';
import { T as S } from '../lib/design';

interface MobileViewProps { connectionStatus: ConnectionStatus; tunnelUrl: string | null; authToken?: string | null }

const serif = '"Instrument Serif", "Times New Roman", Georgia, serif';
const mono  = '"Geist Mono", "JetBrains Mono", ui-monospace, monospace';

export function MobileView({ connectionStatus, tunnelUrl }: MobileViewProps) {
  const [copied, setCopied] = useState(false);
  const isConnected = connectionStatus === 'connected';

  const copyLink = () => {
    if (tunnelUrl) {
      void navigator.clipboard.writeText(tunnelUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      overflow: 'auto', background: S.bg,
    }}>

      {/* ── Hero band ── */}
      <div style={{
        background: '#7170ff', borderBottom: '3px solid #09090b',
        padding: '52px 48px 48px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Label */}
        <div style={{
          display: 'inline-block',
          background: '#09090b', color: '#fafafa',
          padding: '6px 10px', marginBottom: 28,
          fontFamily: mono, fontSize: 10, fontWeight: 500,
          letterSpacing: '0.09em', textTransform: 'uppercase',
        }}>
          Synaptix Mobile · Early Alpha · PWA installable
        </div>

        {/* Big serif headline */}
        <h1 style={{
          fontFamily: serif, fontWeight: 400,
          fontSize: 'clamp(3.2rem, 8vw, 7rem)', lineHeight: 0.88,
          letterSpacing: '-0.03em', margin: '0 0 36px',
          color: '#09090b',
        }}>
          Your machine,<br />
          <em style={{ fontStyle: 'italic', color: '#fafafa', textShadow: '0.03em 0.03em 0 #09090b' }}>
            in your hands.
          </em>
        </h1>

        {/* Lede */}
        <p style={{
          fontFamily: 'Geist, system-ui, sans-serif',
          fontSize: 'clamp(1rem, 1.8vw, 1.3rem)', fontWeight: 500,
          lineHeight: 1.3, letterSpacing: '-0.015em',
          color: '#09090b', margin: '0 0 36px', maxWidth: '28em',
        }}>
          Monitor Claude, Codex, Hermes and every other agent from any phone or tablet. Real terminals. No cloud lock-in.
        </p>

        {/* CTA */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {tunnelUrl ? (
            <a href={tunnelUrl} target="_blank" rel="noreferrer" style={{
              display: 'inline-block',
              background: '#09090b', color: '#fafafa',
              fontFamily: 'Geist, system-ui, sans-serif',
              fontSize: '1rem', fontWeight: 600, lineHeight: 1,
              padding: '18px 26px',
              border: '3px solid #09090b',
              boxShadow: '7px 7px 0 #fafafa',
              textDecoration: 'none',
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}>
              Open on phone ↗
            </a>
          ) : (
            <div style={{
              display: 'inline-block',
              background: 'rgba(0,0,0,0.18)', color: '#09090b',
              fontFamily: 'Geist, system-ui, sans-serif',
              fontSize: '1rem', fontWeight: 600, lineHeight: 1,
              padding: '18px 26px',
              border: '3px solid #09090b',
            }}>
              Start with TUNNEL=ngrok
            </div>
          )}
          <button type="button" onClick={copyLink} style={{
            display: 'inline-block',
            background: '#fafafa', color: '#09090b',
            fontFamily: 'Geist, system-ui, sans-serif',
            fontSize: '1rem', fontWeight: 600, lineHeight: 1,
            padding: '18px 26px',
            border: '3px solid #09090b',
            boxShadow: '7px 7px 0 #09090b',
            cursor: 'pointer',
            transition: 'transform 0.1s, box-shadow 0.1s',
          }}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>

      {/* ── Status + How-to grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        border: '3px solid #09090b',
        borderTop: 'none',
      }}>

        {/* Status card */}
        <div style={{
          padding: '28px 28px 32px',
          borderRight: '3px solid #09090b',
          background: S.surface,
        }}>
          <div style={{
            fontFamily: mono, fontSize: 9, fontWeight: 500,
            letterSpacing: '0.09em', textTransform: 'uppercase',
            color: S.text3, marginBottom: 16,
          }}>
            Connection
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: isConnected ? '#10b981' : '#ef4444',
              boxShadow: isConnected ? '0 0 0 3px rgba(16,185,129,0.2)' : '0 0 0 3px rgba(239,68,68,0.2)',
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: serif, fontSize: '1.4rem', fontWeight: 400,
              color: S.text1, lineHeight: 1,
            }}>
              {isConnected ? 'Agent online' : 'Agent offline'}
            </span>
          </div>

          {tunnelUrl ? (
            <div style={{
              fontFamily: mono, fontSize: 10,
              color: S.text3, wordBreak: 'break-all',
              padding: '8px 10px',
              background: S.surface2, border: `1px solid ${S.border}`,
              marginBottom: 14,
            }}>
              {tunnelUrl}
            </div>
          ) : (
            <div style={{
              fontFamily: mono, fontSize: 10,
              color: S.text3, padding: '8px 10px',
              background: S.surface2, border: `1px solid ${S.border}`,
              marginBottom: 14,
            }}>
              No tunnel URL yet
            </div>
          )}

          {/* Platform pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { name: 'iOS · Safari', icon: '🍎' },
              { name: 'Android · Chrome', icon: '🤖' },
              { name: 'Desktop · PWA', icon: '🖥' },
            ].map(({ name, icon }) => (
              <span key={name} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 10px',
                fontFamily: mono, fontSize: 9,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                border: `2px solid ${S.border}`,
                color: S.text2,
              }}>
                {icon} {name}
              </span>
            ))}
          </div>
        </div>

        {/* Add to Home Screen */}
        <div style={{
          padding: '28px 28px 32px',
          borderRight: '3px solid #09090b',
          background: S.surface2,
        }}>
          <div style={{
            fontFamily: mono, fontSize: 9, fontWeight: 500,
            letterSpacing: '0.09em', textTransform: 'uppercase',
            color: S.text3, marginBottom: 16,
          }}>
            Add to Home Screen
          </div>

          <h3 style={{
            fontFamily: serif, fontWeight: 400,
            fontSize: '1.8rem', lineHeight: 0.95,
            letterSpacing: '-0.02em', margin: '0 0 20px',
            color: S.text1,
          }}>
            Install the<br /><em style={{ fontStyle: 'italic', color: '#9a99ff' }}>PWA</em>
          </h3>

          {[
            { platform: 'Safari (iOS)', steps: 'Tap Share → Add to Home Screen' },
            { platform: 'Chrome (Android)', steps: 'Menu ⋮ → Add to Home screen' },
            { platform: 'Chrome (Desktop)', steps: 'Address bar → Install app icon' },
          ].map(({ platform, steps }, i) => (
            <div key={platform} style={{
              display: 'grid', gridTemplateColumns: '1.2rem 1fr',
              gap: '4px 10px', padding: '12px 0',
              borderTop: i === 0 ? `2px solid ${S.border}` : `2px solid ${S.border}`,
            }}>
              <span style={{
                fontFamily: serif, fontSize: '1rem', color: '#7170ff',
                lineHeight: 1.4,
              }}>
                {i + 1}
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: S.text1, marginBottom: 2 }}>{platform}</div>
                <div style={{ fontFamily: mono, fontSize: 9, color: S.text3, letterSpacing: '0.04em' }}>{steps}</div>
              </div>
            </div>
          ))}
        </div>

        {/* What you can do */}
        <div style={{ padding: '28px 28px 32px', background: S.surface }}>
          <div style={{
            fontFamily: mono, fontSize: 9, fontWeight: 500,
            letterSpacing: '0.09em', textTransform: 'uppercase',
            color: S.text3, marginBottom: 16,
          }}>
            From your phone
          </div>

          <h3 style={{
            fontFamily: serif, fontWeight: 400,
            fontSize: '1.8rem', lineHeight: 0.95,
            letterSpacing: '-0.02em', margin: '0 0 20px',
            color: S.text1,
          }}>
            Real control,<br /><em style={{ fontStyle: 'italic', color: '#9a99ff' }}>anywhere</em>
          </h3>

          {[
            { title: 'Live terminal output', desc: 'Stream real PTY sessions from any agent' },
            { title: 'Session management', desc: 'Create, rename, close and resume sessions' },
            { title: 'Agent status', desc: 'See which agents are running and their state' },
            { title: 'Notifications', desc: 'Know when a task finishes or needs input' },
          ].map(({ title, desc }, i) => (
            <div key={title} style={{
              padding: '13px 0',
              borderTop: `2px solid ${S.border}`,
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: i === 0 ? '#7170ff' : S.surface3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" stroke={i === 0 ? '#fff' : S.text3} fill="none" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: S.text1, marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 11, color: S.text3, lineHeight: 1.4 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Run it strip ── */}
      <div style={{
        borderTop: '3px solid #09090b',
        background: '#09090b', color: '#fafafa',
        padding: '28px 48px',
        display: 'flex', alignItems: 'center', gap: 32,
        flexWrap: 'wrap',
      }}>
        <div style={{
          fontFamily: serif, fontSize: '1.6rem', fontWeight: 400,
          lineHeight: 1, color: '#fafafa', flexShrink: 0,
        }}>
          Run it
        </div>
        <code style={{
          fontFamily: mono, fontSize: 13,
          color: '#9a99ff', background: '#18181b',
          padding: '10px 16px', border: '2px solid #3f3f46',
          letterSpacing: '0.03em',
        }}>
          TUNNEL=ngrok npm run dev
        </code>
        <span style={{ fontFamily: mono, fontSize: 10, color: '#52525b', letterSpacing: '0.06em' }}>
          THEN SCAN THE QR CODE PRINTED IN YOUR TERMINAL
        </span>
      </div>
    </div>
  );
}
