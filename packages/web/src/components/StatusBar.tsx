import React from 'react';
import type { ConnectionStatus } from '../lib/ws-client';
import type { PortEntry } from '../hooks/usePorts';

const S = {
  bg: '#07070a',
  border: '#1f1f22',
  primary: '#a78bfa',
  success: '#34d399',
  error: '#ef4444',
  warning: '#fbbf24',
  text2: '#a1a1aa',
  text3: '#71717a',
} as const;

interface StatusBarProps {
  connectionStatus: ConnectionStatus;
  latencyMs: number | null;
  sessionCount: number;
  portCount: number;
  tunnelCount: number;
  tunnelUrl?: string | null;
  ports: PortEntry[];
  onPortsClick: () => void;
}

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
      background: color, flexShrink: 0,
      animation: pulse ? 'pulse-dot 2s ease-in-out infinite' : 'none',
    }} />
  );
}

function Segment({ children, onClick, title }: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <div
      title={title}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '0 7px', height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        borderRight: `1px solid ${S.border}`,
        transition: 'background 120ms',
        fontSize: 10, color: S.text3,
        fontFamily: "'Geist Mono', monospace",
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={(e) => onClick && ((e.currentTarget as HTMLDivElement).style.background = '#ffffff08')}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      {children}
    </div>
  );
}

export function StatusBar({
  connectionStatus, latencyMs, sessionCount, portCount, tunnelCount, tunnelUrl, ports, onPortsClick,
}: StatusBarProps) {
  const [tunnelCopied, setTunnelCopied] = React.useState(false);

  const copyTunnel = () => {
    if (!tunnelUrl) return;
    void navigator.clipboard.writeText(tunnelUrl).then(() => {
      setTunnelCopied(true);
      setTimeout(() => setTunnelCopied(false), 2000);
    });
  };
  const isConnected = connectionStatus === 'connected';
  const isReconnecting = connectionStatus === 'reconnecting';
  const statusColor = isConnected ? S.success : isReconnecting ? S.warning : S.error;
  const statusLabel = isConnected ? 'LIVE' : isReconnecting ? 'SYNC' : 'OFF';

  return (
    <div style={{
      height: 24, display: 'flex', alignItems: 'stretch',
      background: S.bg, borderBottom: `1px solid ${S.border}`,
      flexShrink: 0, overflow: 'hidden',
    }}>
      {/* Connection status */}
      <Segment title={`Connection: ${connectionStatus}`}>
        <Dot color={statusColor} pulse={isConnected} />
        <span style={{ color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
      </Segment>

      {/* Latency */}
      {isConnected && latencyMs !== null && (
        <Segment title="Round-trip latency">
          <span style={{ color: latencyMs < 50 ? S.success : latencyMs < 150 ? S.warning : S.error }}>
            {latencyMs}ms
          </span>
        </Segment>
      )}

      {/* Sessions */}
      <Segment title={`${sessionCount} terminal session${sessionCount !== 1 ? 's' : ''}`}>
        <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
        </svg>
        <span>{sessionCount}</span>
      </Segment>

      {/* Ports */}
      <Segment onClick={portCount > 0 ? onPortsClick : undefined} title={portCount > 0 ? `${portCount} port${portCount !== 1 ? 's' : ''} — click to view` : 'No open ports detected'}>
        <svg width="10" height="10" viewBox="0 0 24 24" stroke={portCount > 0 ? S.primary : 'currentColor'} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
        <span style={{ color: portCount > 0 ? S.primary : S.text3 }}>{portCount}</span>
        {portCount > 0 && ports.slice(0, 3).map(p => (
          <span key={p.port} style={{
            background: '#a78bfa15', color: S.primary, padding: '0 4px',
            borderRadius: 3, fontSize: 9, border: '1px solid #a78bfa25',
          }}>:{p.port}</span>
        ))}
        {portCount > 3 && <span style={{ color: S.text3 }}>+{portCount - 3}</span>}
      </Segment>

      {/* Tunnels */}
      {tunnelCount > 0 && (
        <Segment
          onClick={tunnelUrl ? copyTunnel : undefined}
          title={tunnelUrl ? (tunnelCopied ? 'Copied!' : `${tunnelUrl} — click to copy`) : `${tunnelCount} active tunnel${tunnelCount !== 1 ? 's' : ''}`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" stroke={tunnelCopied ? S.primary : S.success} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span style={{ color: tunnelCopied ? S.primary : S.success }}>
            {tunnelCopied ? 'copied!' : tunnelCount}
          </span>
        </Segment>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Version */}
      <Segment>
        <span>synaptix v0.2.0</span>
      </Segment>
    </div>
  );
}
