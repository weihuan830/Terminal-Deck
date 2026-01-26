import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { TerminalGroup, Terminal, GridLayout, AppSettings } from '../types';

interface TerminalStore {
  // 状态
  groups: TerminalGroup[];
  activeGroupId: string | null;
  activeTerminalId: string | null;
  settings: AppSettings;
  isLoading: boolean;

  // 分组操作
  addGroup: (name: string, layout: GridLayout) => TerminalGroup;
  removeGroup: (id: string) => void;
  updateGroup: (id: string, updates: Partial<TerminalGroup>) => void;
  setActiveGroup: (id: string) => void;

  // 终端操作
  addTerminal: (
    groupId: string,
    options: { label: string; cwd: string; shell?: string }
  ) => Terminal;
  removeTerminal: (groupId: string, terminalId: string) => void;
  updateTerminal: (groupId: string, terminalId: string, updates: Partial<Terminal>) => void;
  setActiveTerminal: (id: string | null) => void;
  moveTerminal: (fromGroupId: string, toGroupId: string, terminalId: string) => void;

  // 布局操作
  setGroupLayout: (groupId: string, layout: GridLayout) => void;

  // 设置操作
  updateSettings: (settings: Partial<AppSettings>) => void;

  // 数据操作
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;

  // 辅助方法
  getActiveGroup: () => TerminalGroup | null;
  getTerminal: (groupId: string, terminalId: string) => Terminal | null;
}

// 生成随机颜色
function generateRandomColor(): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", monospace',
  defaultShell: 'default',
  defaultCwd: '',
  scrollbackLines: 10000,
  shortcuts: {},
};

export const useTerminalStore = create<TerminalStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      groups: [],
      activeGroupId: null,
      activeTerminalId: null,
      settings: DEFAULT_SETTINGS,
      isLoading: true,

      // 分组操作
      addGroup: (name, layout) => {
        const newGroup: TerminalGroup = {
          id: uuidv4(),
          name,
          color: generateRandomColor(),
          layout,
          terminals: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          groups: [...state.groups, newGroup],
          activeGroupId: newGroup.id,
        }));

        // 保存到持久化存储
        get().saveToStorage();

        return newGroup;
      },

      removeGroup: (id) => {
        const { groups } = get();
        const group = groups.find((g) => g.id === id);

        // 关闭该组所有终端
        if (group) {
          for (const terminal of group.terminals) {
            window.electronAPI?.terminal.kill(terminal.id);
          }
        }

        set((state) => {
          const newGroups = state.groups.filter((g) => g.id !== id);
          const newActiveId =
            state.activeGroupId === id ? newGroups[0]?.id ?? null : state.activeGroupId;

          return {
            groups: newGroups,
            activeGroupId: newActiveId,
          };
        });

        get().saveToStorage();
      },

      updateGroup: (id, updates) => {
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id ? { ...g, ...updates, updatedAt: Date.now() } : g
          ),
        }));

        get().saveToStorage();
      },

      setActiveGroup: (id) => {
        set({ activeGroupId: id, activeTerminalId: null });
        get().saveToStorage();
      },

      // 终端操作
      addTerminal: (groupId, options) => {
        const { settings } = get();
        const newTerminal: Terminal = {
          id: uuidv4(),
          label: options.label,
          cwd: options.cwd || settings.defaultCwd || '',
          shell: options.shell || settings.defaultShell,
          status: 'idle',
          createdAt: Date.now(),
        };

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  terminals: [...g.terminals, newTerminal],
                  updatedAt: Date.now(),
                }
              : g
          ),
        }));

        get().saveToStorage();

        return newTerminal;
      },

      removeTerminal: (groupId, terminalId) => {
        // 关闭终端
        window.electronAPI?.terminal.kill(terminalId);

        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  terminals: g.terminals.filter((t) => t.id !== terminalId),
                  updatedAt: Date.now(),
                }
              : g
          ),
          activeTerminalId: state.activeTerminalId === terminalId ? null : state.activeTerminalId,
        }));

        get().saveToStorage();
      },

      updateTerminal: (groupId, terminalId, updates) => {
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  terminals: g.terminals.map((t) => (t.id === terminalId ? { ...t, ...updates } : t)),
                  updatedAt: Date.now(),
                }
              : g
          ),
        }));
      },

      setActiveTerminal: (id) => {
        set({ activeTerminalId: id });
      },

      moveTerminal: (fromGroupId, toGroupId, terminalId) => {
        if (fromGroupId === toGroupId) return;

        const { groups } = get();
        const fromGroup = groups.find((g) => g.id === fromGroupId);
        const terminal = fromGroup?.terminals.find((t) => t.id === terminalId);

        if (!terminal) return;

        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id === fromGroupId) {
              // 从源分组移除
              return {
                ...g,
                terminals: g.terminals.filter((t) => t.id !== terminalId),
                updatedAt: Date.now(),
              };
            }
            if (g.id === toGroupId) {
              // 添加到目标分组
              return {
                ...g,
                terminals: [...g.terminals, terminal],
                updatedAt: Date.now(),
              };
            }
            return g;
          }),
        }));

        get().saveToStorage();
      },

      // 布局操作
      setGroupLayout: (groupId, layout) => {
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, layout, updatedAt: Date.now() } : g
          ),
        }));

        get().saveToStorage();
      },

      // 设置操作
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));

        // 保存到 Electron store
        window.electronAPI?.config.set(newSettings);
      },

      // 数据操作
      loadFromStorage: async () => {
        try {
          if (window.electronAPI) {
            const data = await window.electronAPI.groups.load();
            const settings = await window.electronAPI.config.get();

            set({
              groups: data.groups || [],
              activeGroupId: data.lastActiveGroupId || data.groups?.[0]?.id || null,
              settings: settings || DEFAULT_SETTINGS,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Failed to load groups:', error);
          set({ isLoading: false });
        }
      },

      saveToStorage: async () => {
        const { groups } = get();
        try {
          await window.electronAPI?.groups.save(groups);
        } catch (error) {
          console.error('Failed to save groups:', error);
        }
      },

      // 辅助方法
      getActiveGroup: () => {
        const { groups, activeGroupId } = get();
        return groups.find((g) => g.id === activeGroupId) || null;
      },

      getTerminal: (groupId, terminalId) => {
        const { groups } = get();
        const group = groups.find((g) => g.id === groupId);
        return group?.terminals.find((t) => t.id === terminalId) || null;
      },
    }),
    {
      name: 'terminal-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        groups: state.groups,
        activeGroupId: state.activeGroupId,
        settings: state.settings,
      }),
    }
  )
);
