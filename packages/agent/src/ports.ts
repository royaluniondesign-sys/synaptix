import { execFile } from 'node:child_process';

export interface ListeningPort {
  port: number;
  process: string;
  pid: number;
  proto: 'tcp' | 'udp';
}

/**
 * Parses the output of `ss -tlnup` / `netstat -tlnup` (Linux) or
 * `lsof -i -P -n -sTCP:LISTEN` (macOS) into a de-duplicated, sorted port list.
 * Lines that match neither format are ignored.
 */
export function parseListeningPorts(output: string): ListeningPort[] {
  const ports: ListeningPort[] = [];
  const seen = new Set<number>();
  for (const line of output.split('\n')) {
    if (!line || line.startsWith('Netid') || line.startsWith('State') || line.startsWith('COMMAND')) continue;
    let port = 0;
    let process = '';
    let pid = 0;
    let proto: 'tcp' | 'udp' = 'tcp';
    // lsof: CMD PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
    const lsof = /^(\S+)\s+(\d+)\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+(TCP|UDP)\s+\S+:(\d+)\s*\(LISTEN\)/i.exec(line);
    if (lsof) {
      process = lsof[1];
      pid = parseInt(lsof[2], 10);
      proto = lsof[3].toLowerCase() as 'tcp' | 'udp';
      port = parseInt(lsof[4], 10);
    }
    // ss: tcp LISTEN 0 128 *:3000 *:* users:(("node",pid=123,fd=12))
    const ss = /^(tcp|udp)\s+LISTEN\s+\d+\s+\d+\s+\S*:(\d+)\s+.*users:\(\("([^"]+)",pid=(\d+)/i.exec(line);
    if (ss) {
      proto = ss[1].toLowerCase() as 'tcp' | 'udp';
      port = parseInt(ss[2], 10);
      process = ss[3];
      pid = parseInt(ss[4], 10);
    }
    if (port > 0 && port < 65536 && !seen.has(port)) {
      seen.add(port);
      ports.push({ port, process: process || 'unknown', pid, proto });
    }
  }
  return ports.sort((a, b) => a.port - b.port);
}

function run(file: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: 5000, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

/** Lists listening ports. Commands run as argv arrays, never through a shell. */
export async function listListeningPorts(platform: NodeJS.Platform = process.platform): Promise<ListeningPort[]> {
  const attempts: Array<[string, string[]]> = platform === 'linux'
    ? [['ss', ['-tlnup']], ['netstat', ['-tlnup']]]
    : [['lsof', ['-i', '-P', '-n', '-sTCP:LISTEN']]];
  for (const [file, args] of attempts) {
    try {
      return parseListeningPorts(await run(file, args));
    } catch {
      // Tool missing or failed: try the next one, then report an empty list.
    }
  }
  return [];
}
