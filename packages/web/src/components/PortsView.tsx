import type { PortEntry } from '../hooks/usePorts';
import type { ConnectionStatus } from '../lib/ws-client';
import { T as S } from '../lib/design';

interface PortsViewProps {
  ports: PortEntry[];
  loading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  onRefresh: () => void;
  tunnelUrl: string | null;
}

// SVG icon helpers — all 24x24 viewBox, stroke-based (heroicons/lucide style)
const IconHexagon = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 22 7 22 17 12 22 2 17 2 7" />
  </svg>
);

const IconDiamond = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 22 12 12 22 2 12" />
  </svg>
);

const IconDatabase = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const IconGlobe = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconZap = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconLayers = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const IconKey = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="15" r="5" />
    <path d="M21 2l-9.6 9.6" />
    <path d="M15.5 7.5l3 3" />
    <path d="M18 5l2 2" />
  </svg>
);

const IconSettings = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconPlug = ({ color }: { color: string }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18" />
    <path d="M7 17H4a3 3 0 0 1-3-3 7 7 0 0 1 7-7h3" />
    <path d="M17 7h3a3 3 0 0 1 3 3 7 7 0 0 1-7 7h-3" />
    <line x1="8" y1="2" x2="8" y2="5" />
    <line x1="16" y1="2" x2="16" y2="5" />
    <line x1="8" y1="19" x2="8" y2="22" />
    <line x1="16" y1="19" x2="16" y2="22" />
  </svg>
);

const IconAlertTriangle = ({ color }: { color: string }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconSearch = ({ color }: { color: string }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

type ProcessIcon = React.ReactNode;

const KNOWN_PROCESSES: Record<string, { icon: ProcessIcon; color: string }> = {
  node: { icon: <IconHexagon color={S.success} />, color: S.success },
  python: { icon: <IconDiamond color="#60a5fa" />, color: '#60a5fa' },
  python3: { icon: <IconDiamond color="#60a5fa" />, color: '#60a5fa' },
  ruby: { icon: <IconDiamond color="#ef4444" />, color: '#ef4444' },
  php: { icon: <IconDatabase color="#818cf8" />, color: '#818cf8' },
  nginx: { icon: <IconGlobe color={S.success} />, color: S.success },
  apache: { icon: <IconGlobe color="#f97316" />, color: '#f97316' },
  caddy: { icon: <IconGlobe color="#22d3ee" />, color: '#22d3ee' },
  postgres: { icon: <IconDatabase color="#60a5fa" />, color: '#60a5fa' },
  mysqld: { icon: <IconDatabase color="#f59e0b" />, color: '#f59e0b' },
  redis: { icon: <IconZap color="#ef4444" />, color: '#ef4444' },
  docker: { icon: <IconLayers color="#38bdf8" />, color: '#38bdf8' },
  ssh: { icon: <IconKey color={S.primary} />, color: S.primary },
};

function processInfo(name: string): { icon: ProcessIcon; color: string } {
  const lower = name.toLowerCase().replace(/[^a-z]/g, '');
  for (const [key, val] of Object.entries(KNOWN_PROCESSES)) {
    if (lower.includes(key)) return val;
  }
  return { icon: <IconSettings color={S.text2} />, color: S.text2 };
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
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>

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
          <Empty
            icon={<IconPlug color={S.text3} />}
            title="Not connected"
            desc="Connect to your server to scan for open ports."
          />
        )}
        {isConnected && error && (
          <Empty
            icon={<IconAlertTriangle color={S.warning} />}
            title="Scan failed"
            desc={error}
            action={{ label: 'Retry', onClick: onRefresh }}
          />
        )}
        {isConnected && !error && !loading && ports.length === 0 && (
          <Empty
            icon={<IconSearch color={S.text3} />}
            title="No ports detected"
            desc="Start a dev server or service on your remote machine."
          />
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
  icon: React.ReactNode; title: string; desc: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>{icon}</div>
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
