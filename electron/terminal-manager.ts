import * as pty from 'node-pty';
import { ipcMain, BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ResourceLogger } from './resource-logger';

interface PtyProcess {
  id: string;
  pty: pty.IPty;
  terminalId: string;
}

export class TerminalManager extends EventEmitter {
  private processes: Map<string, PtyProcess> = new Map();
  private mainWindow: BrowserWindow | null = null;
  private resourceLogger: ResourceLogger = new ResourceLogger();

  /**
   * 初始化
   */
  initialize(mainWindow: BrowserWindow, resourceLogging = true): void {
    this.mainWindow = mainWindow;
    this.setupIpcHandlers();
    this.resourceLogger.setEnabled(resourceLogging);
    this.resourceLogger.start(this.processes);
  }

  /**
   * 设置 IPC 处理器
   */
  private setupIpcHandlers(): void {
    // 创建终端
    ipcMain.handle('terminal:create', async (_, args) => {
      return this.createTerminal(args);
    });

    // 写入数据
    ipcMain.on('terminal:write', (_, { terminalId, data }) => {
      this.writeToTerminal(terminalId, data);
    });

    // 调整大小
    ipcMain.on('terminal:resize', (_, { terminalId, cols, rows }) => {
      this.resizeTerminal(terminalId, cols, rows);
    });

    // 关闭终端
    ipcMain.handle('terminal:kill', async (_, { terminalId }) => {
      return this.killTerminal(terminalId);
    });
  }

  /**
   * 创建终端进程
   */
  createTerminal(options: {
    terminalId: string;
    cwd: string;
    shell: string;
    cols: number;
    rows: number;
    customPaths?: string;       // 自定义 PATH 路径
    customEnvVars?: string;     // 自定义环境变量
  }): { success: boolean; error?: string; fallbackCwd?: string; } {
    try {
      const { terminalId, cwd, shell, cols, rows } = options;

      // 如果同一个 terminalId 已存在旧的 PTY 进程，先清理掉，防止泄漏
      // （终端在分组间拖拽时，React 会 unmount+remount，导致重复 create）
      if (this.processes.has(terminalId)) {
        this.killTerminal(terminalId);
      }

      // 检测 shell
      const shellPath = this.resolveShell(shell);
      const shellArgs = this.getShellArgs(shellPath);

      // 确保 cwd 有效，如果路径不存在则回退到用户目录
      const fallbackDir = process.env.USERPROFILE || process.env.HOME || process.cwd();
      let workingDir = cwd || fallbackDir;
      let usedFallback = false;

      // 检查路径是否存在
      if (workingDir && workingDir !== fallbackDir) {
        try {
          const stat = fs.statSync(workingDir);
          if (!stat.isDirectory()) {
            workingDir = fallbackDir;
            usedFallback = true;
          }
        } catch {
          // 路径不存在，使用回退目录
          workingDir = fallbackDir;
          usedFallback = true;
        }
      }

      // 获取增强的环境变量（包含用户自定义 PATH 和环境变量）
      const enhancedEnv = this.getEnhancedEnv(options.customPaths, options.customEnvVars);

      // 创建 PTY
      const ptyProcess = pty.spawn(shellPath, shellArgs, {
        name: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: workingDir,
        env: {
          ...enhancedEnv,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
        useConpty: process.platform === 'win32',
      });

      const id = `pty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 保存进程引用
      this.processes.set(terminalId, {
        id,
        pty: ptyProcess,
        terminalId,
      });

      // 监听输出
      ptyProcess.onData((data: string) => {
        this.sendToRenderer('terminal:data', { terminalId, data });
      });

      // 监听退出
      ptyProcess.onExit(({ exitCode }) => {
        this.sendToRenderer('terminal:status', {
          terminalId,
          status: 'exited',
          exitCode,
        });
        this.processes.delete(terminalId);
      });

      // 如果使用了回退目录，返回新的工作目录让前端更新
      return {
        success: true,
        fallbackCwd: usedFallback ? workingDir : undefined,
      };
    } catch (error) {
      console.error('Failed to create terminal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 解析 shell 路径
   */
  private resolveShell(shell: string): string {
    if (shell && shell !== 'default') {
      return shell;
    }

    switch (process.platform) {
      case 'win32':
        // Windows 默认使用 PowerShell（COMSPEC 通常是 cmd.exe）
        return 'powershell.exe';
      case 'darwin':
        return process.env.SHELL || '/bin/zsh';
      default:
        return process.env.SHELL || '/bin/bash';
    }
  }

  /**
   * 获取 shell 参数
   */
  private getShellArgs(shell: string): string[] {
    if (process.platform === 'win32') {
      if (shell.toLowerCase().includes('powershell')) {
        // 不使用 -NoProfile，确保加载用户的 PowerShell 配置文件
        // 这样可以获取到用户在配置文件中设置的 PATH 和其他环境变量
        return ['-NoLogo', '-NoExit'];
      }
      return [];
    }
    return [];
  }

  /**
   * 获取增强的环境变量（包含用户自定义 PATH 和环境变量）
   */
  private getEnhancedEnv(customPaths?: string, customEnvVars?: string): { [key: string]: string } {
    const env = { ...process.env } as { [key: string]: string };
    const delimiter = path.delimiter; // Windows: ';', macOS/Linux: ':'

    // 注入自定义 PATH
    if (customPaths && customPaths.trim()) {
      const pathsToAdd = customPaths.split(delimiter).map(p => p.trim()).filter(p => p);
      const validPaths = pathsToAdd.filter(p => fs.existsSync(p));

      if (validPaths.length > 0) {
        const currentPath = env.PATH || env.Path || '';
        const uniquePaths = validPaths.filter(p => !currentPath.includes(p));

        if (uniquePaths.length > 0) {
          env.PATH = [...uniquePaths, currentPath].join(delimiter);
          if (process.platform === 'win32') {
            env.Path = env.PATH;
          }
        }
      }
    }

    // 注入自定义环境变量
    if (customEnvVars && customEnvVars.trim()) {
      const lines = customEnvVars.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim();
          const value = trimmed.substring(eqIndex + 1).trim();
          if (key) {
            env[key] = value;
          }
        }
      }
    }

    return env;
  }

  /**
   * 写入终端
   */
  writeToTerminal(terminalId: string, data: string): void {
    const proc = this.processes.get(terminalId);
    if (proc) {
      proc.pty.write(data);
    }
  }

  /**
   * 调整终端大小
   */
  resizeTerminal(terminalId: string, cols: number, rows: number): void {
    const proc = this.processes.get(terminalId);
    if (proc && cols > 0 && rows > 0) {
      try {
        proc.pty.resize(cols, rows);
      } catch (error) {
        console.error('Failed to resize terminal:', error);
      }
    }
  }

  /**
   * 关闭终端
   */
  killTerminal(terminalId: string): { success: boolean } {
    const proc = this.processes.get(terminalId);
    if (proc) {
      try {
        // Windows 上需要强制杀死进程树
        if (process.platform === 'win32') {
          // 先尝试正常 kill
          proc.pty.kill();
          // 然后用 taskkill 强制杀死进程树
          const pid = proc.pty.pid;
          if (pid) {
            try {
              execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
            } catch {
              // 进程可能已经退出，忽略错误
            }
          }
        } else {
          proc.pty.kill();
        }
      } catch (error) {
        console.error('Failed to kill terminal:', error);
      }
      this.processes.delete(terminalId);
      return { success: true };
    }
    return { success: false };
  }

  /**
   * 关闭所有终端
   */
  killAll(): void {
    for (const [, proc] of this.processes) {
      try {
        // Windows 上需要强制杀死进程树
        if (process.platform === 'win32') {
          proc.pty.kill();
          const pid = proc.pty.pid;
          if (pid) {
            try {
              execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
            } catch {
              // 进程可能已经退出，忽略错误
            }
          }
        } else {
          proc.pty.kill();
        }
      } catch (error) {
        console.error('Failed to kill terminal:', error);
      }
    }
    this.processes.clear();
  }

  /**
   * 获取运行中的终端数量
   */
  getRunningCount(): number {
    return this.processes.size;
  }

  /**
   * 发送消息到渲染进程
   */
  private sendToRenderer(channel: string, data: unknown): void {
    // 检查窗口是否存在且未被销毁
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      try {
        this.mainWindow.webContents.send(channel, data);
      } catch (error) {
        // 忽略发送失败的错误（窗口可能正在关闭）
        console.warn('Failed to send to renderer:', error);
      }
    }
  }

  /**
   * 设置资源日志开关
   */
  setResourceLogging(enabled: boolean): void {
    this.resourceLogger.setEnabled(enabled);
  }

  /**
   * 清理资源（窗口关闭时调用）
   */
  dispose(): void {
    this.resourceLogger.stop();
    this.killAll();
    this.mainWindow = null;
  }
}
