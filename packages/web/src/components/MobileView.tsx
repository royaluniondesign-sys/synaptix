import { useState } from 'react';
import type { ConnectionStatus } from '../lib/ws-client';
import { T as S } from '../lib/design';

interface MobileViewProps { connectionStatus: ConnectionStatus; tunnelUrl: string | null; authToken?: string | null }

export function MobileView({ connectionStatus, tunnelUrl }: MobileViewProps) {
  const [copied, setCopied] = useState(false);
  const isConnected = connectionStatus === 'connected';

  const copyLink = () => {
    if (tunnelUrl) {
      void navigator.clipboard.writeText(tunnelUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }
  };

  return (
    <div style={{
      height: '100%', display: 'flex', overflow: 'hidden',
      background: S.bg,
      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
      position: 'relative',
    }}>
      {/* Left: Hero */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '0 48px',
        minWidth: 0,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 1.5,
          textTransform: 'uppercase', color: S.text3, marginBottom: 20,
        }}>
          Synaptix Mobile
        </div>

        <h1 style={{
          fontSize: 40, fontWeight: 700, color: S.text1,
          margin: '0 0 18px', lineHeight: 1.15, letterSpacing: -1,
          maxWidth: 420,
        }}>
          Your agent sessions,<br />in your pocket.
        </h1>

        <p style={{
          fontSize: 15, color: S.text2, lineHeight: 1.65,
          maxWidth: 400, margin: '0 0 28px',
        }}>
          Monitor Claude agents from your phone. Check terminal output, review diffs, and trigger tasks while you're away from your desk.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <span style={{ fontSize: 12, color: S.text3 }}>Coming to</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            background: S.surface2, border: `1px solid ${S.border}`,
            fontSize: 12, color: S.text2,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            iOS
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            background: S.surface2, border: `1px solid ${S.border}`,
            fontSize: 12, color: S.text2,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.341l-.012-.009L12.5 5l-.003.002L7.489 15.33l-.012.01A6.023 6.023 0 0 0 6 19a6 6 0 0 0 6 6 6 6 0 0 0 6-6 6.023 6.023 0 0 0-1.477-3.659z"/></svg>
            Android
          </span>
        </div>

        {tunnelUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a
              href={tunnelUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                height: 40, padding: '0 20px', borderRadius: 8,
                background: S.text1, color: S.bg,
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}
            >
              Open on phone
              <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <button type="button" onClick={copyLink} style={{
              height: 40, padding: '0 16px', borderRadius: 8,
              border: `1px solid ${S.border}`, background: 'transparent',
              color: copied ? S.success : S.text2,
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>{copied ? 'Copied!' : 'Copy link'}</button>
          </div>
        ) : (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 8,
            background: S.surface2, border: `1px solid ${S.border}`,
            fontSize: 12, color: S.text3,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" stroke={S.text3} fill="none" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Start agent with <code style={{ fontFamily: 'monospace', color: S.text1 }}>TUNNEL=ngrok</code> to get a shareable link
          </div>
        )}
      </div>

      {/* Right: Info card */}
      <div style={{
        width: 300, margin: '32px 32px 32px 0', flexShrink: 0,
        background: S.surface,
        borderRadius: 14, border: `1px solid ${S.border}`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Card header */}
        <div style={{
          padding: '16px 18px 14px',
          borderBottom: `1px solid ${S.border2}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: S.surface3,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={S.text2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: S.text1 }}>Mobile Companion</div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Connection */}
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${S.border2}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: S.text3, marginBottom: 10 }}>Connection</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: S.surface2, borderRadius: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isConnected ? S.success : S.error, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: S.text1, fontWeight: 500 }}>{isConnected ? 'Agent online' : 'Agent offline'}</div>
                {tunnelUrl && <div style={{ fontSize: 10, color: S.text3, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tunnelUrl}</div>}
              </div>
              {tunnelUrl && (
                <button type="button" onClick={copyLink} style={{
                  padding: '3px 8px', borderRadius: 4, border: `1px solid ${S.border}`,
                  background: 'transparent', color: S.text3, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
                }}>{copied ? '✓' : 'Copy'}</button>
              )}
            </div>
          </div>

          {/* Add to Home Screen */}
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${S.border2}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: S.text3, marginBottom: 10 }}>Add to Home Screen</div>
            {[
              { platform: 'Safari (iOS)', icon: '🍎', steps: 'Share (□↑) → Add to Home Screen' },
              { platform: 'Chrome (Android)', icon: '🤖', steps: '⋮ menu → Add to Home screen' },
            ].map(({ platform, icon, steps }) => (
              <div key={platform} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: S.text1 }}>{platform}</div>
                  <div style={{ fontSize: 10, color: S.text3, marginTop: 2, lineHeight: 1.4 }}>{steps}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: S.text3, marginBottom: 10 }}>Quick Actions</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {tunnelUrl ? (
                <a href={tunnelUrl} target="_blank" rel="noreferrer" style={{
                  flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  borderRadius: 7, background: S.surface2, border: `1px solid ${S.border}`,
                  fontSize: 12, color: S.text1, textDecoration: 'none', fontWeight: 500,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
                  Open
                </a>
              ) : (
                <div style={{
                  flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 7, background: S.surface2, border: `1px solid ${S.border}`,
                  fontSize: 11, color: S.text3,
                }}>No link yet</div>
              )}
              <div style={{
                flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                borderRadius: 7, background: S.surface2, border: `1px solid ${S.border}`,
                fontSize: 12, color: S.text3,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                QR Code
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
