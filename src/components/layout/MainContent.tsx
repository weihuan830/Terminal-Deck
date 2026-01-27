import React from 'react';
import { useTranslation } from 'react-i18next';
import { Toolbar } from './Toolbar';
import { TerminalGrid } from '../terminal/TerminalGrid';
import { useTerminalStore } from '../../stores/terminal-store';

export const MainContent: React.FC = () => {
  const { t } = useTranslation();
  const { groups, activeGroupId, getActiveGroup } = useTerminalStore();
  const activeGroup = getActiveGroup();

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {activeGroup ? (
        <>
          {/* Toolbar */}
          <Toolbar group={activeGroup} />

          {/* Terminal grid container - all groups stay mounted, visibility controlled by CSS */}
          <div className="flex-1 overflow-hidden relative">
            {groups.map((group) => (
              <div
                key={group.id}
                className="absolute inset-0"
                style={{
                  visibility: group.id === activeGroupId ? 'visible' : 'hidden',
                  // Use visibility instead of display:none so terminals still have dimensions to render correctly
                  // Hidden terminals won't respond to events
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
            <p className="text-lg mb-2">{t('mainContent.noSelectedGroup')}</p>
            <p className="text-sm">{t('mainContent.selectOrCreateGroup')}</p>
          </div>
        </div>
      )}
    </div>
  );
};
