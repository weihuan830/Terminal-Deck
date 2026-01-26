import React from 'react';
import { PRESET_LAYOUTS, type GridLayout } from '../../types';
import { cn } from '../../utils/cn';

interface LayoutPickerProps {
  currentLayout: GridLayout;
  onSelect: (layout: GridLayout) => void;
}

export const LayoutPicker: React.FC<LayoutPickerProps> = ({ currentLayout, onSelect }) => {
  const layouts = Object.entries(PRESET_LAYOUTS);

  return (
    <div className="bg-bg-tertiary border border-border-color rounded-lg p-3 shadow-xl">
      <p className="text-xs text-fg-muted mb-2">选择布局 (行x列)</p>
      <div className="grid grid-cols-3 gap-2" style={{ width: '200px' }}>
        {layouts.map(([name, layout]) => {
          const isSelected =
            layout.rows === currentLayout.rows && layout.cols === currentLayout.cols;

          return (
            <button
              key={name}
              onClick={() => onSelect(layout)}
              className={cn(
                'flex flex-col items-center p-2 rounded border transition-colors',
                isSelected
                  ? 'border-border-active bg-bg-active'
                  : 'border-border-color hover:border-fg-muted hover:bg-bg-hover'
              )}
            >
              {/* 布局预览 */}
              <div
                className="w-10 h-10 gap-0.5 mb-1"
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
              <span className={cn('text-xs', isSelected ? 'text-fg-primary' : 'text-fg-secondary')}>
                {name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
