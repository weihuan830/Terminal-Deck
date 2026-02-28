import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';

interface PtyProcess {
  id: string;
  pty: { pid: number };
  terminalId: string;
}

interface CpuSnapshot {
  kernelTime: number;
  userTime: number;
  timestamp: number;
}

const SAMPLE_INTERVAL = 20_000; // 20 seconds
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class ResourceLogger {
  private processes: Map<string, PtyProcess> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private enabled = true;
  private logDir: string;
  private currentLogFile: string | null = null;
  private cpuSnapshots: Map<number, CpuSnapshot> = new Map();

  constructor() {
    this.logDir = path.join(app.getPath('userData'), 'resource-logs');
  }

  start(processes: Map<string, PtyProcess>): void {
    this.processes = processes;
    if (this.enabled) {
      this.startTimer();
    }
  }

  stop(): void {
    this.stopTimer();
    this.processes = null;
    this.cpuSnapshots.clear();
    this.currentLogFile = null;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled && this.processes) {
      this.startTimer();
    } else {
      this.stopTimer();
    }
  }

  private startTimer(): void {
    if (this.timer) return;
    this.ensureLogDir();
    this.currentLogFile = this.createLogFile();
    this.timer = setInterval(() => this.sample(), SAMPLE_INTERVAL);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private createLogFile(): string {
    const now = new Date();
    const ts = now.getFullYear()
      + '-' + String(now.getMonth() + 1).padStart(2, '0')
      + '-' + String(now.getDate()).padStart(2, '0')
      + '_' + String(now.getHours()).padStart(2, '0')
      + '-' + String(now.getMinutes()).padStart(2, '0')
      + '-' + String(now.getSeconds()).padStart(2, '0');
    const filePath = path.join(this.logDir, `pty-resource-${ts}.log`);

    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown';
    const header = [
      '=== Terminal Deck Resource Log ===',
      `Started: ${now.toISOString().replace('T', ' ').substring(0, 19)}`,
      `CPU: ${cpuModel}`,
      `OS: ${process.platform} ${os.release()}`,
      '==================================',
      '',
    ].join('\n');

    fs.writeFileSync(filePath, header, 'utf-8');
    return filePath;
  }

  private async sample(): Promise<void> {
    if (!this.processes || this.processes.size === 0) return;

    // Check file rotation
    if (this.currentLogFile) {
      try {
        const stat = fs.statSync(this.currentLogFile);
        if (stat.size >= MAX_FILE_SIZE) {
          this.currentLogFile = this.createLogFile();
        }
      } catch {
        this.currentLogFile = this.createLogFile();
      }
    } else {
      this.currentLogFile = this.createLogFile();
    }

    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0')
      + ':' + String(now.getMinutes()).padStart(2, '0')
      + ':' + String(now.getSeconds()).padStart(2, '0');

    const lines: string[] = [];

    for (const [, proc] of this.processes) {
      const pid = proc.pty.pid;
      if (!pid) continue;

      try {
        const stats = await this.getProcessStats(pid);
        if (stats) {
          const idShort = proc.terminalId.substring(0, 8);
          const memStr = (stats.memoryMB).toFixed(1) + 'M';
          const cpuStr = stats.cpuPercent.toFixed(1) + '%';
          lines.push(`[${timeStr}] id=${idShort} pid=${pid} cpu=${cpuStr} mem=${memStr}`);
        }
      } catch {
        // Process may have exited, skip
      }
    }

    if (lines.length > 0 && this.currentLogFile) {
      try {
        fs.appendFileSync(this.currentLogFile, lines.join('\n') + '\n', 'utf-8');
      } catch (err) {
        console.error('ResourceLogger: failed to write log', err);
      }
    }
  }

  private getProcessStats(pid: number): Promise<{ cpuPercent: number; memoryMB: number } | null> {
    if (process.platform === 'win32') {
      return this.getStatsWindows(pid);
    }
    return this.getStatsUnix(pid);
  }

  private getStatsWindows(pid: number): Promise<{ cpuPercent: number; memoryMB: number } | null> {
    return new Promise((resolve) => {
      execFile('wmic', [
        'process', 'where', `ProcessId=${pid}`,
        'get', 'WorkingSetSize,KernelModeTime,UserModeTime',
        '/format:csv',
      ], { timeout: 5000 }, (err, stdout) => {
        if (err) { resolve(null); return; }

        const lines = stdout.trim().split('\n').filter(l => l.trim());
        // CSV format: Node,KernelModeTime,UserModeTime,WorkingSetSize
        // First line is header, second is data
        if (lines.length < 2) { resolve(null); return; }

        const dataLine = lines[lines.length - 1].trim();
        const parts = dataLine.split(',');
        if (parts.length < 4) { resolve(null); return; }

        const kernelTime = parseInt(parts[1]) || 0; // 100-nanosecond intervals
        const userTime = parseInt(parts[2]) || 0;
        const workingSetBytes = parseInt(parts[3]) || 0;

        const memoryMB = workingSetBytes / (1024 * 1024);
        const now = Date.now();

        const prev = this.cpuSnapshots.get(pid);
        let cpuPercent = 0;

        if (prev) {
          const elapsedMs = now - prev.timestamp;
          if (elapsedMs > 0) {
            // CPU times are in 100-nanosecond intervals, convert to ms
            const kernelDelta = (kernelTime - prev.kernelTime) / 10000;
            const userDelta = (userTime - prev.userTime) / 10000;
            cpuPercent = ((kernelDelta + userDelta) / elapsedMs) * 100;
            if (cpuPercent < 0) cpuPercent = 0;
            if (cpuPercent > 100 * os.cpus().length) cpuPercent = 100 * os.cpus().length;
          }
        }

        this.cpuSnapshots.set(pid, { kernelTime, userTime, timestamp: now });
        resolve({ cpuPercent, memoryMB });
      });
    });
  }

  private getStatsUnix(pid: number): Promise<{ cpuPercent: number; memoryMB: number } | null> {
    return new Promise((resolve) => {
      execFile('ps', ['-p', String(pid), '-o', '%cpu=,rss='], { timeout: 5000 }, (err, stdout) => {
        if (err) { resolve(null); return; }

        const trimmed = stdout.trim();
        if (!trimmed) { resolve(null); return; }

        const parts = trimmed.split(/\s+/);
        if (parts.length < 2) { resolve(null); return; }

        const cpuPercent = parseFloat(parts[0]) || 0;
        const rssKB = parseInt(parts[1]) || 0;
        const memoryMB = rssKB / 1024;

        resolve({ cpuPercent, memoryMB });
      });
    });
  }
}
