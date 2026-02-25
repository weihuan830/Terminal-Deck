import Store from 'electron-store';
import { ipcMain } from 'electron';
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

}
