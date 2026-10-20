import { useState, useCallback } from 'react';

const ONBOARDING_KEY = 'synaptix_onboarding_done';
const TIPS_KEY = 'synaptix_seen_tips';

export function useOnboarding() {
  const [isDone, setIsDone] = useState<boolean>(() => {
    try { return localStorage.getItem(ONBOARDING_KEY) === '1'; } catch { return false; }
  });

  const [seenTips, setSeenTipsState] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(TIPS_KEY);
      return new Set(raw ? JSON.parse(raw) as string[] : []);
    } catch { return new Set(); }
  });

  const complete = useCallback(() => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* storage unavailable: the welcome screen shows again next time */ }
    setIsDone(true);
  }, []);

  const markTipSeen = useCallback((tipId: string) => {
    setSeenTipsState(prev => {
      const next = new Set(prev);
      next.add(tipId);
      try { localStorage.setItem(TIPS_KEY, JSON.stringify([...next])); } catch { /* storage unavailable: tips are not remembered */ }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_KEY);
      localStorage.removeItem(TIPS_KEY);
    } catch { /* storage unavailable: nothing to reset */ }
    setIsDone(false);
    setSeenTipsState(new Set());
  }, []);

  return { isDone, complete, seenTips, markTipSeen, reset };
}
