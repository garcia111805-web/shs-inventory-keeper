import { ReactNode, useEffect } from 'react';

interface Props {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
  className?: string;
  title?: string;
}

export default function ModalOverlay({
  children,
  onClose,
  maxWidth = 'max-w-md',
  className = '',
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`w-full ${maxWidth} my-auto rounded-2xl p-5 sm:p-6 shadow-2xl animate-scale-up max-h-[92vh] ${
          className ? className : 'overflow-y-auto'
        }`}
        style={{ background: 'var(--card-bg)', color: 'var(--fg-color)', border: '1px solid var(--card-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
