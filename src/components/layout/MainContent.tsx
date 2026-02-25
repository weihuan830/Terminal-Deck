import React from 'react';
import { useTranslation } from 'react-i18next';
import { Toolbar } from './Toolbar';
import { TerminalPool } from '../terminal/TerminalPool';
import { useTerminalStore } from '../../stores/terminal-store';

export const MainContent: React.FC = () => {
  const { t } = useTranslation();
  const activeGroupId = useTerminalStore((state) => state.activeGroupId);
  const groups = useTerminalStore((state) => state.groups);
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {activeGroup && <Toolbar group={activeGroup} />}

      {/* TerminalPool always mounted — all terminals live here */}
      <TerminalPool />

      {/* Empty state overlay when no active group */}
      {!activeGroup && (
        <div className="absolute inset-0 flex items-center justify-center text-fg-muted">
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
            <p className="text-lg mb-2">{t('mainContent.noSelectedGroup')}</p>
            <p className="text-sm">{t('mainContent.selectOrCreateGroup')}</p>
          </div>
        </div>
      )}
    </div>
  );
};
