import { useState, useEffect, useCallback } from 'react';
import type { ConnectionStatus } from '../lib/ws-client';

export interface PortEntry {
  port: number;
  process: string;
  pid: number;
  proto: 'tcp' | 'udp';
}

const POLL_INTERVAL = 15_000;

export function usePorts(
  connectionStatus: ConnectionStatus,
  token: string | null,
) {
  const [ports, setPorts] = useState<PortEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token || connectionStatus !== 'connected') return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ports', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as { ports: PortEntry[] };
      setPorts(data.ports ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ports');
    } finally {
      setLoading(false);
    }
  }, [token, connectionStatus]);

  useEffect(() => {
    if (connectionStatus !== 'connected') { setPorts([]); return; }
    void refresh();
    const id = setInterval(() => void refresh(), POLL_INTERVAL);
    return () => clearInterval(id);
  }, [connectionStatus, refresh]);

  return { ports, loading, error, refresh };
}
