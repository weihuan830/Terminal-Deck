import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TerminalCell } from './TerminalCell';
import { PaginationBar } from './PaginationBar';
import { useTerminalStore } from '../../stores/terminal-store';
import { cn } from '../../utils/cn';

export const TerminalPool: React.FC = () => {
  const { t } = useTranslation();
  const groups = useTerminalStore((state) => state.groups);
  const activeGroupId = useTerminalStore((state) => state.activeGroupId);
  const activeTerminalId = useTerminalStore((state) => state.activeTerminalId);
  const groupPages = useTerminalStore((state) => state.groupPages);
  const setActiveTerminal = useTerminalStore((state) => state.setActiveTerminal);
  const addTerminal = useTerminalStore((state) => state.addTerminal);

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;

  // Compute visible terminal IDs for the active group's current page
  let visibleTerminalIds: Set<string> = new Set();
  let layout = { rows: 1, cols: 1 };
  let emptySlots = 0;
  let totalPages = 1;
  let currentPage = 0;

  if (activeGroup) {
    layout = activeGroup.layout;
    const perPage = layout.rows * layout.cols;
    totalPages = Math.ceil(activeGroup.terminals.length / perPage) || 1;
    currentPage = Math.min(groupPages[activeGroup.id] ?? 0, totalPages - 1);

    const start = currentPage * perPage;
    const end = start + perPage;
    const pageTerminals = activeGroup.terminals.slice(start, end);
    for (const t of pageTerminals) {
      visibleTerminalIds.add(t.id);
    }
    emptySlots = Math.max(0, perPage - pageTerminals.length);
  }

  // Collect all terminals across all groups (memoized to avoid rebuild on unrelated store changes)
  const allTerminals = useMemo(() => {
    const result: { terminal: (typeof groups)[0]['terminals'][0]; groupId: string }[] = [];
    for (const group of groups) {
      for (const terminal of group.terminals) {
        result.push({ terminal, groupId: group.id });
      }
    }
    return result;
  }, [groups]);

  // Handle add terminal
  const handleAddTerminal = async () => {
    if (!activeGroup) return;
    const result = await window.electronAPI.dialog.selectDirectory();
    if (result) {
      addTerminal(activeGroup.id, {
        label: `Terminal ${activeGroup.terminals.length + 1}`,
        cwd: result,
      });
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Single grid container with all terminals */}
      <div
        className="flex-1 min-h-0 relative p-4 gap-4"
        style={activeGroup ? {
          display: 'grid',
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
        } : {
          display: 'grid',
        }}
      >
        {allTerminals.map(({ terminal, groupId }) => {
          const isVisible = visibleTerminalIds.has(terminal.id);
          return (
            <div
              key={terminal.id}
              className="min-h-0 min-w-0"
              style={isVisible ? {
                height: '100%',
              } : {
                position: 'absolute',
                width: '1px',
                height: '1px',
                visibility: 'hidden' as const,
                overflow: 'hidden',
              }}
            >
              <TerminalCell
                terminal={terminal}
                groupId={groupId}
                isActive={isVisible && terminal.id === activeTerminalId}
                isVisible={isVisible}
                onFocus={() => setActiveTerminal(terminal.id)}
              />
            </div>
          );
        })}

        {/* Empty slots — add terminal buttons, only for visible page */}
        {activeGroup && Array.from({ length: emptySlots }).map((_, index) => (
          <button
            key={`empty-${index}`}
            onClick={handleAddTerminal}
            className={cn(
              'flex items-center justify-center',
              'border-2 border-dashed border-border-color rounded-lg',
              'text-fg-muted hover:text-fg-secondary hover:border-fg-muted',
              'transition-colors'
            )}
          >
            <div className="text-center">
              <svg
                className="w-8 h-8 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm">{t('terminal.addTerminal')}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Pagination */}
      {activeGroup && (
        <PaginationBar groupId={activeGroup.id} totalPages={totalPages} />
      )}
    </div>
  );
};
