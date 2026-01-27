import React, { useState, useCallback } from 'react';
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
  const { updateGroup } = useTerminalStore();

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

  // Handle name edit
  const handleNameSubmit = useCallback(() => {
    if (editName.trim() && editName.trim() !== group.name) {
      updateGroup(group.id, { name: editName.trim() });
    } else {
      setEditName(group.name);
    }
    setIsEditing(false);
  }, [editName, group.id, group.name, updateGroup]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer',
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
            <span
              className="font-medium truncate cursor-pointer"
              onDoubleClick={handleDoubleClick}
              title={t('terminal.doubleClickToRename')}
            >
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
    </div>
  );
};
