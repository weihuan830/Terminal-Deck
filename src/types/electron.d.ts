import type { TerminalStatus, AppSettings, TerminalGroup } from './index';

export interface ElectronAPI {
  // 终端操作
  terminal: {
    create: (options: {
      terminalId: string;
      cwd: string;
      shell: string;
      cols: number;
      rows: number;
      claudePath?: string;
      extraPaths?: string;
      detectedClaudePaths?: string[];
    }) => Promise<{ success: boolean; error?: string; fallbackCwd?: string; }>;

    write: (terminalId: string, data: string) => void;

    resize: (terminalId: string, cols: number, rows: number) => void;

    kill: (terminalId: string) => Promise<{ success: boolean }>;

    onData: (
      callback: (data: { terminalId: string; data: string }) => void
    ) => () => void;

    onStatus: (
      callback: (data: {
        terminalId: string;
        status: TerminalStatus;
        exitCode?: number;
      }) => void
    ) => () => void;
  };

  // 配置操作
  config: {
    get: () => Promise<AppSettings>;
    set: (settings: Partial<AppSettings>) => Promise<AppSettings>;
    detectClaude: () => Promise<string[]>;
  };

  // 分组操作
  groups: {
    load: () => Promise<{
      groups: TerminalGroup[];
      lastActiveGroupId: string | null;
    }>;
    save: (groups: TerminalGroup[]) => Promise<void>;
  };

  // 对话框
  dialog: {
    selectDirectory: () => Promise<string | null>;
  };

  // 菜单事件
  menu: {
    onNewGroup: (callback: () => void) => () => void;
    onNewTerminal: (callback: () => void) => () => void;
    onSettings: (callback: () => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
