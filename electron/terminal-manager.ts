import * as pty from 'node-pty';
import { ipcMain, BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import { execSync } from 'child_process';

interface PtyProcess {
  id: string;
  pty: pty.IPty;
  terminalId: string;
}

export class TerminalManager extends EventEmitter {
  private processes: Map<string, PtyProcess> = new Map();
  private mainWindow: BrowserWindow | null = null;

  /**
   * 初始化
   */
  initialize(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
    this.setupIpcHandlers();
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
    claudePath?: string;    // 用户配置的 Claude 路径
    extraPaths?: string;    // 用户配置的额外 PATH
    detectedClaudePaths?: string[];  // 启动时检测到的路径
  }): { success: boolean; error?: string; fallbackCwd?: string; } {
    try {
      const { terminalId, cwd, shell, cols, rows, claudePath, extraPaths } = options;

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

      // 获取增强的环境变量（包含用户配置和启动时检测的 PATH）
      const enhancedEnv = this.getEnhancedEnv(claudePath, extraPaths, options.detectedClaudePaths);

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
   * 获取完整的环境变量（包括用户配置和启动时检测的 Claude 路径）
   */
  private getEnhancedEnv(claudePath?: string, extraPaths?: string, detectedClaudePaths?: string[]): { [key: string]: string } {
    const env = { ...process.env } as { [key: string]: string };

    if (process.platform === 'win32') {
      const pathsToAdd: string[] = [];

      // 1. 优先使用用户配置的 Claude 路径
      if (claudePath && claudePath.trim()) {
        const trimmedPath = claudePath.trim();
        if (fs.existsSync(trimmedPath)) {
          pathsToAdd.push(trimmedPath);
        }
      }

      // 2. 添加用户配置的额外 PATH
      if (extraPaths && extraPaths.trim()) {
        const extras = extraPaths.split(';').map(p => p.trim()).filter(p => p);
        for (const extra of extras) {
          if (fs.existsSync(extra)) {
            pathsToAdd.push(extra);
          }
        }
      }

      // 3. 如果用户没有配置 Claude 路径，则使用启动时检测到的路径
      if (!claudePath || !claudePath.trim()) {
        if (detectedClaudePaths && detectedClaudePaths.length > 0) {
          // 使用启动时检测的路径，过滤掉不存在的
          const validPaths = detectedClaudePaths.filter(p => fs.existsSync(p));
          pathsToAdd.push(...validPaths);
        }
      }

      // 添加到 PATH
      const currentPath = env.PATH || env.Path || '';
      const uniquePathsToAdd = pathsToAdd.filter(p => !currentPath.includes(p));

      if (uniquePathsToAdd.length > 0) {
        env.PATH = [...uniquePathsToAdd, currentPath].join(';');
        env.Path = env.PATH;
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
   * 清理资源（窗口关闭时调用）
   */
  dispose(): void {
    this.killAll();
    this.mainWindow = null;
  }
}
