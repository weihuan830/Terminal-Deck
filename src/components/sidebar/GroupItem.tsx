import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDroppable } from '@dnd-kit/core';
import type { TerminalGroup } from '../../types';
import { useTerminalStore } from '../../stores/terminal-store';
import { cn } from '../../utils/cn';

interface GroupItemProps {
  group: TerminalGroup;
  isActive: boolean;
  onClick: () => void;
}

export const GroupItem: React.FC<GroupItemProps> = ({ group, isActive, onClick }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [showMenu, setShowMenu] = useState(false);
  const { updateGroup, removeGroup } = useTerminalStore();
  const menuRef = useRef<HTMLDivElement>(null);

  // Set as drop target
  const { isOver, setNodeRef } = useDroppable({
    id: `group-${group.id}`,
    data: {
      type: 'group',
      groupId: group.id,
    },
  });

  // Calculate running terminal count
  const runningCount = group.terminals.filter((t) => t.status === 'running').length;

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  // Handle name edit
  const handleNameSubmit = useCallback(() => {
    if (editName.trim() && editName.trim() !== group.name) {
      updateGroup(group.id, { name: editName.trim() });
    } else {
      setEditName(group.name);
    }
    setIsEditing(false);
  }, [editName, group.id, group.name, updateGroup]);

  // Handle rename from menu
  const handleRename = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setIsEditing(true);
  }, []);

  // Handle delete from menu
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (group.terminals.length > 0) {
      window.alert(t('group.cannotDelete'));
      return;
    }
    if (window.confirm(t('group.deleteConfirm', { name: group.name }))) {
      removeGroup(group.id);
    }
  }, [group, removeGroup, t]);

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer relative',
        'text-left',
        isActive
          ? 'bg-bg-active text-fg-primary'
          : 'text-fg-secondary hover:bg-bg-hover hover:text-fg-primary',
        isOver && 'ring-2 ring-blue-500 bg-blue-500/20'
      )}
    >
      {/* Color indicator */}
      <div
        className={cn('w-3 h-3 rounded-full flex-shrink-0', isActive ? 'ring-2 ring-white/30' : '')}
        style={{ backgroundColor: group.color }}
      />

      {/* Group info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSubmit();
                if (e.key === 'Escape') {
                  setEditName(group.name);
                  setIsEditing(false);
                }
              }}
              className="flex-1 min-w-0 px-1 bg-transparent border border-border-active rounded text-sm text-fg-primary outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="font-medium truncate">
              {group.name}
            </span>
          )}
          {runningCount > 0 && !isEditing && (
            <span className="text-xs text-status-running ml-2 flex-shrink-0">
              {t('terminal.runningCount', { count: runningCount })}
            </span>
          )}
        </div>
        <div className="text-xs text-fg-muted">
          {group.layout.rows}x{group.layout.cols} - {t('terminal.terminalCount', { count: group.terminals.length })}
        </div>
      </div>

      {/* Menu button */}
      <div ref={menuRef} className="relative flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={cn(
            'p-1 rounded transition-colors',
            'text-fg-muted hover:text-fg-primary hover:bg-bg-hover',
            showMenu && 'text-fg-primary bg-bg-hover'
          )}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="10" cy="4" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="10" cy="16" r="1.5" />
          </svg>
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-bg-secondary border border-border-color rounded-lg shadow-lg py-1 min-w-[140px]">
            {/* Rename */}
            <button
              onClick={handleRename}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-fg-secondary hover:bg-bg-hover hover:text-fg-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t('group.renameGroup')}
            </button>
            {/* Delete */}
            <button
              onClick={handleDelete}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors',
                group.terminals.length > 0
                  ? 'text-fg-muted cursor-not-allowed'
                  : 'text-status-error hover:bg-bg-hover'
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t('group.deleteGroup')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
