import { ReactNode, useEffect } from 'react';

interface Props {
  children: ReactNode;
  onClose: () => void;
}

export default function ModalOverlay({ children, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl p-5 sm:p-6 shadow-2xl animate-scale-up"
        style={{ background: 'var(--card-bg)', color: 'var(--fg-color)', border: '1px solid var(--card-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
