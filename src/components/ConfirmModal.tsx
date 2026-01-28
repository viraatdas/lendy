'use client';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  icon = '❓',
  variant = 'info',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      headerBg: 'bg-[#ef4444]/10',
      confirmBtn: 'bg-[#ef4444] hover:bg-[#f87171]',
      confirmShadow: '4px 4px 0 #b91c1c, -2px -2px 0 #fca5a5 inset',
    },
    warning: {
      headerBg: 'bg-[#ffd700]/10',
      confirmBtn: 'bg-[#ffd700] hover:bg-[#ffed4a] text-[#2d2d2d]',
      confirmShadow: '4px 4px 0 #b8860b, -2px -2px 0 #fff59d inset',
    },
    info: {
      headerBg: 'bg-[#7c5cff]/10',
      confirmBtn: 'bg-[#7c5cff] hover:bg-[#9d84ff]',
      confirmShadow: '4px 4px 0 #5b3fd9, -2px -2px 0 #a78bfa inset',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#2d2d2d]/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm pixel-card animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`p-4 border-b-4 border-[#2d2d2d] ${styles.headerBg}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <h2 className="text-xl" style={{ fontFamily: 'Silkscreen, cursive' }}>
              {title}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-lg text-[#555] leading-relaxed" style={{ fontFamily: 'VT323, monospace' }}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t-2 border-[#eee] flex gap-3">
          <button
            onClick={onCancel}
            className="pixel-btn flex-1"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 text-white border-none px-6 py-3 cursor-pointer transition-transform active:translate-y-0.5"
            style={{
              fontFamily: 'Silkscreen, cursive',
              fontSize: '14px',
              boxShadow: styles.confirmShadow,
              backgroundColor: variant === 'danger' ? '#ef4444' : variant === 'warning' ? '#ffd700' : '#7c5cff',
              color: variant === 'warning' ? '#2d2d2d' : 'white',
            }}
          >
            {confirmText}
          </button>
        </div>

        {/* Decorative corners */}
        <div className="absolute -top-1 -left-1 w-3 h-3 bg-[#2d2d2d]" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#2d2d2d]" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-[#2d2d2d]" />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#2d2d2d]" />
      </div>
    </div>
  );
}
