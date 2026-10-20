import { useState, useEffect } from 'react';

const S = {
  surface: '#0c0c0f',
  surface2: '#18181b',
  border: '#27272a',
  primary: '#a78bfa',
  success: '#10b981',
  text1: '#fafafa',
  text2: '#a1a1aa',
  text3: '#71717a',
  bg: '#09090b',
} as const;

const DISMISS_KEY = 'synaptix_update_dismissed';
const CHECK_INTERVAL = 1000 * 60 * 60 * 4; // 4 hours

interface ReleaseInfo {
  version: string;
  url: string;
  body: string;
}

async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  try {
    const res = await fetch(
      'https://api.github.com/repos/stablyai/synaptix/releases/latest',
      { headers: { Accept: 'application/vnd.github.v3+json' }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = await res.json() as { tag_name?: string; html_url?: string; body?: string };
    const version = data.tag_name?.replace(/^v/, '') ?? '';
    if (!version) return null;
    return { version, url: data.html_url ?? '', body: data.body ?? '' };
  } catch {
    return null;
  }
}

function isNewer(remote: string, local: string): boolean {
  const toN = (v: string) => v.split('.').map(Number);
  const [ra, rb, rc] = toN(remote);
  const [la, lb, lc] = toN(local);
  if (ra !== la) return (ra ?? 0) > (la ?? 0);
  if (rb !== lb) return (rb ?? 0) > (lb ?? 0);
  return (rc ?? 0) > (lc ?? 0);
}

interface UpdateNotificationProps {
  currentVersion: string;
}

export function UpdateNotification({ currentVersion }: UpdateNotificationProps) {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissedVer = localStorage.getItem(DISMISS_KEY);

    const check = async () => {
      const info = await fetchLatestRelease();
      if (!info) return;
      if (!isNewer(info.version, currentVersion)) return;
      if (dismissedVer === info.version) return;
      setRelease(info);
      setTimeout(() => setVisible(true), 800);
    };

    void check();
    const timer = setInterval(() => void check(), CHECK_INTERVAL);
    return () => clearInterval(timer);
  }, [currentVersion]);

  const dismiss = () => {
    if (release) localStorage.setItem(DISMISS_KEY, release.version);
    setVisible(false);
    setTimeout(() => setDismissed(true), 300);
  };

  if (dismissed || !release || !visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 72,
      right: 16,
      width: 280,
      zIndex: 200,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      opacity: visible ? 1 : 0,
      transition: 'transform 280ms cubic-bezier(0.16,1,0.3,1), opacity 280ms ease',
      pointerEvents: 'auto',
    }}>
      {/* Top info bar */}
      <div style={{
        background: S.surface,
        border: `1px solid ${S.border}`,
        borderBottom: 'none',
        borderRadius: '10px 10px 0 0',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" stroke={S.success} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span style={{ fontSize: 10, color: S.text2, flex: 1 }}>
          Your terminal sessions won't be interrupted during the update.
        </span>
        <button
          type="button"
          onClick={dismiss}
          style={{ background: 'transparent', border: 'none', color: S.text3, cursor: 'pointer', padding: 2, lineHeight: 1 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Main notification */}
      <div style={{
        background: S.surface2,
        border: `1px solid ${S.border}`,
        borderRadius: '0 0 10px 10px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: `${S.primary}18`, border: `1px solid ${S.primary}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" stroke={S.primary} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: S.text1, letterSpacing: -0.3 }}>
                Update Available
              </div>
              <div style={{ fontSize: 10, color: S.text3 }}>
                Synaptix v{release.version} is ready.
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              style={{ background: 'transparent', border: 'none', color: S.text3, cursor: 'pointer', marginLeft: 'auto', padding: 2 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div style={{ fontSize: 10, color: S.text3, marginBottom: 10 }}>
            Sessions won't be interrupted.
          </div>
        </div>

        {expanded && release.body && (
          <div style={{
            padding: '0 14px 10px',
            fontSize: 10, color: S.text2, lineHeight: 1.6,
            maxHeight: 180, overflow: 'auto',
            borderTop: `1px solid ${S.border}`,
            paddingTop: 10,
          }}>
            {release.body.slice(0, 600)}{release.body.length > 600 ? '…' : ''}
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px 12px',
        }}>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: 'transparent', border: 'none',
              color: S.primary, fontSize: 10, cursor: 'pointer',
              fontFamily: 'inherit', padding: 0,
              textDecoration: 'underline', textUnderlineOffset: 2,
            }}
          >
            {expanded ? 'Hide notes' : 'Release notes'}
          </button>
          <div style={{ flex: 1 }} />
          <a
            href={release.url}
            target="_blank"
            rel="noreferrer"
            onClick={dismiss}
            style={{
              height: 30, padding: '0 16px', borderRadius: 7,
              background: S.primary, color: S.bg,
              fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none', letterSpacing: -0.1,
            }}
          >
            Update
          </a>
        </div>
      </div>
    </div>
  );
}
