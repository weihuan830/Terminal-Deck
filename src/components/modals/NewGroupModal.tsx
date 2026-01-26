import React, { useState } from 'react';
import { Modal } from './Modal';
import { useTerminalStore } from '../../stores/terminal-store';
import { PRESET_LAYOUTS, type GridLayout } from '../../types';
import { cn } from '../../utils/cn';

interface NewGroupModalProps {
  onClose: () => void;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({ onClose }) => {
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
    <Modal title="新建分组" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 分组名称 */}
        <div>
          <label className="block text-sm text-fg-secondary mb-1">分组名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入分组名称..."
            className={cn(
              'w-full px-3 py-2 rounded',
              'bg-bg-tertiary border border-border-color',
              'text-fg-primary placeholder-fg-muted',
              'focus:border-border-active focus:outline-none'
            )}
            autoFocus
          />
        </div>

        {/* 布局选择 */}
        <div>
          <label className="block text-sm text-fg-secondary mb-2">选择布局</label>
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
                  {/* 布局预览 */}
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
                  {/* 布局名称 */}
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

        {/* 按钮 */}
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
            取消
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
            创建
          </button>
        </div>
      </form>
    </Modal>
  );
};
