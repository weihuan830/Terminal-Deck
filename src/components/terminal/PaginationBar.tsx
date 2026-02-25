import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminalStore } from '../../stores/terminal-store';
import { cn } from '../../utils/cn';

interface PaginationBarProps {
  groupId: string;
  totalPages: number;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({ groupId, totalPages }) => {
  const { t } = useTranslation();
  const groupPages = useTerminalStore((state) => state.groupPages);
  const setGroupPage = useTerminalStore((state) => state.setGroupPage);

  const currentPage = Math.min(groupPages[groupId] ?? 0, totalPages - 1);

  if (totalPages <= 1) return null;

  const goToPrevPage = () => {
    setGroupPage(groupId, Math.max(0, currentPage - 1));
  };

  const goToNextPage = () => {
    setGroupPage(groupId, Math.min(totalPages - 1, currentPage + 1));
  };

  return (
    <div className="px-4 py-2 bg-bg-secondary border-t border-border-color flex items-center justify-center gap-4">
      <button
        onClick={goToPrevPage}
        disabled={currentPage === 0}
        className={cn(
          'p-1.5 rounded transition-colors',
          currentPage === 0
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
            onClick={() => setGroupPage(groupId, index)}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-colors',
              index === currentPage
                ? 'bg-blue-500'
                : 'bg-fg-muted hover:bg-fg-secondary'
            )}
            title={t('terminal.pagination.pageN', { n: index + 1 })}
          />
        ))}
      </div>

      <span className="text-sm text-fg-muted min-w-[80px] text-center">
        {t('terminal.pagination.page', { current: currentPage + 1, total: totalPages })}
      </span>

      <button
        onClick={goToNextPage}
        disabled={currentPage === totalPages - 1}
        className={cn(
          'p-1.5 rounded transition-colors',
          currentPage === totalPages - 1
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
  );
};
