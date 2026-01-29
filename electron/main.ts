import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import path from 'path';

// 管理器实例 - 延迟加载
let mainWindow: BrowserWindow | null = null;
let terminalManager: import('./terminal-manager').TerminalManager | null = null;
let configManager: import('./config-manager').ConfigManager | null = null;

// 是否是开发模式
const isDev = !app.isPackaged;

// 是否强制退出（用户确认后）
let forceQuit = false;

/**
 * 创建主窗口
 */
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Terminal Deck',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    // Windows 特定
    ...(process.platform === 'win32' && {
      frame: true,
      autoHideMenuBar: true,
    }),
  });

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 窗口尝试关闭时，检查是否有运行中的终端
  mainWindow.on('close', async (event) => {
    if (forceQuit) {
      return; // 用户已确认退出，允许关闭
    }

    const runningCount = terminalManager?.getRunningCount() || 0;

    if (runningCount > 0) {
      event.preventDefault(); // 阻止默认关闭行为

      const result = await dialog.showMessageBox(mainWindow!, {
        type: 'warning',
        title: '确认退出',
        message: `当前有 ${runningCount} 个终端正在运行`,
        detail: '关闭应用将会终止所有后台运行的 Agent 进程。确定要退出吗？',
        buttons: ['取消', '强制退出'],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      });

      if (result.response === 1) {
        // 用户选择强制退出
        forceQuit = true;
        mainWindow?.close();
      }
    }
  });

  // 窗口关闭后
  mainWindow.on('closed', () => {
    // 清理终端管理器，防止 PTY 继续向已销毁的窗口发送数据
    terminalManager?.dispose();
    mainWindow = null;

    // Windows 上确保应用退出
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

/**
 * 创建应用菜单
 */
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建分组',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:newGroup'),
        },
        {
          label: '新建终端',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow?.webContents.send('menu:newTerminal'),
        },
        { type: 'separator' },
        {
          label: '设置',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('menu:settings'),
        },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'resetZoom', label: '重置缩放' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * 设置 IPC 处理器
 */
function setupIpcHandlers(): void {
  // 选择目录对话框
  ipcMain.handle('dialog:selectDirectory', async () => {
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择工作目录',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });
}

/**
 * 初始化应用
 */
async function bootstrap(): Promise<void> {
  // 单实例锁定
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    return;
  }

  // 等待 app ready
  await app.whenReady();

  try {
    // 延迟加载管理器
    const { TerminalManager } = await import('./terminal-manager');
    const { ConfigManager } = await import('./config-manager');

    terminalManager = new TerminalManager();
    configManager = new ConfigManager();

    // 初始化配置管理器
    configManager.initialize();

    // 在启动时执行 Claude 路径检测（仅在用户未手动配置时）
    const settings = configManager.getSettings();
    if (!settings.claudePath) {
      configManager.runClaudeDetection();
    }
  } catch (error) {
    console.error('Failed to initialize managers:', error);
    dialog.showErrorBox('Initialization Error', `Failed to start: ${error}`);
    app.quit();
    return;
  }

  // 创建主窗口
  createMainWindow();

  // 创建菜单
  createMenu();

  // 设置 IPC 处理器
  setupIpcHandlers();

  // 初始化终端管理器
  if (mainWindow && terminalManager) {
    terminalManager.initialize(mainWindow);
  }

  // macOS 特定：点击 dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  // 第二个实例尝试启动时
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

// 启动应用
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  app.quit();
});

// 所有窗口关闭时退出 (Windows & Linux)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出时清理
app.on('before-quit', () => {
  console.log('App is quitting, cleaning up terminals...');
  terminalManager?.dispose();
});

// 确保所有进程都被清理（Windows 特有问题）
app.on('will-quit', (event) => {
  if (terminalManager && terminalManager.getRunningCount() > 0) {
    event.preventDefault();
    terminalManager.dispose();
    // 给一点时间让进程清理完成
    setTimeout(() => {
      app.quit();
    }, 500);
  }
});
