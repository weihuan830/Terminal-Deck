import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminalStore } from '../../stores/terminal-store';
import { LayoutPicker } from '../common/LayoutPicker';
import type { TerminalGroup, GridLayout } from '../../types';
import { cn } from '../../utils/cn';

interface ToolbarProps {
  group: TerminalGroup;
}

export const Toolbar: React.FC<ToolbarProps> = ({ group }) => {
  const { t } = useTranslation();
  const { addTerminal, setGroupLayout, updateGroup, removeGroup } = useTerminalStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, right: 0 });
  const layoutButtonRef = useRef<HTMLButtonElement>(null);

  // Calculate dropdown position
  useEffect(() => {
    if (showLayoutPicker && layoutButtonRef.current) {
      const rect = layoutButtonRef.current.getBoundingClientRect();
      setPickerPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showLayoutPicker]);

  // Handle add terminal
  const handleAddTerminal = async () => {
    const cwd = await window.electronAPI.dialog.selectDirectory();
    if (cwd) {
      addTerminal(group.id, {
        label: `Terminal ${group.terminals.length + 1}`,
        cwd,
      });
    }
  };

  // Handle name edit
  const handleNameSubmit = () => {
    if (editName.trim()) {
      updateGroup(group.id, { name: editName.trim() });
    } else {
      setEditName(group.name);
    }
    setIsEditingName(false);
  };

  // Handle layout selection
  const handleLayoutSelect = (layout: GridLayout) => {
    setGroupLayout(group.id, layout);
    setShowLayoutPicker(false);
  };

  // Handle delete group
  const handleDeleteGroup = () => {
    if (window.confirm(t('group.deleteConfirm', { name: group.name }))) {
      removeGroup(group.id);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-bg-secondary border-b border-border-color">
      {/* Left: Group name */}
      <div className="flex items-center gap-3">
        {/* Color indicator */}
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: group.color }}
        />

        {/* Group name */}
        {isEditingName ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSubmit();
              if (e.key === 'Escape') {
                setEditName(group.name);
                setIsEditingName(false);
              }
            }}
            className="px-2 py-1 bg-bg-tertiary border border-border-active rounded text-fg-primary outline-none"
            autoFocus
          />
        ) : (
          <h2
            className="text-lg font-medium text-fg-primary cursor-pointer hover:text-white"
            onDoubleClick={() => setIsEditingName(true)}
          >
            {group.name}
          </h2>
        )}

        {/* Terminal count */}
        <span className="text-sm text-fg-muted">
          ({group.terminals.length} / {group.layout.rows * group.layout.cols})
        </span>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        {/* Layout picker */}
        <div className="relative">
          <button
            ref={layoutButtonRef}
            onClick={() => setShowLayoutPicker(!showLayoutPicker)}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded',
              'text-sm text-fg-secondary',
              'hover:bg-bg-hover hover:text-fg-primary transition-colors'
            )}
          >
            <span>
              {group.layout.rows}x{group.layout.cols}
            </span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showLayoutPicker && (
            <>
              {/* Overlay */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowLayoutPicker(false)}
              />
              {/* Dropdown - fixed position */}
              <div
                className="fixed z-50"
                style={{
                  top: `${pickerPosition.top}px`,
                  right: `${pickerPosition.right}px`,
                }}
              >
                <LayoutPicker
                  currentLayout={group.layout}
                  onSelect={handleLayoutSelect}
                />
              </div>
            </>
          )}
        </div>

        {/* Add terminal button */}
        <button
          onClick={handleAddTerminal}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded',
            'bg-accent-primary text-white text-sm',
            'hover:bg-accent-secondary transition-colors'
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('terminal.addTerminal')}
        </button>

        {/* Delete group button */}
        <button
          onClick={handleDeleteGroup}
          className={cn(
            'p-1.5 rounded',
            'text-fg-muted hover:text-status-error',
            'hover:bg-bg-hover transition-colors'
          )}
          title={t('group.deleteGroup')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
