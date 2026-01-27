import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TerminalCell } from './TerminalCell';
import { useTerminalStore } from '../../stores/terminal-store';
import { cn } from '../../utils/cn';

interface TerminalGridProps {
  groupId: string;
  isActive: boolean;
}

export const TerminalGrid: React.FC<TerminalGridProps> = ({ groupId, isActive }) => {
  const { t } = useTranslation();
  const { groups, activeTerminalId, setActiveTerminal, addTerminal } = useTerminalStore();
  const [currentPage, setCurrentPage] = useState(0);

  const group = groups.find((g) => g.id === groupId);

  if (!group) {
    return null;
  }

  const { layout, terminals } = group;
  const terminalsPerPage = layout.rows * layout.cols;
  const totalPages = Math.ceil(terminals.length / terminalsPerPage) || 1;

  // Ensure current page is valid
  const validCurrentPage = Math.min(currentPage, totalPages - 1);
  if (validCurrentPage !== currentPage) {
    setCurrentPage(validCurrentPage);
  }

  // Terminals on current page
  const startIndex = validCurrentPage * terminalsPerPage;
  const endIndex = startIndex + terminalsPerPage;
  const visibleTerminals = terminals.slice(startIndex, endIndex);
  const emptySlots = Math.max(0, terminalsPerPage - visibleTerminals.length);

  // Handle add terminal
  const handleAddTerminal = async () => {
    const result = await window.electronAPI.dialog.selectDirectory();
    if (result) {
      addTerminal(groupId, {
        label: `Terminal ${terminals.length + 1}`,
        cwd: result,
      });
    }
  };

  // Pagination
  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Terminal grid */}
      <div
        className="flex-1 p-4 gap-4 min-h-0 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
        }}
      >
        {/* Visible terminals */}
        {visibleTerminals.map((terminal) => (
          <TerminalCell
            key={terminal.id}
            terminal={terminal}
            groupId={groupId}
            isActive={isActive && terminal.id === activeTerminalId}
            onFocus={() => setActiveTerminal(terminal.id)}
          />
        ))}

        {/* Empty slots - add terminal buttons */}
        {Array.from({ length: emptySlots }).map((_, index) => (
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

      {/* Pagination - only show when multiple pages */}
      {totalPages > 1 && (
        <div className="px-4 py-2 bg-bg-secondary border-t border-border-color flex items-center justify-center gap-4">
          <button
            onClick={goToPrevPage}
            disabled={validCurrentPage === 0}
            className={cn(
              'p-1.5 rounded transition-colors',
              validCurrentPage === 0
                ? 'text-fg-muted cursor-not-allowed'
                : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-hover'
            )}
            title={t('terminal.pagination.prevPage')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Page indicators */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={cn(
                  'w-2.5 h-2.5 rounded-full transition-colors',
                  index === validCurrentPage
                    ? 'bg-blue-500'
                    : 'bg-fg-muted hover:bg-fg-secondary'
                )}
                title={t('terminal.pagination.pageN', { n: index + 1 })}
              />
            ))}
          </div>

          <span className="text-sm text-fg-muted min-w-[80px] text-center">
            {t('terminal.pagination.page', { current: validCurrentPage + 1, total: totalPages })}
          </span>

          <button
            onClick={goToNextPage}
            disabled={validCurrentPage === totalPages - 1}
            className={cn(
              'p-1.5 rounded transition-colors',
              validCurrentPage === totalPages - 1
                ? 'text-fg-muted cursor-not-allowed'
                : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-hover'
            )}
            title={t('terminal.pagination.nextPage')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
