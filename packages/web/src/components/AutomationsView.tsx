const S = {
  bg: '#09090b', surface: '#111113', surface2: '#1c1c1f', surface3: '#2a2a2e',
  border: 'rgba(255,255,255,0.07)', primary: '#7170ff', success: '#10b981',
  warning: '#f59e0b', text1: '#f4f4f5', text2: '#a1a1aa', text3: '#52525b',
} as const;

interface AutomationItem {
  id: string; name: string; trigger: string; lastRun: string | null;
  status: 'active' | 'paused' | 'never'; runs: number;
}

const DEMO_AUTOMATIONS: AutomationItem[] = [
  { id: '1', name: 'Auto-commit on agent success', trigger: 'Agent finishes with exit 0', lastRun: null, status: 'paused', runs: 0 },
  { id: '2', name: 'Notify on failed gate', trigger: 'Gate run fails', lastRun: null, status: 'paused', runs: 0 },
  { id: '3', name: 'Fan-out on PR open', trigger: 'GitHub PR opened', lastRun: null, status: 'paused', runs: 0 },
  { id: '4', name: 'Clean worktrees nightly', trigger: 'Daily at 02:00', lastRun: null, status: 'paused', runs: 0 },
];

export function AutomationsView() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: S.bg }}>
      {/* Header */}
      <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${S.border}`, background: S.surface, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: S.text1, margin: 0, letterSpacing: -0.3 }}>Automations</h2>
          <p style={{ fontSize: 11, color: S.text3, margin: '3px 0 0' }}>Trigger workflows when agent events happen</p>
        </div>
        <button type="button" style={{
          height: 32, padding: '0 14px', borderRadius: 7,
          border: 'none', background: S.primary, color: '#fff',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New automation
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DEMO_AUTOMATIONS.map(auto => (
            <div key={auto.id} style={{
              background: S.surface, border: `1px solid ${S.border}`,
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              {/* Status dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: auto.status === 'active' ? S.success : S.surface3,
                border: `1px solid ${auto.status === 'active' ? S.success : S.border}`,
              }} />

              {/* Name + trigger */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: S.text1 }}>{auto.name}</div>
                <div style={{ fontSize: 11, color: S.text3, marginTop: 2 }}>
                  <span style={{ color: S.text2 }}>Trigger:</span> {auto.trigger}
                </div>
              </div>

              {/* Runs */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: auto.runs > 0 ? S.text1 : S.text3 }}>{auto.runs}</div>
                <div style={{ fontSize: 10, color: S.text3 }}>runs</div>
              </div>

              {/* Status badge */}
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                background: auto.status === 'active' ? `${S.success}18` : S.surface2,
                border: `1px solid ${auto.status === 'active' ? `${S.success}30` : S.border}`,
                color: auto.status === 'active' ? S.success : S.text3,
                textTransform: 'capitalize', flexShrink: 0,
              }}>
                {auto.status}
              </span>

              {/* Toggle */}
              <button type="button" style={{
                height: 28, padding: '0 10px', borderRadius: 6,
                border: `1px solid ${S.border}`, background: S.surface2,
                color: S.text2, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Configure
              </button>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 20, padding: '14px 18px', borderRadius: 10,
          background: `${S.primary}08`, border: `1px solid ${S.primary}20`,
          fontSize: 12, color: S.text3, lineHeight: 1.6,
        }}>
          <span style={{ color: S.primary, fontWeight: 600 }}>Coming soon:</span> Full automation builder with condition chains, delay timers, multi-step workflows, and Slack/webhook triggers. Automations run on the agent and survive disconnects.
        </div>
      </div>
    </div>
  );
}
