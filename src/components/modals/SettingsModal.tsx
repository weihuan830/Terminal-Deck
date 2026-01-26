import React, { useState } from 'react';
import { Modal } from './Modal';
import { useTerminalStore } from '../../stores/terminal-store';
import { cn } from '../../utils/cn';

interface SettingsModalProps {
  onClose: () => void;
}

type SettingsTab = 'general' | 'claude';

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { settings, updateSettings } = useTerminalStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [showHelp, setShowHelp] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const handleRedetect = async () => {
    setIsDetecting(true);
    try {
      const detectedPaths = await window.electronAPI.config.detectClaude();
      setLocalSettings((s) => ({
        ...s,
        detectedClaudePaths: detectedPaths,
      }));
    } catch (error) {
      console.error('Failed to detect Claude paths:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  return (
    <Modal title="设置" onClose={onClose} width="max-w-2xl">
      <div className="flex gap-4">
        {/* 左侧标签页 */}
        <div className="w-32 flex-shrink-0 border-r border-border-color pr-4">
          <button
            onClick={() => setActiveTab('general')}
            className={cn(
              'w-full text-left px-3 py-2 rounded text-sm transition-colors',
              activeTab === 'general'
                ? 'bg-bg-active text-fg-primary'
                : 'text-fg-secondary hover:bg-bg-hover'
            )}
          >
            常规
          </button>
          <button
            onClick={() => setActiveTab('claude')}
            className={cn(
              'w-full text-left px-3 py-2 rounded text-sm transition-colors',
              activeTab === 'claude'
                ? 'bg-bg-active text-fg-primary'
                : 'text-fg-secondary hover:bg-bg-hover'
            )}
          >
            Claude CLI
          </button>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 space-y-6">
          {activeTab === 'general' && (
            <>
              {/* 外观设置 */}
              <div>
                <h3 className="text-sm font-medium text-fg-primary mb-3">外观</h3>
          <div className="space-y-3">
            {/* 字体大小 */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-fg-secondary">字体大小</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setLocalSettings((s) => ({
                      ...s,
                      fontSize: Math.max(10, s.fontSize - 1),
                    }))
                  }
                  className="p-1 hover:bg-bg-hover rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
                  </svg>
                </button>
                <span className="w-8 text-center text-fg-primary">{localSettings.fontSize}</span>
                <button
                  onClick={() =>
                    setLocalSettings((s) => ({
                      ...s,
                      fontSize: Math.min(24, s.fontSize + 1),
                    }))
                  }
                  className="p-1 hover:bg-bg-hover rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* 字体 */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-fg-secondary">字体</label>
              <input
                type="text"
                value={localSettings.fontFamily}
                onChange={(e) =>
                  setLocalSettings((s) => ({
                    ...s,
                    fontFamily: e.target.value,
                  }))
                }
                className={cn(
                  'w-64 px-2 py-1 rounded text-sm',
                  'bg-bg-tertiary border border-border-color',
                  'text-fg-primary',
                  'focus:border-border-active focus:outline-none'
                )}
              />
            </div>
          </div>
        </div>

        {/* 终端设置 */}
        <div>
          <h3 className="text-sm font-medium text-fg-primary mb-3">终端</h3>
          <div className="space-y-3">
            {/* 默认 Shell */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-fg-secondary">默认 Shell</label>
              <input
                type="text"
                value={localSettings.defaultShell}
                onChange={(e) =>
                  setLocalSettings((s) => ({
                    ...s,
                    defaultShell: e.target.value,
                  }))
                }
                placeholder="default"
                className={cn(
                  'w-64 px-2 py-1 rounded text-sm',
                  'bg-bg-tertiary border border-border-color',
                  'text-fg-primary placeholder-fg-muted',
                  'focus:border-border-active focus:outline-none'
                )}
              />
            </div>

            {/* 默认工作目录 */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-fg-secondary">默认工作目录</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={localSettings.defaultCwd}
                  onChange={(e) =>
                    setLocalSettings((s) => ({
                      ...s,
                      defaultCwd: e.target.value,
                    }))
                  }
                  placeholder="留空使用用户目录"
                  className={cn(
                    'w-48 px-2 py-1 rounded text-sm',
                    'bg-bg-tertiary border border-border-color',
                    'text-fg-primary placeholder-fg-muted',
                    'focus:border-border-active focus:outline-none'
                  )}
                />
                <button
                  onClick={async () => {
                    const dir = await window.electronAPI.dialog.selectDirectory();
                    if (dir) {
                      setLocalSettings((s) => ({ ...s, defaultCwd: dir }));
                    }
                  }}
                  className="px-2 py-1 text-sm bg-bg-tertiary hover:bg-bg-hover rounded"
                >
                  浏览
                </button>
              </div>
            </div>

            {/* 回滚行数 */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-fg-secondary">回滚行数</label>
              <input
                type="number"
                value={localSettings.scrollbackLines}
                onChange={(e) =>
                  setLocalSettings((s) => ({
                    ...s,
                    scrollbackLines: parseInt(e.target.value) || 1000,
                  }))
                }
                min={100}
                max={100000}
                className={cn(
                  'w-32 px-2 py-1 rounded text-sm',
                  'bg-bg-tertiary border border-border-color',
                  'text-fg-primary',
                  'focus:border-border-active focus:outline-none'
                )}
              />
            </div>
          </div>
        </div>
            </>
          )}

          {activeTab === 'claude' && (
            <>
              {/* Claude CLI 配置 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-fg-primary">Claude CLI 路径配置</h3>
                  <button
                    onClick={() => setShowHelp(!showHelp)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    {showHelp ? '隐藏教程' : '查看教程'}
                  </button>
                </div>

                {/* 教程说明 */}
                {showHelp && (
                  <div className="mb-4 p-3 bg-bg-tertiary rounded-lg text-xs text-fg-secondary space-y-3">
                    <div>
                      <p className="font-medium text-fg-primary mb-1">如何找到 Claude 的安装路径？</p>
                      <p className="mb-2">在 PowerShell 或 CMD 中运行以下命令：</p>
                      <div className="bg-black/30 p-2 rounded font-mono text-green-400 mb-2">
                        where claude
                      </div>
                      <p className="mb-1">如果安装了 Claude，会显示类似：</p>
                      <div className="bg-black/30 p-2 rounded font-mono text-yellow-400 text-[11px] break-all">
                        C:\Users\你的用户名\AppData\Local\Microsoft\WinGet\Packages\Anthropic.ClaudeCode_...\claude.exe
                      </div>
                    </div>

                    <div className="border-t border-border-color pt-3">
                      <p className="font-medium text-fg-primary mb-1">npm 全局安装的情况：</p>
                      <p className="mb-2">如果是通过 npm 安装的，路径通常是：</p>
                      <div className="bg-black/30 p-2 rounded font-mono text-yellow-400 text-[11px]">
                        C:\Users\你的用户名\AppData\Roaming\npm
                      </div>
                      <p className="mt-2 text-orange-400">
                        注意：npm 安装的 claude 会生成 .ps1 脚本，可能受 PowerShell 执行策略限制。
                        建议使用 WinGet 安装：<span className="font-mono">winget install claude</span>
                      </p>
                    </div>

                    <div className="border-t border-border-color pt-3">
                      <p className="font-medium text-fg-primary mb-1">填写说明：</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Claude 路径</strong>：填写 claude.exe 所在的文件夹路径（不是 .exe 文件本身）</li>
                        <li><strong>额外 PATH</strong>：如果有其他工具也找不到，可以添加多个路径，用英文分号 ; 分隔</li>
                        <li>留空则使用自动检测</li>
                      </ul>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Claude 路径 */}
                  <div>
                    <label className="block text-sm text-fg-secondary mb-1">
                      Claude 可执行文件所在目录
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={localSettings.claudePath || ''}
                        onChange={(e) =>
                          setLocalSettings((s) => ({
                            ...s,
                            claudePath: e.target.value,
                          }))
                        }
                        placeholder="留空使用自动检测"
                        className={cn(
                          'flex-1 px-2 py-1.5 rounded text-sm',
                          'bg-bg-tertiary border border-border-color',
                          'text-fg-primary placeholder-fg-muted',
                          'focus:border-border-active focus:outline-none'
                        )}
                      />
                      <button
                        onClick={async () => {
                          const dir = await window.electronAPI.dialog.selectDirectory();
                          if (dir) {
                            setLocalSettings((s) => ({ ...s, claudePath: dir }));
                          }
                        }}
                        className="px-3 py-1.5 text-sm bg-bg-tertiary hover:bg-bg-hover rounded border border-border-color"
                      >
                        浏览
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-fg-muted">
                      示例：C:\Users\xxx\AppData\Local\Microsoft\WinGet\Packages\Anthropic.ClaudeCode_...
                    </p>
                  </div>

                  {/* 额外 PATH */}
                  <div>
                    <label className="block text-sm text-fg-secondary mb-1">
                      额外 PATH 路径（可选）
                    </label>
                    <input
                      type="text"
                      value={localSettings.extraPaths || ''}
                      onChange={(e) =>
                        setLocalSettings((s) => ({
                          ...s,
                          extraPaths: e.target.value,
                        }))
                      }
                      placeholder="多个路径用分号分隔，如：C:\path1;D:\path2"
                      className={cn(
                        'w-full px-2 py-1.5 rounded text-sm',
                        'bg-bg-tertiary border border-border-color',
                        'text-fg-primary placeholder-fg-muted',
                        'focus:border-border-active focus:outline-none'
                      )}
                    />
                    <p className="mt-1 text-xs text-fg-muted">
                      这些路径会被添加到终端的 PATH 环境变量中
                    </p>
                  </div>

                  {/* 自动检测结果 */}
                  <div className="p-3 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-fg-muted">自动检测到的路径：</p>
                      <button
                        onClick={handleRedetect}
                        disabled={isDetecting}
                        className={cn(
                          'px-2 py-1 text-xs rounded',
                          'bg-bg-hover hover:bg-bg-active transition-colors',
                          'text-fg-secondary hover:text-fg-primary',
                          isDetecting && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {isDetecting ? '检测中...' : '重新检测'}
                      </button>
                    </div>
                    <div className="text-xs space-y-1">
                      {localSettings.detectedClaudePaths && localSettings.detectedClaudePaths.length > 0 ? (
                        localSettings.detectedClaudePaths.map((p, i) => (
                          <p key={i} className="text-green-400 font-mono text-[11px] break-all">
                            {p}
                          </p>
                        ))
                      ) : (
                        <p className="text-yellow-400">未检测到 Claude CLI 路径，请手动配置</p>
                      )}
                    </div>
                  </div>

                  {/* 当前状态 */}
                  <div className="p-3 bg-bg-tertiary rounded-lg">
                    <p className="text-xs text-fg-muted mb-2">当前配置状态：</p>
                    <div className="text-xs space-y-1">
                      <p>
                        <span className="text-fg-secondary">Claude 路径（手动）：</span>
                        <span className="text-fg-primary">
                          {localSettings.claudePath || '(未配置，使用自动检测)'}
                        </span>
                      </p>
                      <p>
                        <span className="text-fg-secondary">额外 PATH：</span>
                        <span className="text-fg-primary">
                          {localSettings.extraPaths || '(无)'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 按钮 */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
            <button
              onClick={onClose}
              className={cn(
                'px-4 py-2 rounded',
                'text-fg-secondary hover:text-fg-primary',
                'hover:bg-bg-hover transition-colors'
              )}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className={cn(
                'px-4 py-2 rounded',
                'bg-accent-primary text-white',
                'hover:bg-accent-secondary transition-colors'
              )}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
