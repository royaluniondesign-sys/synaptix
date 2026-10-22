import { useState } from 'react';
import { T as S } from '../lib/design';

interface AutomationItem {
  id: string; name: string; trigger: string; lastRun: string | null;
  status: 'active' | 'paused'; runs: number;
}

const INITIAL_AUTOMATIONS: AutomationItem[] = [
  { id: '1', name: 'Auto-commit on agent success', trigger: 'Agent finishes with exit 0', lastRun: null, status: 'paused', runs: 0 },
  { id: '2', name: 'Notify on failed gate', trigger: 'Gate run fails', lastRun: null, status: 'paused', runs: 0 },
  { id: '3', name: 'Fan-out on PR open', trigger: 'GitHub PR opened', lastRun: null, status: 'paused', runs: 0 },
  { id: '4', name: 'Clean worktrees nightly', trigger: 'Daily at 02:00', lastRun: null, status: 'paused', runs: 0 },
];

const TRIGGER_OPTIONS = [
  'Agent finishes with exit 0',
  'Agent finishes with error',
  'Gate run fails',
  'GitHub PR opened',
  'GitHub PR merged',
  'Daily at 02:00',
  'On file change',
  'On WebSocket connect',
];

interface NewAutoForm { name: string; trigger: string }

export function AutomationsView() {
  const [automations, setAutomations] = useState<AutomationItem[]>(INITIAL_AUTOMATIONS);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<NewAutoForm>({ name: '', trigger: TRIGGER_OPTIONS[0] });
  const [configId, setConfigId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const toggleStatus = (id: string) => {
    setAutomations(prev => prev.map(a => {
      if (a.id !== id) return a;
      const next = a.status === 'active' ? 'paused' : 'active';
      showToast(`${a.name} ${next === 'active' ? 'enabled' : 'paused'}`);
      return { ...a, status: next };
    }));
    setConfigId(null);
  };

  const handleCreate = () => {
    if (!newForm.name.trim()) return;
    const newAuto: AutomationItem = {
      id: String(Date.now()), name: newForm.name.trim(),
      trigger: newForm.trigger, lastRun: null, status: 'paused', runs: 0,
    };
    setAutomations(prev => [...prev, newAuto]);
    setNewForm({ name: '', trigger: TRIGGER_OPTIONS[0] });
    setShowNewForm(false);
    showToast(`Automation "${newAuto.name}" created`);
  };

  const handleDelete = (id: string) => {
    const name = automations.find(a => a.id === id)?.name ?? 'Automation';
    setAutomations(prev => prev.filter(a => a.id !== id));
    setConfigId(null);
    showToast(`"${name}" deleted`);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: S.bg, position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px 12px', borderBottom: `1px solid ${S.border}`, background: S.surface, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: S.text1, margin: 0, letterSpacing: -0.3 }}>Automations</h2>
          <p style={{ fontSize: 11, color: S.text3, margin: '3px 0 0' }}>Trigger workflows when agent events happen</p>
        </div>
        <button type="button" onClick={() => setShowNewForm(v => !v)} style={{
          height: 32, padding: '0 14px', borderRadius: 7,
          border: 'none', background: showNewForm ? S.surface2 : S.primary, color: showNewForm ? S.text2 : '#fff',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 5,
          border2: showNewForm ? `1px solid ${S.border}` : 'none',
        } as React.CSSProperties}>
          {showNewForm ? (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Cancel
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New automation
            </>
          )}
        </button>
      </div>

      {/* New automation form */}
      {showNewForm && (
        <div style={{
          margin: '12px 20px 0', background: S.surface,
          border: `1px solid ${S.primary}40`, borderRadius: 10, padding: '14px 16px', flexShrink: 0,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: S.text1, marginBottom: 10 }}>New automation</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: S.text3, fontWeight: 600, marginBottom: 4, letterSpacing: 0.4 }}>NAME</div>
              <input
                type="text"
                value={newForm.name}
                onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Notify on CI fail"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                style={{
                  width: '100%', height: 32, borderRadius: 6,
                  border: `1px solid ${S.border}`, background: S.surface2,
                  color: S.text1, fontSize: 12, fontFamily: 'inherit',
                  padding: '0 10px', boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, color: S.text3, fontWeight: 600, marginBottom: 4, letterSpacing: 0.4 }}>TRIGGER</div>
              <select
                value={newForm.trigger}
                onChange={e => setNewForm(f => ({ ...f, trigger: e.target.value }))}
                style={{
                  width: '100%', height: 32, borderRadius: 6,
                  border: `1px solid ${S.border}`, background: S.surface2,
                  color: S.text1, fontSize: 12, fontFamily: 'inherit',
                  padding: '0 10px', outline: 'none', cursor: 'pointer',
                }}
              >
                {TRIGGER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={() => setShowNewForm(false)} style={{
                height: 30, padding: '0 12px', borderRadius: 6,
                border: `1px solid ${S.border}`, background: 'transparent',
                color: S.text2, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
              <button type="button" onClick={handleCreate} style={{
                height: 30, padding: '0 14px', borderRadius: 6,
                border: 'none', background: S.primary, color: '#fff',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {automations.map(auto => (
            <div key={auto.id}>
              <div style={{
                background: S.surface, border: `1px solid ${configId === auto.id ? `${S.primary}50` : S.border}`,
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                {/* Status dot — clickable toggle */}
                <button type="button" onClick={() => toggleStatus(auto.id)} title={auto.status === 'active' ? 'Pause' : 'Enable'} style={{
                  width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                  background: auto.status === 'active' ? S.success : S.surface3,
                  border: `1px solid ${auto.status === 'active' ? S.success : S.border}`,
                  cursor: 'pointer', padding: 0,
                  transition: 'background 150ms, border-color 150ms',
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
                <button type="button" onClick={() => toggleStatus(auto.id)} style={{
                  fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 5,
                  background: auto.status === 'active' ? `${S.success}18` : S.surface2,
                  border: `1px solid ${auto.status === 'active' ? `${S.success}30` : S.border}`,
                  color: auto.status === 'active' ? S.success : S.text3,
                  textTransform: 'capitalize', flexShrink: 0, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {auto.status}
                </button>

                {/* Configure */}
                <button type="button" onClick={() => setConfigId(c => c === auto.id ? null : auto.id)} style={{
                  height: 28, padding: '0 10px', borderRadius: 6,
                  border: `1px solid ${configId === auto.id ? S.primary : S.border}`,
                  background: configId === auto.id ? `${S.primary}14` : S.surface2,
                  color: configId === auto.id ? S.primary : S.text2,
                  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Configure
                </button>
              </div>

              {/* Expanded config panel */}
              {configId === auto.id && (
                <div style={{
                  background: S.surface2, border: `1px solid ${S.border}`,
                  borderTop: 'none', borderRadius: '0 0 10px 10px',
                  padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <div style={{ flex: 1, fontSize: 12, color: S.text3 }}>
                    Status: <span style={{ color: auto.status === 'active' ? S.success : S.warning, fontWeight: 600 }}>{auto.status}</span>
                    {' · '}Runs: <span style={{ color: S.text1, fontWeight: 600 }}>{auto.runs}</span>
                    {' · '}Last run: <span style={{ color: S.text1 }}>{auto.lastRun ?? 'never'}</span>
                  </div>
                  <button type="button" onClick={() => toggleStatus(auto.id)} style={{
                    height: 28, padding: '0 12px', borderRadius: 6,
                    border: 'none',
                    background: auto.status === 'active' ? `${S.warning}20` : S.primary,
                    color: auto.status === 'active' ? S.warning : '#fff',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    {auto.status === 'active' ? 'Pause' : 'Enable'}
                  </button>
                  <button type="button" onClick={() => handleDelete(auto.id)} style={{
                    height: 28, padding: '0 10px', borderRadius: 6,
                    border: `1px solid ${S.error}30`, background: `${S.error}10`,
                    color: S.error, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {automations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: S.text3 }}>
            <p style={{ fontSize: 13 }}>No automations yet.</p>
            <button type="button" onClick={() => setShowNewForm(true)} style={{
              height: 32, padding: '0 14px', borderRadius: 7, border: 'none',
              background: S.primary, color: '#fff', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', marginTop: 8,
            }}>Create your first automation</button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: S.surface2, border: `1px solid ${S.border}`,
          borderRadius: 8, padding: '8px 14px',
          fontSize: 12, color: S.text1, pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          animation: 'fadeIn 150ms ease-out',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
