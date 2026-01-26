import React, { useEffect, useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { Sidebar } from './components/layout/Sidebar';
import { MainContent } from './components/layout/MainContent';
import { useTerminalStore } from './stores/terminal-store';
import { NewGroupModal } from './components/modals/NewGroupModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const App: React.FC = () => {
  const { loadFromStorage, isLoading, getActiveGroup, addTerminal, moveTerminal } = useTerminalStore();
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeDragTerminal, setActiveDragTerminal] = useState<{ id: string; label: string } | null>(null);

  // 处理拖拽结束
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragTerminal(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // 确保是从终端拖拽到分组
    if (activeData?.type === 'terminal' && overData?.type === 'group') {
      const fromGroupId = activeData.groupId;
      const toGroupId = overData.groupId;
      const terminalId = activeData.terminalId;

      if (fromGroupId !== toGroupId) {
        moveTerminal(fromGroupId, toGroupId, terminalId);
      }
    }
  }, [moveTerminal]);

  // 处理拖拽开始
  const handleDragStart = useCallback((event: { active: { data: { current?: { terminal?: { id: string; label: string } } } } }) => {
    const terminal = event.active.data.current?.terminal;
    if (terminal) {
      setActiveDragTerminal({ id: terminal.id, label: terminal.label });
    }
  }, []);

  // 处理添加终端
  const handleAddTerminal = useCallback(async () => {
    const activeGroup = getActiveGroup();
    if (activeGroup) {
      const cwd = await window.electronAPI?.dialog.selectDirectory();
      if (cwd) {
        addTerminal(activeGroup.id, {
          label: `Terminal ${activeGroup.terminals.length + 1}`,
          cwd,
        });
      }
    }
  }, [getActiveGroup, addTerminal]);

  // 快捷键
  useKeyboardShortcuts({
    onNewGroup: () => setShowNewGroupModal(true),
    onNewTerminal: handleAddTerminal,
    onSettings: () => setShowSettingsModal(true),
  });

  // 初始化加载数据
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // 监听菜单事件
  useEffect(() => {
    const unsubNewGroup = window.electronAPI?.menu.onNewGroup(() => {
      setShowNewGroupModal(true);
    });

    const unsubNewTerminal = window.electronAPI?.menu.onNewTerminal(() => {
      handleAddTerminal();
    });

    const unsubSettings = window.electronAPI?.menu.onSettings(() => {
      setShowSettingsModal(true);
    });

    return () => {
      unsubNewGroup?.();
      unsubNewTerminal?.();
      unsubSettings?.();
    };
  }, [handleAddTerminal]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-bg-primary">
        <div className="text-fg-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <div className="flex w-full h-full bg-bg-primary">
        {/* 侧边栏 */}
        <Sidebar
          onNewGroup={() => setShowNewGroupModal(true)}
          onSettings={() => setShowSettingsModal(true)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* 主内容区 */}
        <MainContent />

        {/* 模态框 */}
        {showNewGroupModal && <NewGroupModal onClose={() => setShowNewGroupModal(false)} />}

        {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
      </div>

      {/* 拖拽时的预览 */}
      <DragOverlay>
        {activeDragTerminal && (
          <div className="px-3 py-2 bg-bg-secondary border border-blue-500 rounded-lg shadow-lg text-fg-primary text-sm">
            {activeDragTerminal.label}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default App;
