import type { TerminalStatus, AppSettings, TerminalGroup } from './index';

/**
 * Main -> Renderer 消息
 */
export interface MainToRendererMessages {
  // 终端输出
  'terminal:data': {
    terminalId: string;
    data: string;
  };

  // 终端状态变化
  'terminal:status': {
    terminalId: string;
    status: TerminalStatus;
    exitCode?: number;
  };

  // 配置更新
  'config:updated': {
    settings: AppSettings;
  };
}

/**
 * Renderer -> Main 消息
 */
export interface RendererToMainMessages {
  // 创建终端
  'terminal:create': {
    terminalId: string;
    cwd: string;
    shell: string;
    cols: number;
    rows: number;
  };

  // 写入终端
  'terminal:write': {
    terminalId: string;
    data: string;
  };

  // 调整终端大小
  'terminal:resize': {
    terminalId: string;
    cols: number;
    rows: number;
  };

  // 关闭终端
  'terminal:kill': {
    terminalId: string;
  };

  // 获取配置
  'config:get': void;

  // 保存配置
  'config:set': {
    settings: Partial<AppSettings>;
  };

  // 保存分组数据
  'groups:save': {
    groups: TerminalGroup[];
  };

  // 加载分组数据
  'groups:load': void;

  // 选择目录
  'dialog:selectDirectory': void;
}
