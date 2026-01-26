import React from 'react';
import { Toolbar } from './Toolbar';
import { TerminalGrid } from '../terminal/TerminalGrid';
import { useTerminalStore } from '../../stores/terminal-store';

export const MainContent: React.FC = () => {
  const { groups, activeGroupId, getActiveGroup } = useTerminalStore();
  const activeGroup = getActiveGroup();

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {activeGroup ? (
        <>
          {/* 工具栏 */}
          <Toolbar group={activeGroup} />

          {/* 终端网格容器 - 所有分组都保持挂载，通过 CSS 控制显示 */}
          <div className="flex-1 overflow-hidden relative">
            {groups.map((group) => (
              <div
                key={group.id}
                className="absolute inset-0"
                style={{
                  visibility: group.id === activeGroupId ? 'visible' : 'hidden',
                  // 使用 visibility 而不是 display:none，这样终端仍然有尺寸可以正确渲染
                  // 但是隐藏的终端不会响应事件
                  pointerEvents: group.id === activeGroupId ? 'auto' : 'none',
                }}
              >
                <TerminalGrid groupId={group.id} isActive={group.id === activeGroupId} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-fg-muted">
          <div className="text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-fg-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-lg mb-2">没有选中的分组</p>
            <p className="text-sm">请从左侧选择或创建一个分组</p>
          </div>
        </div>
      )}
    </div>
  );
};
