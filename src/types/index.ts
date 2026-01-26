/**
 * 网格布局配置
 */
export interface GridLayout {
  rows: number; // 行数 1-4
  cols: number; // 列数 1-4
}

/**
 * 预设布局
 */
export const PRESET_LAYOUTS: Record<string, GridLayout> = {
  '2x2': { rows: 2, cols: 2 },
  '2x3': { rows: 2, cols: 3 },
  '2x4': { rows: 2, cols: 4 },
  '3x2': { rows: 3, cols: 2 },
  '3x3': { rows: 3, cols: 3 },
  '3x4': { rows: 3, cols: 4 },
  '4x2': { rows: 4, cols: 2 },
  '4x3': { rows: 4, cols: 3 },
  '4x4': { rows: 4, cols: 4 },
};

/**
 * 终端状态
 */
export type TerminalStatus = 'idle' | 'running' | 'exited' | 'error';

/**
 * 单个终端实例
 */
export interface Terminal {
  id: string; // 唯一标识 (UUID)
  label: string; // 显示名称
  cwd: string; // 工作目录
  shell: string; // shell 路径
  status: TerminalStatus; // 运行状态
  exitCode?: number; // 退出码
  createdAt: number; // 创建时间戳

  // 运行时属性 (不持久化)
  ptyId?: string; // 对应的 PTY 进程 ID
}

/**
 * 终端分组
 */
export interface TerminalGroup {
  id: string; // 唯一标识 (UUID)
  name: string; // 分组名称
  color: string; // 分组颜色 (hex)
  layout: GridLayout; // 网格布局
  terminals: Terminal[]; // 终端列表
  createdAt: number; // 创建时间戳
  updatedAt: number; // 更新时间戳
}

/**
 * 应用设置
 */
export interface AppSettings {
  // 外观
  theme: 'dark' | 'light' | 'system';
  fontSize: number;
  fontFamily: string;

  // 终端
  defaultShell: string;
  defaultCwd: string;
  scrollbackLines: number;

  // Claude CLI 配置
  claudePath?: string;       // Claude 可执行文件路径（用户手动配置）
  extraPaths?: string;       // 额外的 PATH 路径（分号分隔）
  detectedClaudePaths?: string[];  // 自动检测到的 Claude 路径（启动时检测）

  // 快捷键
  shortcuts: Record<string, string>;

  // 窗口
  windowBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * 完整应用状态
 */
export interface AppState {
  groups: TerminalGroup[];
  activeGroupId: string | null;
  activeTerminalId: string | null;
  settings: AppSettings;
}

/**
 * 持久化数据结构
 */
export interface PersistedData {
  version: number;
  groups: TerminalGroup[];
  lastActiveGroupId: string | null;
  settings: AppSettings;
}
