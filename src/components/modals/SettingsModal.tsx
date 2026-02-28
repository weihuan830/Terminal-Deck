import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { useTerminalStore } from '../../stores/terminal-store';
import { cn } from '../../utils/cn';

interface SettingsModalProps {
  onClose: () => void;
}

type SettingsTab = 'general' | 'environment';

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings } = useTerminalStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [showSaveHint, setShowSaveHint] = useState(false);

  // Validation states
  const [pathValidation, setPathValidation] = useState<{ path: string; exists: boolean }[] | null>(null);
  const [envVarErrors, setEnvVarErrors] = useState<{ line: number; message: string }[] | null>(null);
  const [envVarValidCount, setEnvVarValidCount] = useState(0);
  const pathDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync language with i18n when localSettings changes
  useEffect(() => {
    if (localSettings.language && localSettings.language !== i18n.language) {
      i18n.changeLanguage(localSettings.language);
    }
  }, [localSettings.language, i18n]);

  // PATH validation with debounce
  useEffect(() => {
    if (pathDebounceRef.current) {
      clearTimeout(pathDebounceRef.current);
    }

    const paths = localSettings.customPaths?.trim();
    if (!paths) {
      setPathValidation(null);
      return;
    }

    pathDebounceRef.current = setTimeout(async () => {
      try {
        const result = await window.electronAPI.config.validatePaths(paths);
        setPathValidation(result);
      } catch {
        setPathValidation(null);
      }
    }, 500);

    return () => {
      if (pathDebounceRef.current) {
        clearTimeout(pathDebounceRef.current);
      }
    };
  }, [localSettings.customPaths]);

  // Environment variables validation (synchronous, immediate)
  useEffect(() => {
    const raw = localSettings.customEnvVars?.trim();
    if (!raw) {
      setEnvVarErrors(null);
      setEnvVarValidCount(0);
      return;
    }

    const lines = raw.split('\n');
    const errors: { line: number; message: string }[] = [];
    let validCount = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) return;

      if (!trimmed.includes('=')) {
        errors.push({ line: index + 1, message: t('settings.environment.validation.missingEquals') });
        return;
      }

      const eqIndex = trimmed.indexOf('=');
      const key = trimmed.substring(0, eqIndex);

      if (!key) {
        errors.push({ line: index + 1, message: t('settings.environment.validation.emptyKey') });
        return;
      }

      if (!/^[A-Za-z0-9_]+$/.test(key)) {
        errors.push({ line: index + 1, message: t('settings.environment.validation.invalidKey') });
        return;
      }

      validCount++;
    });

    setEnvVarErrors(errors);
    setEnvVarValidCount(validCount);
  }, [localSettings.customEnvVars, t]);

  const handleSave = () => {
    updateSettings(localSettings);
    // Persist language preference
    if (localSettings.language) {
      localStorage.setItem('i18nextLng', localSettings.language);
    }
    // If environment settings changed, show hint
    if (
      localSettings.customPaths !== settings.customPaths ||
      localSettings.customEnvVars !== settings.customEnvVars
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
            onClick={() => setActiveTab('environment')}
            className={cn(
              'w-full text-left px-3 py-2 rounded text-sm transition-colors',
              activeTab === 'environment'
                ? 'bg-bg-active text-fg-primary'
                : 'text-fg-secondary hover:bg-bg-hover'
            )}
          >
            {t('settings.tabs.environment')}
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
            {/* Theme */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-fg-secondary">{t('settings.appearance.theme')}</label>
              <select
                value={localSettings.theme}
                onChange={(e) =>
                  setLocalSettings((s) => ({
                    ...s,
                    theme: e.target.value as 'dark' | 'light' | 'system',
                  }))
                }
                className={cn(
                  'w-64 px-2 py-1 rounded text-sm',
                  'bg-bg-tertiary border border-border-color',
                  'text-fg-primary',
                  'focus:border-border-active focus:outline-none'
                )}
              >
                <option value="dark">{t('settings.appearance.themeDark')}</option>
                <option value="light">{t('settings.appearance.themeLight')}</option>
                <option value="system">{t('settings.appearance.themeSystem')}</option>
              </select>
            </div>

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

            {/* Resource logging */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-fg-secondary">{t('settings.terminal.resourceLogging')}</label>
                <p className="text-xs text-fg-muted mt-0.5">{t('settings.terminal.resourceLoggingDesc')}</p>
              </div>
              <button
                onClick={() =>
                  setLocalSettings((s) => ({
                    ...s,
                    resourceLogging: !(s.resourceLogging ?? true),
                  }))
                }
                className={cn(
                  'relative w-9 h-5 rounded-full transition-colors flex-shrink-0',
                  (localSettings.resourceLogging ?? true)
                    ? 'bg-accent-primary'
                    : 'bg-bg-tertiary border border-border-color'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                    (localSettings.resourceLogging ?? true) ? 'left-[18px]' : 'left-0.5'
                  )}
                />
              </button>
            </div>
          </div>
        </div>
            </>
          )}

          {activeTab === 'environment' && (
            <>
              {/* Environment configuration */}
              <div>
                <h3 className="text-sm font-medium text-fg-primary mb-3">{t('settings.environment.title')}</h3>

                <div className="space-y-4">
                  {/* Custom PATH */}
                  <div className="min-w-0">
                    <label className="block text-sm text-fg-secondary mb-1">
                      {t('settings.environment.customPaths')}
                    </label>
                    <input
                      type="text"
                      value={localSettings.customPaths || ''}
                      onChange={(e) =>
                        setLocalSettings((s) => ({
                          ...s,
                          customPaths: e.target.value,
                        }))
                      }
                      placeholder={t('settings.environment.customPathsPlaceholder')}
                      className={cn(
                        'w-full min-w-0 px-2 py-1.5 rounded text-sm',
                        'bg-bg-tertiary border border-border-color',
                        'text-fg-primary placeholder-fg-muted',
                        'focus:border-border-active focus:outline-none'
                      )}
                    />
                    {pathValidation && pathValidation.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {pathValidation.every(p => p.exists) ? (
                          <p className="text-xs text-green-400">
                            ✓ {t('settings.environment.validation.allPathsValid')}
                          </p>
                        ) : (
                          pathValidation.map((item, i) => (
                            <p key={i} className={cn('text-xs', item.exists ? 'text-green-400' : 'text-red-400')}>
                              {item.exists ? '✓' : '✗'} {item.path}
                              {!item.exists && ` — ${t('settings.environment.validation.pathNotFound')}`}
                            </p>
                          ))
                        )}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-fg-muted">
                      {t('settings.environment.customPathsNote')}
                    </p>
                  </div>

                  {/* Environment Variables */}
                  <div className="min-w-0">
                    <label className="block text-sm text-fg-secondary mb-1">
                      {t('settings.environment.envVars')}
                    </label>
                    <textarea
                      value={localSettings.customEnvVars || ''}
                      onChange={(e) =>
                        setLocalSettings((s) => ({
                          ...s,
                          customEnvVars: e.target.value,
                        }))
                      }
                      placeholder={t('settings.environment.envVarsPlaceholder')}
                      rows={5}
                      className={cn(
                        'w-full min-w-0 px-2 py-1.5 rounded text-sm font-mono',
                        'bg-bg-tertiary border border-border-color',
                        'text-fg-primary placeholder-fg-muted',
                        'focus:border-border-active focus:outline-none',
                        'resize-y'
                      )}
                    />
                    {envVarErrors !== null && (
                      <div className="mt-1 space-y-0.5">
                        {envVarErrors.length === 0 && envVarValidCount > 0 ? (
                          <p className="text-xs text-green-400">
                            ✓ {t('settings.environment.validation.syntaxOk', { count: envVarValidCount })}
                          </p>
                        ) : (
                          envVarErrors.map((err, i) => (
                            <p key={i} className="text-xs text-red-400">
                              ✗ {t('settings.environment.validation.lineError', { line: err.line, message: err.message })}
                            </p>
                          ))
                        )}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-fg-muted">
                      {t('settings.environment.envVarsNote')}
                    </p>
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
                {t('settings.saved.envNote')}
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
