import React from 'react';
import { T as S } from '../lib/design';
import type { ConnectionStatus } from '../lib/ws-client';
import type { PortEntry } from '../hooks/usePorts';

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

function Chip({ children, onClick, title }: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <div
      title={title}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '0 8px', height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        color: S.text3, fontSize: 10,
        fontFamily: "'Geist Mono', monospace",
        userSelect: 'none',
        borderLeft: `1px solid ${S.border2}`,
        transition: 'background 80ms',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      {children}
    </div>
  );
}

export function StatusBar({
  connectionStatus, latencyMs, sessionCount, portCount, tunnelUrl, onPortsClick,
}: StatusBarProps) {
  const isConnected = connectionStatus === 'connected';
  const isReconnecting = connectionStatus === 'reconnecting';
  const dotColor = isConnected ? S.success : isReconnecting ? S.warning : S.error;
  const statusLabel = isConnected ? 'Connected' : isReconnecting ? 'Reconnecting' : 'Off';

  const [tunnelCopied, setTunnelCopied] = React.useState(false);
  const copyTunnel = () => {
    if (!tunnelUrl) return;
    void navigator.clipboard.writeText(tunnelUrl).then(() => {
      setTunnelCopied(true);
      setTimeout(() => setTunnelCopied(false), 2000);
    });
  };

  return (
    <div style={{
      height: 24, display: 'flex', alignItems: 'stretch',
      background: S.bg, borderTop: `1px solid ${S.border2}`,
      flexShrink: 0, overflow: 'hidden',
    }}>
      {/* Left: usage tracking link */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '0 10px', cursor: 'pointer', color: S.text3,
          fontSize: 10, fontFamily: "'Geist', sans-serif",
          userSelect: 'none', borderRight: `1px solid ${S.border2}`,
          transition: 'color 80ms',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.color = S.text2; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.color = S.text3; }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        Configure usage tracking
      </div>

      <div style={{ flex: 1 }} />

      {/* Right side chips */}
      {/* Connection status */}
      <Chip title={`${statusLabel}${isConnected && latencyMs !== null ? ` · ${latencyMs}ms` : ''}`}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: dotColor, display: 'inline-block', flexShrink: 0,
        }} />
        <span style={{ color: dotColor }}>{statusLabel}</span>
      </Chip>

      {/* User */}
      <Chip title="Account">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        Claudino
      </Chip>

      {/* Ports */}
      {portCount > 0 && (
        <Chip onClick={onPortsClick} title={`${portCount} open port${portCount !== 1 ? 's' : ''}`}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
          {portCount}
        </Chip>
      )}

      {/* Tunnel */}
      {tunnelUrl && (
        <Chip onClick={copyTunnel} title={tunnelCopied ? 'Copied!' : tunnelUrl}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          {tunnelCopied ? 'copied' : 'tunnel'}
        </Chip>
      )}

      {/* Terminal sessions */}
      <Chip title={`${sessionCount} terminal session${sessionCount !== 1 ? 's' : ''}`}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
        </svg>
        {sessionCount}
      </Chip>
    </div>
  );
}
