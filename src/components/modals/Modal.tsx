import React, { useEffect } from 'react';
import { cn } from '../../utils/cn';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
}

export const Modal: React.FC<ModalProps> = ({ title, children, onClose, width = 'max-w-md' }) => {
  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 模态框内容 */}
      <div
        className={cn(
          'relative w-full mx-4 bg-bg-secondary border border-border-color rounded-lg shadow-2xl',
          width
        )}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-color">
          <h2 className="text-lg font-medium text-fg-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-fg-muted hover:text-fg-primary hover:bg-bg-hover rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};
