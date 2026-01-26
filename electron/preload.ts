import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的 API
const electronAPI = {
  // 终端操作
  terminal: {
    create: (options: {
      terminalId: string;
      cwd: string;
      shell: string;
      cols: number;
      rows: number;
    }) => ipcRenderer.invoke('terminal:create', options),

    write: (terminalId: string, data: string) =>
      ipcRenderer.send('terminal:write', { terminalId, data }),

    resize: (terminalId: string, cols: number, rows: number) =>
      ipcRenderer.send('terminal:resize', { terminalId, cols, rows }),

    kill: (terminalId: string) => ipcRenderer.invoke('terminal:kill', { terminalId }),

    onData: (callback: (data: { terminalId: string; data: string }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: { terminalId: string; data: string }) =>
        callback(data);
      ipcRenderer.on('terminal:data', handler);
      return () => ipcRenderer.removeListener('terminal:data', handler);
    },

    onStatus: (
      callback: (data: { terminalId: string; status: string; exitCode?: number }) => void
    ) => {
      const handler = (
        _: Electron.IpcRendererEvent,
        data: { terminalId: string; status: string; exitCode?: number }
      ) => callback(data);
      ipcRenderer.on('terminal:status', handler);
      return () => ipcRenderer.removeListener('terminal:status', handler);
    },
  },

  // 配置操作
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (settings: unknown) => ipcRenderer.invoke('config:set', { settings }),
    detectClaude: () => ipcRenderer.invoke('config:detectClaude'),
  },

  // 分组操作
  groups: {
    load: () => ipcRenderer.invoke('groups:load'),
    save: (groups: unknown) => ipcRenderer.invoke('groups:save', { groups }),
  },

  // 对话框
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  },

  // 菜单事件
  menu: {
    onNewGroup: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:newGroup', handler);
      return () => ipcRenderer.removeListener('menu:newGroup', handler);
    },
    onNewTerminal: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:newTerminal', handler);
      return () => ipcRenderer.removeListener('menu:newTerminal', handler);
    },
    onSettings: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:settings', handler);
      return () => ipcRenderer.removeListener('menu:settings', handler);
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
