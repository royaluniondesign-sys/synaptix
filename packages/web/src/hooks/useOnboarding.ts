import { useState, useCallback } from 'react';

const ONBOARDING_KEY = 'termora_onboarding_done';
const TIPS_KEY = 'termora_seen_tips';

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
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    setIsDone(true);
  }, []);

  const markTipSeen = useCallback((tipId: string) => {
    setSeenTipsState(prev => {
      const next = new Set(prev);
      next.add(tipId);
      try { localStorage.setItem(TIPS_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_KEY);
      localStorage.removeItem(TIPS_KEY);
    } catch {}
    setIsDone(false);
    setSeenTipsState(new Set());
  }, []);

  return { isDone, complete, seenTips, markTipSeen, reset };
}
