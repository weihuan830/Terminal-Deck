import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDraggable } from '@dnd-kit/core';
import { useTerminal } from '../../hooks/useTerminal';
import { useTerminalStore } from '../../stores/terminal-store';
import type { Terminal } from '../../types';
import { cn } from '../../utils/cn';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

interface TerminalCellProps {
  terminal: Terminal;
  groupId: string;
  isActive: boolean;
  onFocus: () => void;
}

export const TerminalCell: React.FC<TerminalCellProps> = ({
  terminal,
  groupId,
  isActive,
  onFocus,
}) => {
  const { t } = useTranslation();
  const { containerRef, focus, terminalInstance } = useTerminal({
    terminalId: terminal.id,
    groupId,
  });

  const { removeTerminal, updateTerminal } = useTerminalStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(terminal.label);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Make draggable
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `terminal-${terminal.id}`,
    data: {
      type: 'terminal',
      terminalId: terminal.id,
      groupId: groupId,
      terminal: terminal,
    },
  });

  // Handle label edit
  const handleLabelSubmit = useCallback(() => {
    if (editLabel.trim()) {
      updateTerminal(groupId, terminal.id, { label: editLabel.trim() });
    } else {
      setEditLabel(terminal.label);
    }
    setIsEditing(false);
  }, [editLabel, groupId, terminal.id, terminal.label, updateTerminal]);

  // Handle close with confirmation
  const handleClose = useCallback(async () => {
    if (window.confirm(t('terminal.closeTerminalConfirm', { name: terminal.label }))) {
      await window.electronAPI.terminal.kill(terminal.id);
      removeTerminal(groupId, terminal.id);
    }
  }, [groupId, terminal.id, terminal.label, removeTerminal, t]);

  // Get status color
  const getStatusColor = () => {
    switch (terminal.status) {
      case 'running':
        return 'bg-status-running';
      case 'error':
        return 'bg-status-error';
      case 'exited':
        return 'bg-status-exited';
      default:
        return 'bg-status-idle';
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (terminal.status) {
      case 'running':
        return t('terminal.status.running');
      case 'error':
        return t('terminal.status.error');
      case 'exited':
        return t('terminal.status.exitedWithCode', { code: terminal.exitCode ?? '-' });
      default:
        return t('terminal.status.idle');
    }
  };

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  }, []);

  // Copy selected text
  const handleCopy = useCallback(() => {
    if (terminalInstance) {
      const selection = terminalInstance.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
    closeContextMenu();
  }, [terminalInstance, closeContextMenu]);

  // Paste text
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        window.electronAPI.terminal.write(terminal.id, text);
      }
    } catch (err) {
      console.error('Failed to paste:', err);
    }
    closeContextMenu();
  }, [terminal.id, closeContextMenu]);

  // Clear screen
  const handleClear = useCallback(() => {
    if (terminalInstance) {
      terminalInstance.clear();
    }
    closeContextMenu();
  }, [terminalInstance, closeContextMenu]);

  // Select all
  const handleSelectAll = useCallback(() => {
    if (terminalInstance) {
      terminalInstance.selectAll();
    }
    closeContextMenu();
  }, [terminalInstance, closeContextMenu]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu.visible, closeContextMenu]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full border rounded-lg overflow-hidden',
        'bg-bg-primary border-border-color',
        isActive && 'border-border-active',
        isDragging && 'opacity-50 ring-2 ring-blue-500'
      )}
      onClick={() => {
        onFocus();
        focus();
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-bg-secondary border-b border-border-color"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Drag handle icon - only this area is draggable */}
          <div
            className="cursor-grab active:cursor-grabbing p-0.5 -m-0.5 rounded hover:bg-bg-hover"
            {...listeners}
            {...attributes}
          >
            <svg className="w-4 h-4 text-fg-muted flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
          </div>

          {/* Status indicator */}
          <div
            className={cn('w-2 h-2 rounded-full flex-shrink-0', getStatusColor())}
            title={getStatusText()}
          />

          {/* Label */}
          {isEditing ? (
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onBlur={handleLabelSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLabelSubmit();
                if (e.key === 'Escape') {
                  setEditLabel(terminal.label);
                  setIsEditing(false);
                }
              }}
              className="flex-1 min-w-0 px-1 bg-transparent border border-border-active rounded text-sm text-fg-primary outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="text-sm text-fg-primary truncate cursor-pointer hover:text-white"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              title={terminal.label}
            >
              {terminal.label}
            </span>
          )}

          {/* Working directory */}
          <span className="text-xs text-fg-muted truncate hidden md:inline" title={terminal.cwd}>
            {terminal.cwd.split(/[/\\]/).pop() || terminal.cwd}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="p-1 text-fg-muted hover:text-status-error hover:bg-bg-hover rounded transition-colors"
            title={t('terminal.closeTerminal')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Terminal container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0"
        onContextMenu={handleContextMenu}
      />

      {/* Context menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-bg-secondary border border-border-color rounded-lg shadow-lg py-1 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleCopy}
            className="w-full px-3 py-1.5 text-left text-sm text-fg-primary hover:bg-bg-hover flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {t('common.copy')}
          </button>
          <button
            onClick={handlePaste}
            className="w-full px-3 py-1.5 text-left text-sm text-fg-primary hover:bg-bg-hover flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {t('common.paste')}
          </button>
          <div className="my-1 border-t border-border-color" />
          <button
            onClick={handleSelectAll}
            className="w-full px-3 py-1.5 text-left text-sm text-fg-primary hover:bg-bg-hover flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 12h16M4 19h16" />
            </svg>
            {t('common.selectAll')}
          </button>
          <button
            onClick={handleClear}
            className="w-full px-3 py-1.5 text-left text-sm text-fg-primary hover:bg-bg-hover flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('common.clear')}
          </button>
        </div>
      )}
    </div>
  );
};
