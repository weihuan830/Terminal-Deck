import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
// WebGL addon 禁用 - 多终端时会耗尽 WebGL context 导致内存溢出
// import { WebglAddon } from '@xterm/addon-webgl';
import { useTerminalStore } from '../stores/terminal-store';
import type { TerminalStatus } from '../types';

interface UseTerminalOptions {
  terminalId: string;
  groupId: string;
  isVisible?: boolean; // 终端当前是否可见（分组激活且在当前页）
}

const darkTerminalTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#ffffff',
  cursorAccent: '#000000',
  selectionBackground: '#264f78',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
};

const lightTerminalTheme = {
  background: '#ffffff',
  foreground: '#1e1e1e',
  cursor: '#000000',
  cursorAccent: '#ffffff',
  selectionBackground: '#add6ff',
  black: '#000000',
  red: '#cd3131',
  green: '#008000',
  yellow: '#949800',
  blue: '#0451a5',
  magenta: '#bc05bc',
  cyan: '#0598bc',
  white: '#555555',
  brightBlack: '#666666',
  brightRed: '#cd3131',
  brightGreen: '#14ce14',
  brightYellow: '#b5ba00',
  brightBlue: '#0451a5',
  brightMagenta: '#bc05bc',
  brightCyan: '#0598bc',
  brightWhite: '#a5a5a5',
};

function getTerminalTheme(theme: string): typeof darkTerminalTheme {
  if (theme === 'light') return lightTerminalTheme;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? darkTerminalTheme : lightTerminalTheme;
  }
  return darkTerminalTheme;
}

export function useTerminal({ terminalId, groupId, isVisible = true }: UseTerminalOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isInitializedRef = useRef(false);
  const isReadyRef = useRef(false);  // 终端完全准备好后才允许 resize

  // resize 相关状态
  const isResizingRef = useRef(false);  // 是否正在调整大小
  const lastSizeRef = useRef<{ cols: number; rows: number } | null>(null);  // 上次同步给 PTY 的尺寸
  const pendingDataRef = useRef<string[]>([]);  // resize 期间缓冲的数据

  // 使用 selector 获取稳定的值，避免对象引用变化导致无限重渲染
  const settings = useTerminalStore((state) => state.settings);
  const updateTerminal = useTerminalStore((state) => state.updateTerminal);

  // 只获取需要的终端数据字段，并使用 ref 存储避免依赖变化
  const terminalDataRef = useRef<{ cwd: string; shell: string } | null>(null);
  const terminalData = useTerminalStore((state) => {
    const group = state.groups.find((g) => g.id === groupId);
    const terminal = group?.terminals.find((t) => t.id === terminalId);
    return terminal ? { cwd: terminal.cwd, shell: terminal.shell } : null;
  });

  // 更新 ref
  if (terminalData) {
    terminalDataRef.current = terminalData;
  }

  // 使用 ref 保存 groupId，这样 updateTerminal 可以获取最新值
  // 但不会触发 effect 重新运行
  const groupIdRef = useRef(groupId);
  groupIdRef.current = groupId;

  // 初始化 - 只在组件挂载时运行一次
  // 注意：不依赖 groupId，因为终端移动到其他分组时不应该重建 PTY
  useEffect(() => {
    // 使用 mounted 标志防止 React StrictMode 双重调用
    let mounted = true;

    const init = async () => {
      if (!mounted || !containerRef.current || isInitializedRef.current || !terminalDataRef.current) return;

      // 立即标记为已初始化，防止重复调用
      isInitializedRef.current = true;

      // 创建 xterm 实例
      const terminal = new Terminal({
        cursorBlink: false,  // 禁用光标闪烁以降低 CPU 占用
        cursorStyle: 'block',
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        theme: getTerminalTheme(settings.theme),
        scrollback: settings.scrollbackLines,
        allowTransparency: true,
      });

      // 添加 fit addon
      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      // 挂载到 DOM
      terminal.open(containerRef.current);

      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;

      // 使用 requestAnimationFrame 确保 DOM 完全渲染后再 fit
      // 这比 setTimeout(0) 更可靠，因为它会在下一次重绘前执行
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!mounted) {
              resolve();
              return;
            }
            // 只在容器有合理尺寸时 fit（隐藏终端是 1x1，fit 会得到错误的极小值）
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect && rect.width > 1 && rect.height > 1) {
              try {
                fitAddon.fit();
              } catch (e) {
                console.warn('Failed to fit terminal:', e);
              }
            }
            resolve();
          });
        });
      });

      if (!mounted) return;

      // 创建 PTY 进程
      // 如果终端当前隐藏（1x1），cols/rows 可能是 xterm 默认值（80x24），这是正确的
      // 当终端变为可见时，ResizeObserver + visibility effect 会重新 fit 到正确尺寸
      const data = terminalDataRef.current!;
      const initCols = terminal.cols >= 10 ? terminal.cols : 80;
      const initRows = terminal.rows >= 4 ? terminal.rows : 24;
      const result = await window.electronAPI.terminal.create({
        terminalId,
        cwd: data.cwd || '',
        shell: data.shell || 'default',
        cols: initCols,
        rows: initRows,
        customPaths: settings.customPaths,
        customEnvVars: settings.customEnvVars,
      });

      if (!mounted) return;

      if (result.success) {
        updateTerminal(groupIdRef.current, terminalId, { status: 'running' });
        isReadyRef.current = true;

        // 如果原路径不存在，使用了回退目录，显示警告
        if (result.fallbackCwd) {
          terminal.writeln(`\x1b[33m[警告] 原工作目录不存在，已切换到: ${result.fallbackCwd}\x1b[0m\r\n`);
          // 更新 store 中的 cwd
          updateTerminal(groupIdRef.current, terminalId, { cwd: result.fallbackCwd });
        }
      } else {
        updateTerminal(groupIdRef.current, terminalId, { status: 'error' });
        terminal.writeln(`\r\n\x1b[31mError: ${result.error}\x1b[0m`);
        isReadyRef.current = true;
      }

      // 监听用户输入
      terminal.onData((inputData) => {
        window.electronAPI.terminal.write(terminalId, inputData);
      });

      // 监听大小变化 - 立即同步给 PTY
      terminal.onResize(({ cols, rows }) => {
        // 记录尺寸，避免重复发送相同尺寸
        if (lastSizeRef.current?.cols === cols && lastSizeRef.current?.rows === rows) {
          return;
        }
        lastSizeRef.current = { cols, rows };
        window.electronAPI.terminal.resize(terminalId, cols, rows);
      });

      // 记录初始尺寸
      lastSizeRef.current = { cols: terminal.cols, rows: terminal.rows };
    };

    init();

    return () => {
      mounted = false;
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }
      // 清理 resize 相关状态
      pendingDataRef.current = [];
      isResizingRef.current = false;
      lastSizeRef.current = null;
      // 注意：不重置 isInitializedRef，因为组件卸载后不会再挂载相同的终端
      isReadyRef.current = false;
    };
    // 只依赖 terminalId，不依赖 groupId
    // 终端移动到其他分组时不应该重建 PTY 进程
  }, [terminalId]);

  // 主题变化时更新 xterm 主题
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = getTerminalTheme(settings.theme);
    }
  }, [settings.theme]);

  // 当终端从隐藏(1x1)变为可见(grid cell)时的兜底 fit
  // 新架构下 ResizeObserver 会在 1x1→正常尺寸 时自然触发，
  // 但此 effect 作为双保险，确保 fit 一定执行
  useEffect(() => {
    if (!isVisible || !isReadyRef.current || !fitAddonRef.current || !terminalRef.current) return;

    let cancelled = false;
    // 双 rAF 等待 DOM 布局完成
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled || !fitAddonRef.current || !terminalRef.current) return;
        try {
          fitAddonRef.current.fit();
          terminalRef.current.refresh(0, terminalRef.current.rows - 1);
        } catch (e) {
          console.warn('Failed to fit terminal on visibility change:', e);
        }
      });
    });

    return () => { cancelled = true; };
  }, [isVisible]);

  // 监听终端数据 - 带 resize 缓冲
  useEffect(() => {
    const unsubscribe = window.electronAPI.terminal.onData(
      ({ terminalId: id, data }: { terminalId: string; data: string }) => {
        if (id === terminalId && terminalRef.current) {
          if (isResizingRef.current) {
            // resize 期间缓冲数据，但限制缓冲区大小防止内存溢出
            if (pendingDataRef.current.length < 100) {
              pendingDataRef.current.push(data);
            }
          } else {
            terminalRef.current.write(data);
          }
        }
      }
    );

    return unsubscribe;
  }, [terminalId]);

  // 监听终端状态
  useEffect(() => {
    const unsubscribe = window.electronAPI.terminal.onStatus(
      ({
        terminalId: id,
        status,
        exitCode,
      }: {
        terminalId: string;
        status: string;
        exitCode?: number;
      }) => {
        if (id === terminalId) {
          // 使用 ref 获取最新的 groupId，避免依赖 groupId 导致重新订阅
          updateTerminal(groupIdRef.current, terminalId, {
            status: status as TerminalStatus,
            exitCode,
          });
        }
      }
    );

    return unsubscribe;
  }, [terminalId, updateTerminal]);

  // 处理容器大小变化
  // 策略：使用较长的防抖时间，等待 resize 完全稳定后再同步
  // 这是业界公认的最稳定方案，虽然牺牲了一点实时性，但能避免内容错乱
  useEffect(() => {
    let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastContainerSize = { width: 0, height: 0 };

    // 刷新缓冲的数据并清屏重绘
    const flushAndRefresh = () => {
      if (!terminalRef.current) return;

      // 写入缓冲的数据
      if (pendingDataRef.current.length > 0) {
        const data = pendingDataRef.current.join('');
        pendingDataRef.current = [];
        terminalRef.current.write(data);
      }

      // 强制刷新整个可视区域
      terminalRef.current.refresh(0, terminalRef.current.rows - 1);
      isResizingRef.current = false;
    };

    // 执行实际的 resize 操作
    const performResize = () => {
      if (!isReadyRef.current || !fitAddonRef.current || !terminalRef.current) {
        return;
      }

      try {
        // 执行 fit，这会计算新的 cols/rows 并触发 terminal.onResize
        // terminal.onResize 会通过 IPC 同步给 PTY
        fitAddonRef.current.fit();

        // 等待 PTY 处理完 resize（给一个合理的延迟让 PTY 响应 SIGWINCH）
        // 然后再恢复数据写入
        setTimeout(flushAndRefresh, 50);
      } catch (e) {
        console.warn('Failed to fit terminal on resize:', e);
        isResizingRef.current = false;
      }
    };

    const resizeObserver = new ResizeObserver((entries) => {
      // 检查容器尺寸是否真的变化了
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;

      // 忽略初始化时的调用、相同尺寸和隐藏状态(1x1)
      if (width <= 1 || height <= 1) return;
      if (width === lastContainerSize.width && height === lastContainerSize.height) return;

      lastContainerSize = { width, height };

      // 标记正在 resize，暂停数据写入
      isResizingRef.current = true;

      // 清除之前的定时器
      if (resizeDebounceTimer) {
        clearTimeout(resizeDebounceTimer);
      }

      // 防抖：等待 resize 操作稳定后再执行
      // 使用 150ms 的延迟，这是业界推荐的值
      // 参考: https://xtermjs.org/docs/api/terminal/classes/terminal/
      resizeDebounceTimer = setTimeout(performResize, 150);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (resizeDebounceTimer) {
        clearTimeout(resizeDebounceTimer);
      }
    };
  }, []);

  // 聚焦终端
  const focus = useCallback(() => {
    terminalRef.current?.focus();
  }, []);

  // 清屏
  const clear = useCallback(() => {
    terminalRef.current?.clear();
  }, []);

  // 写入数据
  const write = useCallback(
    (data: string) => {
      window.electronAPI.terminal.write(terminalId, data);
    },
    [terminalId]
  );

  // 手动触发 fit
  const fit = useCallback(() => {
    if (fitAddonRef.current) {
      try {
        fitAddonRef.current.fit();
      } catch (e) {
        console.warn('Failed to fit terminal:', e);
      }
    }
  }, []);

  return {
    containerRef,
    terminal: terminalRef.current,
    terminalInstance: terminalRef.current,
    focus,
    clear,
    write,
    fit,
  };
}
