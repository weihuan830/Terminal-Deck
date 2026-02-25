import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { TerminalGroup, Terminal, GridLayout, AppSettings } from '../types';

interface TerminalStore {
  // 状态
  groups: TerminalGroup[];
  activeGroupId: string | null;
  activeTerminalId: string | null;
  settings: AppSettings;
  isLoading: boolean;
  groupPages: Record<string, number>; // 每组的当前页码（临时状态，不持久化）

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

  // 分页操作
  setGroupPage: (groupId: string, page: number) => void;

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
  language: 'zh-CN',
  defaultShell: 'default',
  defaultCwd: '',
  scrollbackLines: 10000,
  shortcuts: {},
};

export const useTerminalStore = create<TerminalStore>()(
  (set, get) => ({
    // 初始状态
    groups: [],
    activeGroupId: null,
    activeTerminalId: null,
    settings: DEFAULT_SETTINGS,
    isLoading: true,
    groupPages: {},

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

        // Clean up groupPages entry
        const newGroupPages = { ...state.groupPages };
        delete newGroupPages[id];

        return {
          groups: newGroups,
          activeGroupId: newActiveId,
          groupPages: newGroupPages,
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
      set({
        activeGroupId: id,
        activeTerminalId: null,
      });
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

      set((state) => {
        const newGroups = state.groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                terminals: g.terminals.filter((t) => t.id !== terminalId),
                updatedAt: Date.now(),
              }
            : g
        );

        // Clamp the group's page if needed
        const group = newGroups.find((g) => g.id === groupId);
        const newGroupPages = { ...state.groupPages };
        if (group) {
          const perPage = group.layout.rows * group.layout.cols;
          const totalPages = Math.ceil(group.terminals.length / perPage) || 1;
          const currentPage = newGroupPages[groupId] ?? 0;
          if (currentPage >= totalPages) {
            newGroupPages[groupId] = Math.max(0, totalPages - 1);
          }
        }

        return {
          groups: newGroups,
          groupPages: newGroupPages,
          activeTerminalId: state.activeTerminalId === terminalId ? null : state.activeTerminalId,
        };
      });

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

      // Persist when non-runtime properties change (label, cwd)
      const persistKeys = ['label', 'cwd', 'shell'];
      if (persistKeys.some((k) => k in updates)) {
        get().saveToStorage();
      }
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

      set((state) => {
        const newGroups = state.groups.map((g) => {
          if (g.id === fromGroupId) {
            return {
              ...g,
              terminals: g.terminals.filter((t) => t.id !== terminalId),
              updatedAt: Date.now(),
            };
          }
          if (g.id === toGroupId) {
            return {
              ...g,
              terminals: [...g.terminals, terminal],
              updatedAt: Date.now(),
            };
          }
          return g;
        });

        // Clamp source group's page after removing a terminal
        const newFromGroup = newGroups.find((g) => g.id === fromGroupId);
        const newGroupPages = { ...state.groupPages };
        if (newFromGroup) {
          const perPage = newFromGroup.layout.rows * newFromGroup.layout.cols;
          const totalPages = Math.ceil(newFromGroup.terminals.length / perPage) || 1;
          const currentPage = newGroupPages[fromGroupId] ?? 0;
          if (currentPage >= totalPages) {
            newGroupPages[fromGroupId] = Math.max(0, totalPages - 1);
          }
        }

        return {
          groups: newGroups,
          groupPages: newGroupPages,
        };
      });

      get().saveToStorage();
    },

    // 分页操作
    setGroupPage: (groupId, page) => {
      set((state) => ({
        groupPages: { ...state.groupPages, [groupId]: page },
      }));
    },

    // 布局操作
    setGroupLayout: (groupId, layout) => {
      set((state) => {
        // Clamp page for the new layout
        const group = state.groups.find((g) => g.id === groupId);
        const newGroupPages = { ...state.groupPages };
        if (group) {
          const perPage = layout.rows * layout.cols;
          const totalPages = Math.ceil(group.terminals.length / perPage) || 1;
          const currentPage = newGroupPages[groupId] ?? 0;
          if (currentPage >= totalPages) {
            newGroupPages[groupId] = Math.max(0, totalPages - 1);
          }
        }

        return {
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, layout, updatedAt: Date.now() } : g
          ),
          groupPages: newGroupPages,
        };
      });

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

          // Reset terminal status to 'idle' — PTY processes don't survive app restart
          // but terminals will be re-created when their components mount
          const restoredGroups = (data.groups || []).map((g: TerminalGroup) => ({
            ...g,
            terminals: g.terminals.map((t) => ({
              ...t,
              status: 'idle' as const,
              exitCode: undefined,
            })),
          }));

          // Merge loaded settings with defaults to fill any missing fields
          const mergedSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };

          set({
            groups: restoredGroups,
            activeGroupId: data.lastActiveGroupId || data.groups?.[0]?.id || null,
            settings: mergedSettings,
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
      const { groups, activeGroupId } = get();
      try {
        await window.electronAPI?.groups.save(groups, activeGroupId);
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
  })
);
