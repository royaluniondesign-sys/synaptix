import type { PortEntry } from '../hooks/usePorts';
import type { ConnectionStatus } from '../lib/ws-client';

const S = {
  bg: '#09090b',
  surface: '#0c0c0f',
  surface2: '#18181b',
  surface3: '#27272a',
  border: '#27272a',
  borderLight: '#3f3f46',
  primary: '#a78bfa',
  success: '#34d399',
  error: '#ef4444',
  warning: '#fbbf24',
  text1: '#fafafa',
  text2: '#a1a1aa',
  text3: '#71717a',
} as const;

interface PortsViewProps {
  ports: PortEntry[];
  loading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  onRefresh: () => void;
  tunnelUrl: string | null;
}

const KNOWN_PROCESSES: Record<string, { icon: string; color: string }> = {
  node: { icon: '🟢', color: S.success },
  python: { icon: '🐍', color: '#60a5fa' },
  python3: { icon: '🐍', color: '#60a5fa' },
  ruby: { icon: '💎', color: '#ef4444' },
  php: { icon: '🐘', color: '#818cf8' },
  nginx: { icon: '🌐', color: S.success },
  apache: { icon: '🌐', color: '#f97316' },
  caddy: { icon: '🌐', color: '#22d3ee' },
  postgres: { icon: '🐘', color: '#60a5fa' },
  mysqld: { icon: '🐬', color: '#f59e0b' },
  redis: { icon: '🔴', color: '#ef4444' },
  docker: { icon: '🐳', color: '#38bdf8' },
  ssh: { icon: '🔐', color: S.primary },
};

function processInfo(name: string) {
  const lower = name.toLowerCase().replace(/[^a-z]/g, '');
  for (const [key, val] of Object.entries(KNOWN_PROCESSES)) {
    if (lower.includes(key)) return val;
  }
  return { icon: '⚙️', color: S.text2 };
}

function PortCard({ entry, tunnelUrl }: { entry: PortEntry; tunnelUrl: string | null }) {
  const { icon, color } = processInfo(entry.process);

  const openInBrowser = () => {
    const base = tunnelUrl ?? `http://localhost`;
    window.open(`${base}:${entry.port}`, '_blank');
  };

  return (
    <div style={{
      background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 10,
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{
            fontSize: 14, fontWeight: 700, fontFamily: "'Geist Mono', monospace",
            color,
          }}>:{entry.port}</span>
          <span style={{
            fontSize: 10, fontWeight: 600,
            background: `${color}15`, color,
            border: `1px solid ${color}25`, padding: '1px 6px', borderRadius: 4,
          }}>
            {entry.proto.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: S.text2 }}>{entry.process || 'unknown'}</span>
          {entry.pid > 0 && (
            <span style={{ fontSize: 10, color: S.text3, fontFamily: "'Geist Mono', monospace" }}>
              pid:{entry.pid}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={openInBrowser}
        title="Open in browser"
        style={{
          height: 30, padding: '0 10px', borderRadius: 7,
          border: `1px solid ${S.border}`, background: S.surface3,
          color: S.text2, fontSize: 10, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 5,
          transition: 'all 120ms', flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = S.primary;
          (e.currentTarget as HTMLButtonElement).style.color = S.primary;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = S.border;
          (e.currentTarget as HTMLButtonElement).style.color = S.text2;
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        Open
      </button>
    </div>
  );
}

export function PortsView({ ports, loading, error, connectionStatus, onRefresh, tunnelUrl }: PortsViewProps) {
  const isConnected = connectionStatus === 'connected';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: `1px solid ${S.border}`,
        background: S.surface, flexShrink: 0,
      }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: S.text1, margin: 0, letterSpacing: -0.3 }}>Ports</h2>
          <p style={{ fontSize: 11, color: S.text3, margin: '2px 0 0' }}>
            {isConnected
              ? loading ? 'Scanning…' : `${ports.length} port${ports.length !== 1 ? 's' : ''} detected`
              : 'Connect to scan ports'
            }
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={!isConnected || loading}
          style={{
            height: 30, padding: '0 12px', borderRadius: 7,
            border: `1px solid ${S.border}`, background: S.surface2,
            color: S.text2, fontSize: 11, cursor: isConnected ? 'pointer' : 'default',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
            opacity: loading ? 0.5 : 1, transition: 'opacity 150ms',
          }}
        >
          <svg
            width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: loading ? 'spin 0.9s linear infinite' : 'none' }}
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        {!isConnected && (
          <Empty icon="🔌" title="Not connected" desc="Connect to your server to scan for open ports." />
        )}
        {isConnected && error && (
          <Empty icon="⚠️" title="Scan failed" desc={error} action={{ label: 'Retry', onClick: onRefresh }} />
        )}
        {isConnected && !error && !loading && ports.length === 0 && (
          <Empty icon="🔍" title="No ports detected" desc="Start a dev server or service on your remote machine." />
        )}
        {isConnected && ports.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ports.map((p) => (
              <PortCard key={`${p.proto}-${p.port}`} entry={p} tunnelUrl={tunnelUrl} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ icon, title, desc, action }: {
  icon: string; title: string; desc: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: S.text1, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: S.text3, lineHeight: 1.5, marginBottom: action ? 16 : 0 }}>{desc}</div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            height: 34, padding: '0 16px', borderRadius: 8,
            border: 'none', background: S.primary, color: S.bg,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
