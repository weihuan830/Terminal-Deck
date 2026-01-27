import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { useTerminalStore } from '../../stores/terminal-store';
import { cn } from '../../utils/cn';

interface SettingsModalProps {
  onClose: () => void;
}

type SettingsTab = 'general' | 'claude';

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useTerminalStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [showHelp, setShowHelp] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSaveHint, setShowSaveHint] = useState(false);

  const psCommand = '(Get-Command claude).Source';

  // Sync language with i18n when localSettings changes
  useEffect(() => {
    if (localSettings.language && localSettings.language !== i18n.language) {
      i18n.changeLanguage(localSettings.language);
    }
  }, [localSettings.language, i18n]);

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(psCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

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
    // Persist language preference
    if (localSettings.language) {
      localStorage.setItem('i18nextLng', localSettings.language);
    }
    // If Claude settings changed, show hint
    if (
      localSettings.claudePath !== settings.claudePath ||
      localSettings.extraPaths !== settings.extraPaths
    ) {
      setShowSaveHint(true);
    } else {
      onClose();
    }
  };

  return (
    <Modal title={t('settings.title')} onClose={onClose} width="max-w-2xl">
      <div className="flex gap-4">
        {/* Left tabs */}
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
            {t('settings.tabs.general')}
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
            {t('settings.tabs.claude')}
          </button>
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0 space-y-6">
          {activeTab === 'general' && (
            <>
              {/* Language settings */}
              <div>
                <h3 className="text-sm font-medium text-fg-primary mb-3">{t('settings.language.title')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-fg-secondary">{t('settings.language.label')}</label>
                    <select
                      value={localSettings.language || 'zh-CN'}
                      onChange={(e) =>
                        setLocalSettings((s) => ({
                          ...s,
                          language: e.target.value as 'zh-CN' | 'en',
                        }))
                      }
                      className={cn(
                        'w-64 px-2 py-1 rounded text-sm',
                        'bg-bg-tertiary border border-border-color',
                        'text-fg-primary',
                        'focus:border-border-active focus:outline-none'
                      )}
                    >
                      <option value="zh-CN">中文</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Appearance settings */}
              <div>
                <h3 className="text-sm font-medium text-fg-primary mb-3">{t('settings.appearance.title')}</h3>
          <div className="space-y-3">
            {/* Font size */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-fg-secondary">{t('settings.appearance.fontSize')}</label>
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

            {/* Font family */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-fg-secondary">{t('settings.appearance.fontFamily')}</label>
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

        {/* Terminal settings */}
        <div>
          <h3 className="text-sm font-medium text-fg-primary mb-3">{t('settings.terminal.title')}</h3>
          <div className="space-y-3">
            {/* Default shell */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-fg-secondary">{t('settings.terminal.defaultShell')}</label>
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

            {/* Default working directory */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-fg-secondary">{t('settings.terminal.defaultCwd')}</label>
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
                  placeholder={t('settings.terminal.defaultCwdPlaceholder')}
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
                  {t('common.browse')}
                </button>
              </div>
            </div>

            {/* Scrollback lines */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-fg-secondary">{t('settings.terminal.scrollbackLines')}</label>
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
              {/* Claude CLI configuration */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-fg-primary">{t('settings.claude.title')}</h3>
                  <button
                    onClick={() => setShowHelp(!showHelp)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    {showHelp ? t('settings.claude.hideTutorial') : t('settings.claude.showTutorial')}
                  </button>
                </div>

                {/* Tutorial */}
                {showHelp && (
                  <div className="mb-4 p-3 bg-bg-tertiary rounded-lg text-xs text-fg-secondary space-y-3">
                    <div>
                      <p className="font-medium text-fg-primary mb-1">{t('settings.claude.tutorial.findPath')}</p>
                      <p className="mb-2">{t('settings.claude.tutorial.openPowerShell')}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-black/30 p-2 rounded font-mono text-green-400">
                          {psCommand}
                        </div>
                        <button
                          onClick={handleCopyCommand}
                          className={cn(
                            'px-2 py-1.5 rounded text-xs transition-colors',
                            'border border-border-color',
                            copied
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-bg-hover hover:bg-bg-active text-fg-secondary'
                          )}
                        >
                          {copied ? t('common.copied') : t('common.copy')}
                        </button>
                      </div>
                      <p className="mb-1">{t('settings.claude.tutorial.ifInstalled')}</p>
                      <div className="bg-black/30 p-2 rounded font-mono text-yellow-400 text-[11px] break-all">
                        {t('settings.claude.tutorial.pathExample')}
                      </div>
                      <p className="mt-2 text-blue-400">
                        {t('settings.claude.tutorial.pasteFolder')}
                      </p>
                    </div>

                    <div className="border-t border-border-color pt-3">
                      <p className="font-medium text-fg-primary mb-1">{t('settings.claude.tutorial.npmInstall')}</p>
                      <p className="mb-2">{t('settings.claude.tutorial.npmPath')}</p>
                      <div className="bg-black/30 p-2 rounded font-mono text-yellow-400 text-[11px]">
                        {t('settings.claude.tutorial.npmPathExample')}
                      </div>
                      <p className="mt-2 text-orange-400">
                        {t('settings.claude.tutorial.npmNote')}<span className="font-mono">winget install claude</span>
                      </p>
                    </div>

                    <div className="border-t border-border-color pt-3">
                      <p className="font-medium text-fg-primary mb-1">{t('settings.claude.tutorial.instructions')}</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>{t('settings.claude.tutorial.claudePathDesc')}</strong></li>
                        <li><strong>{t('settings.claude.tutorial.extraPathDesc')}</strong></li>
                        <li>{t('settings.claude.tutorial.leaveEmpty')}</li>
                      </ul>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Claude path */}
                  <div>
                    <label className="block text-sm text-fg-secondary mb-1">
                      {t('settings.claude.claudePath')}
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
                        placeholder={t('settings.claude.claudePathPlaceholder')}
                        className={cn(
                          'flex-1 min-w-0 px-2 py-1.5 rounded text-sm',
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
                        {t('common.browse')}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-fg-muted">
                      {t('settings.claude.claudePathExample')}
                    </p>
                  </div>

                  {/* Extra PATH */}
                  <div className="min-w-0">
                    <label className="block text-sm text-fg-secondary mb-1">
                      {t('settings.claude.extraPaths')}
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
                      placeholder={t('settings.claude.extraPathsPlaceholder')}
                      className={cn(
                        'w-full min-w-0 px-2 py-1.5 rounded text-sm',
                        'bg-bg-tertiary border border-border-color',
                        'text-fg-primary placeholder-fg-muted',
                        'focus:border-border-active focus:outline-none'
                      )}
                    />
                    <p className="mt-1 text-xs text-fg-muted">
                      {t('settings.claude.extraPathsNote')}
                    </p>
                  </div>

                  {/* Auto-detected paths */}
                  <div className="p-3 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-fg-muted">{t('settings.claude.autoDetected')}</p>
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
                        {isDetecting ? t('settings.claude.detecting') : t('settings.claude.redetect')}
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
                        <p className="text-yellow-400">{t('settings.claude.notDetected')}</p>
                      )}
                    </div>
                  </div>

                  {/* Current status */}
                  <div className="p-3 bg-bg-tertiary rounded-lg overflow-hidden">
                    <p className="text-xs text-fg-muted mb-2">{t('settings.claude.currentStatus')}</p>
                    <div className="text-xs space-y-1">
                      <div className="flex gap-1">
                        <span className="text-fg-secondary flex-shrink-0">{t('settings.claude.manualPath')}</span>
                        <span className="text-fg-primary truncate" title={localSettings.claudePath || ''}>
                          {localSettings.claudePath || t('settings.claude.notConfigured')}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <span className="text-fg-secondary flex-shrink-0">{t('settings.claude.extraPathLabel')}</span>
                        <span className="text-fg-primary truncate" title={localSettings.extraPaths || ''}>
                          {localSettings.extraPaths || t('settings.claude.none')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Save success hint */}
          {showSaveHint && (
            <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg">
              <p className="text-sm text-green-400 font-medium mb-1">{t('settings.saved.title')}</p>
              <p className="text-xs text-fg-secondary">
                {t('settings.saved.claudeNote')}
              </p>
              <button
                onClick={onClose}
                className={cn(
                  'mt-2 px-3 py-1 rounded text-sm',
                  'bg-green-700 hover:bg-green-600 text-white transition-colors'
                )}
              >
                {t('common.gotIt')}
              </button>
            </div>
          )}

          {/* Buttons */}
          {!showSaveHint && (
            <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
              <button
                onClick={onClose}
                className={cn(
                  'px-4 py-2 rounded',
                  'text-fg-secondary hover:text-fg-primary',
                  'hover:bg-bg-hover transition-colors'
                )}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                className={cn(
                  'px-4 py-2 rounded',
                  'bg-accent-primary text-white',
                  'hover:bg-accent-secondary transition-colors'
                )}
              >
                {t('common.save')}
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
