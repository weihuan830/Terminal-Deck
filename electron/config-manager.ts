import Store from 'electron-store';
import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { AppSettings, TerminalGroup } from '../src/types';

interface PersistedData {
  version: number;
  groups: TerminalGroup[];
  lastActiveGroupId: string | null;
  settings: AppSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", monospace',
  defaultShell: 'default',
  defaultCwd: '',
  scrollbackLines: 10000,
  shortcuts: {
    newGroup: 'CmdOrCtrl+N',
    newTerminal: 'CmdOrCtrl+T',
    closeTerminal: 'CmdOrCtrl+W',
    nextGroup: 'CmdOrCtrl+Tab',
    prevGroup: 'CmdOrCtrl+Shift+Tab',
    focusUp: 'Alt+Up',
    focusDown: 'Alt+Down',
    focusLeft: 'Alt+Left',
    focusRight: 'Alt+Right',
    maximize: 'CmdOrCtrl+Enter',
  },
};

export class ConfigManager {
  private store: Store<PersistedData>;

  constructor() {
    try {
      this.store = new Store<PersistedData>({
        name: 'claude-terminal-manager',
        defaults: {
          version: 1,
          groups: [],
          lastActiveGroupId: null,
          settings: DEFAULT_SETTINGS,
        },
        clearInvalidConfig: true, // 自动清除无效配置
      });
    } catch (error) {
      console.error('Failed to create config store, using defaults:', error);
      // 创建一个最小化的store
      this.store = new Store<PersistedData>({
        name: 'claude-terminal-manager-backup',
        defaults: {
          version: 1,
          groups: [],
          lastActiveGroupId: null,
          settings: DEFAULT_SETTINGS,
        },
      });
    }
  }

  /**
   * 初始化 IPC 处理器
   */
  initialize(): void {
    // 获取设置
    ipcMain.handle('config:get', () => {
      return this.getSettings();
    });

    // 保存设置
    ipcMain.handle('config:set', (_, { settings }) => {
      return this.setSettings(settings);
    });

    // 加载分组
    ipcMain.handle('groups:load', () => {
      return this.loadGroups();
    });

    // 保存分组
    ipcMain.handle('groups:save', (_, { groups }) => {
      return this.saveGroups(groups);
    });

    // 重新检测 Claude 路径
    ipcMain.handle('config:detectClaude', () => {
      return this.runClaudeDetection();
    });
  }

  /**
   * 获取设置
   */
  getSettings(): AppSettings {
    return this.store.get('settings');
  }

  /**
   * 更新设置
   */
  setSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    this.store.set('settings', updated);
    return updated;
  }

  /**
   * 加载分组数据
   */
  loadGroups(): { groups: TerminalGroup[]; lastActiveGroupId: string | null } {
    return {
      groups: this.store.get('groups'),
      lastActiveGroupId: this.store.get('lastActiveGroupId'),
    };
  }

  /**
   * 保存分组数据
   */
  saveGroups(groups: TerminalGroup[]): void {
    this.store.set('groups', groups);
  }

  /**
   * 保存最后活动的分组
   */
  setLastActiveGroup(groupId: string | null): void {
    this.store.set('lastActiveGroupId', groupId);
  }

  /**
   * 获取存储路径
   */
  getStorePath(): string {
    return this.store.path;
  }

  /**
   * 自动检测 Claude CLI 安装路径（仅 Windows）
   */
  detectClaudePaths(): string[] {
    if (process.platform !== 'win32') {
      return [];
    }

    const detectedPaths: string[] = [];
    const userProfile = process.env.USERPROFILE || '';
    const localAppData = process.env.LOCALAPPDATA || `${userProfile}\\AppData\\Local`;
    const appData = process.env.APPDATA || `${userProfile}\\AppData\\Roaming`;

    // 1. 检测 WinGet 安装（动态扫描目录名，因为不同版本后缀可能不同）
    const wingetPackagesDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
    try {
      if (fs.existsSync(wingetPackagesDir)) {
        const packages = fs.readdirSync(wingetPackagesDir);
        for (const pkg of packages) {
          if (pkg.toLowerCase().includes('claude')) {
            const pkgPath = path.join(wingetPackagesDir, pkg);
            const claudeExe = path.join(pkgPath, 'claude.exe');
            if (fs.existsSync(claudeExe)) {
              detectedPaths.push(pkgPath);
              console.log(`[Claude Detection] Found WinGet installation: ${pkgPath}`);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to scan WinGet packages:', e);
    }

    // 2. 检测 npm 全局安装
    const npmGlobalPath = path.join(appData, 'npm');
    const npmClaudeCmd = path.join(npmGlobalPath, 'claude.cmd');
    if (fs.existsSync(npmClaudeCmd)) {
      detectedPaths.push(npmGlobalPath);
      console.log(`[Claude Detection] Found npm installation: ${npmGlobalPath}`);
    }

    // 3. WinGet Links 目录
    const wingetLinksDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Links');
    if (fs.existsSync(wingetLinksDir)) {
      detectedPaths.push(wingetLinksDir);
    }

    // 4. 常见的 Node.js 路径
    const nodePaths = [
      path.join(localAppData, 'Programs', 'nodejs'),
      path.join(userProfile, 'AppData', 'Local', 'Programs', 'nodejs'),
      'C:\\Program Files\\nodejs',
    ];
    for (const nodePath of nodePaths) {
      if (fs.existsSync(nodePath)) {
        detectedPaths.push(nodePath);
      }
    }

    return detectedPaths;
  }

  /**
   * 执行 Claude 路径检测并保存到配置
   */
  runClaudeDetection(): string[] {
    const detectedPaths = this.detectClaudePaths();

    // 保存到配置
    const currentSettings = this.getSettings();
    this.setSettings({
      ...currentSettings,
      detectedClaudePaths: detectedPaths,
    });

    console.log(`[Claude Detection] Detected ${detectedPaths.length} paths:`, detectedPaths);
    return detectedPaths;
  }
}
