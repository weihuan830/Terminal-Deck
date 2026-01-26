import React from 'react';
import { GroupItem } from './GroupItem';
import { useTerminalStore } from '../../stores/terminal-store';

export const GroupList: React.FC = () => {
  const { groups, activeGroupId, setActiveGroup } = useTerminalStore();

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-fg-muted text-sm">
        <svg
          className="w-12 h-12 mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <p>没有分组</p>
        <p className="text-xs mt-1">点击下方按钮创建</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      {groups.map((group) => (
        <GroupItem
          key={group.id}
          group={group}
          isActive={group.id === activeGroupId}
          onClick={() => setActiveGroup(group.id)}
        />
      ))}
    </div>
  );
};
