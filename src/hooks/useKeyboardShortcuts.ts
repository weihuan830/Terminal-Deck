import { useEffect, useCallback } from 'react';
import { useTerminalStore } from '../stores/terminal-store';

interface ShortcutHandlers {
  onNewGroup?: () => void;
  onNewTerminal?: () => void;
  onSettings?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const { groups, activeGroupId, setActiveGroup } = useTerminalStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + N: 新建分组
      if (isCtrlOrCmd && e.key === 'n') {
        e.preventDefault();
        handlers.onNewGroup?.();
        return;
      }

      // Ctrl/Cmd + T: 新建终端
      if (isCtrlOrCmd && e.key === 't') {
        e.preventDefault();
        handlers.onNewTerminal?.();
        return;
      }

      // Ctrl/Cmd + ,: 设置
      if (isCtrlOrCmd && e.key === ',') {
        e.preventDefault();
        handlers.onSettings?.();
        return;
      }

      // Ctrl/Cmd + Tab: 下一个分组
      if (isCtrlOrCmd && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const currentIndex = groups.findIndex((g) => g.id === activeGroupId);
        const nextIndex = (currentIndex + 1) % groups.length;
        if (groups[nextIndex]) {
          setActiveGroup(groups[nextIndex].id);
        }
        return;
      }

      // Ctrl/Cmd + Shift + Tab: 上一个分组
      if (isCtrlOrCmd && e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        const currentIndex = groups.findIndex((g) => g.id === activeGroupId);
        const prevIndex = currentIndex <= 0 ? groups.length - 1 : currentIndex - 1;
        if (groups[prevIndex]) {
          setActiveGroup(groups[prevIndex].id);
        }
        return;
      }

      // Ctrl/Cmd + 1-9: 切换到对应分组
      if (isCtrlOrCmd && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (groups[index]) {
          setActiveGroup(groups[index].id);
        }
        return;
      }
    },
    [groups, activeGroupId, setActiveGroup, handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
