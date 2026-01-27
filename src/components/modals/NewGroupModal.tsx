import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { useTerminalStore } from '../../stores/terminal-store';
import { PRESET_LAYOUTS, type GridLayout } from '../../types';
import { cn } from '../../utils/cn';

interface NewGroupModalProps {
  onClose: () => void;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { addGroup } = useTerminalStore();
  const [name, setName] = useState('');
  const [selectedLayout, setSelectedLayout] = useState<GridLayout>(PRESET_LAYOUTS['2x2']);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      addGroup(name.trim(), selectedLayout);
      onClose();
    }
  };

  const layouts = Object.entries(PRESET_LAYOUTS);

  return (
    <Modal title={t('group.newGroup')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Group name */}
        <div>
          <label className="block text-sm text-fg-secondary mb-1">{t('group.groupName')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('group.groupNamePlaceholder')}
            className={cn(
              'w-full px-3 py-2 rounded',
              'bg-bg-tertiary border border-border-color',
              'text-fg-primary placeholder-fg-muted',
              'focus:border-border-active focus:outline-none'
            )}
            autoFocus
          />
        </div>

        {/* Layout selection */}
        <div>
          <label className="block text-sm text-fg-secondary mb-2">{t('group.selectLayout')}</label>
          <div className="grid grid-cols-3 gap-2">
            {layouts.map(([layoutName, layout]) => {
              const isSelected =
                layout.rows === selectedLayout.rows && layout.cols === selectedLayout.cols;

              return (
                <button
                  key={layoutName}
                  type="button"
                  onClick={() => setSelectedLayout(layout)}
                  className={cn(
                    'flex flex-col items-center p-3 rounded border transition-colors',
                    isSelected
                      ? 'border-border-active bg-bg-active'
                      : 'border-border-color hover:border-fg-muted hover:bg-bg-hover'
                  )}
                >
                  {/* Layout preview */}
                  <div
                    className="w-12 h-12 gap-0.5 mb-1"
                    style={{
                      display: 'grid',
                      gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                      gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
                    }}
                  >
                    {Array.from({ length: layout.rows * layout.cols }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'rounded-sm',
                          isSelected ? 'bg-accent-primary' : 'bg-fg-muted'
                        )}
                      />
                    ))}
                  </div>
                  {/* Layout name */}
                  <span
                    className={cn('text-sm', isSelected ? 'text-fg-primary' : 'text-fg-secondary')}
                  >
                    {layoutName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
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
            type="submit"
            disabled={!name.trim()}
            className={cn(
              'px-4 py-2 rounded',
              'bg-accent-primary text-white',
              'hover:bg-accent-secondary transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {t('common.create')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
