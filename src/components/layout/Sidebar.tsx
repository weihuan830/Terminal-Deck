import React from 'react';
import { GroupList } from '../sidebar/GroupList';
import { cn } from '../../utils/cn';

interface SidebarProps {
  onNewGroup: () => void;
  onSettings: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewGroup, onSettings, collapsed, onToggleCollapse }) => {
  return (
    <div
      className={cn(
        "flex flex-col h-full bg-bg-secondary border-r border-border-color transition-all duration-300",
        collapsed ? "w-14" : "w-64"
      )}
    >
      {/* Logo + 收起按钮 */}
      <div className="flex items-center h-14 border-b border-border-color px-2">
        {!collapsed && (
          <h1 className="flex-1 text-lg font-bold text-fg-primary text-center">
            Claude Terminal
          </h1>
        )}
        <button
          onClick={onToggleCollapse}
          className={cn(
            "flex items-center justify-center p-2 rounded",
            "text-fg-secondary hover:text-fg-primary",
            "hover:bg-bg-hover transition-colors",
            collapsed && "mx-auto"
          )}
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          <svg
            className={cn("w-5 h-5 transition-transform", collapsed && "rotate-180")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* 分组列表 */}
      <div className="flex-1 overflow-y-auto">
        {!collapsed && <GroupList />}
        {collapsed && (
          <div className="flex flex-col items-center py-2 space-y-2">
            {/* 收起状态下显示图标提示 */}
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className={cn("p-2 border-t border-border-color space-y-2", collapsed && "px-1")}>
        {/* 新建分组 */}
        <button
          onClick={onNewGroup}
          className={cn(
            'flex items-center justify-center w-full rounded',
            'bg-accent-primary text-white',
            'hover:bg-accent-secondary transition-colors',
            collapsed ? 'p-2' : 'px-4 py-2'
          )}
          title="新建分组"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {!collapsed && <span className="ml-2">新建分组</span>}
        </button>

        {/* 设置按钮 */}
        <button
          onClick={onSettings}
          className={cn(
            'flex items-center justify-center w-full rounded',
            'text-fg-secondary hover:text-fg-primary',
            'hover:bg-bg-hover transition-colors',
            collapsed ? 'p-2' : 'px-4 py-2'
          )}
          title="设置"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {!collapsed && <span className="ml-2">设置</span>}
        </button>
      </div>
    </div>
  );
};
