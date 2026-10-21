import { useState } from 'react';
import type { ConnectionStatus } from '../lib/ws-client';

interface MobileViewProps { connectionStatus: ConnectionStatus; tunnelUrl: string | null; authToken?: string | null }

const S = {
  bg: '#09090b', surface: '#111113', surface2: '#1c1c1f', surface3: '#2a2a2e',
  border: 'rgba(255,255,255,0.07)', primary: '#7170ff', success: '#10b981',
  warning: '#f59e0b', text1: '#f4f4f5', text2: '#a1a1aa', text3: '#52525b',
} as const;

function PhoneMockup({ url }: { url: string | null }) {
  return (
    <div style={{
      width: 140, height: 260, borderRadius: 22, border: `2px solid ${S.surface3}`,
      background: S.surface, position: 'relative', overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    }}>
      {/* Notch */}
      <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 50, height: 6, borderRadius: 3, background: S.surface3 }} />
      {/* Screen content */}
      <div style={{ margin: '24px 8px 8px', background: '#08090a', borderRadius: 14, height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 }}>
        <svg width="24" height="24" viewBox="0 0 36 36" style={{ display: 'block' }}>
          <rect width="36" height="36" rx="8" fill={S.primary} />
          <text x="18" y="25" textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily="Arial">T</text>
        </svg>
        <span style={{ fontSize: 10, color: S.text1, fontWeight: 700 }}>Synaptix</span>
        {url ? (
          <span style={{ fontSize: 7, color: S.success, textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-all' }}>Connected</span>
        ) : (
          <span style={{ fontSize: 7, color: S.text3, textAlign: 'center' }}>Scan QR to pair</span>
        )}
      </div>
    </div>
  );
}

export function MobileView({ connectionStatus, tunnelUrl }: MobileViewProps) {
  const [copied, setCopied] = useState(false);
  const isConnected = connectionStatus === 'connected';

  const copyLink = () => {
    if (tunnelUrl) {
      void navigator.clipboard.writeText(tunnelUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: S.bg }}>
      {/* Header */}
      <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${S.border}`, background: S.surface, flexShrink: 0 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: S.text1, margin: 0, letterSpacing: -0.3 }}>Synaptix Mobile</h2>
        <p style={{ fontSize: 11, color: S.text3, margin: '3px 0 0' }}>Connect your phone to this agent session</p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Phone mockup */}
          <PhoneMockup url={tunnelUrl} />

          {/* Instructions */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: S.text1, marginBottom: 8 }}>How to connect</div>
              {[
                'Open your browser on your phone',
                tunnelUrl ? `Navigate to: ${tunnelUrl}` : 'Start the agent to get a tunnel URL',
                'Log in with the same token',
                'Your phone is now a Synaptix companion',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: isConnected && i < 2 ? `${S.success}20` : S.surface2,
                    border: `1px solid ${isConnected && i < 2 ? S.success : S.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: isConnected && i < 2 ? S.success : S.text3,
                  }}>{i + 1}</div>
                  <span style={{ fontSize: 12, color: i === 1 && tunnelUrl ? S.primary : S.text2, lineHeight: 1.5, marginTop: 2, wordBreak: 'break-all' }}>{step}</span>
                </div>
              ))}
            </div>

            {/* Tunnel URL */}
            {tunnelUrl && (
              <div style={{ background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 9, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: S.text3, letterSpacing: 0.5, marginBottom: 6 }}>TUNNEL URL</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ flex: 1, fontSize: 11, color: S.primary, fontFamily: "'JetBrains Mono',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tunnelUrl}
                  </code>
                  <button type="button" onClick={copyLink} style={{
                    height: 26, padding: '0 10px', borderRadius: 5,
                    border: `1px solid ${copied ? S.success : S.border}`,
                    background: copied ? `${S.success}12` : 'transparent',
                    color: copied ? S.success : S.text2,
                    fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{copied ? 'Copied!' : 'Copy'}</button>
                </div>
              </div>
            )}

            {!tunnelUrl && (
              <div style={{ background: `${S.warning}08`, border: `1px solid ${S.warning}20`, borderRadius: 9, padding: '10px 14px', fontSize: 12, color: S.text3 }}>
                <span style={{ color: S.warning, fontWeight: 600 }}>No tunnel active.</span> Start the agent with <code style={{ fontFamily: 'monospace', color: S.primary }}>TUNNEL=ngrok</code> to get a public URL.
              </div>
            )}

            <div style={{
              marginTop: 12, padding: '12px 16px', borderRadius: 9,
              background: `${S.primary}08`, border: `1px solid ${S.primary}20`,
              fontSize: 12, color: S.text3, lineHeight: 1.6,
            }}>
              <span style={{ color: S.primary, fontWeight: 600 }}>In development:</span> Native iOS and Android companion apps. Use the web PWA for now — tap the share button in Safari/Chrome and choose "Add to Home Screen" for a native-like experience.
            </div>

            {/* Add to Home Screen instructions */}
            <div style={{
              marginTop: 10, padding: '12px 16px', borderRadius: 9,
              background: S.surface2, border: `1px solid ${S.border}`,
              fontSize: 12, color: S.text2, lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 700, color: S.text1, marginBottom: 8, fontSize: 11, letterSpacing: 0.4 }}>ADD TO HOME SCREEN</div>
              {[
                { label: 'Safari (iOS)', steps: 'Tap the Share icon (□↑) → "Add to Home Screen" → Add' },
                { label: 'Chrome (Android)', steps: 'Tap the ⋮ menu → "Add to Home screen" → Add' },
                { label: 'Chrome (iOS)', steps: 'Tap the Share icon (□↑) → "Add to Home Screen" → Add' },
              ].map(({ label, steps }) => (
                <div key={label} style={{ marginBottom: 6 }}>
                  <span style={{ color: S.primary, fontWeight: 600 }}>{label}:</span>{' '}
                  <span>{steps}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
