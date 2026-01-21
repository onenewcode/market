import { type DialogHTMLAttributes, type ReactNode } from "react";
import { theme } from "../../styles/theme";

interface ModalProps extends DialogHTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  variant?: "default" | "warning" | "error" | "success";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  variant = "default",
  ...props
}: ModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    default: "bg-card",
    warning: "bg-yellow-500/10 border-yellow-500/20",
    error: "bg-red-500/10 border-red-500/20",
    success: "bg-green-500/10 border-green-500/20",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`${theme.layout.card} ${variantStyles[variant]} max-w-md w-full mx-4`}
        {...props}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className={`${theme.typography.h3} text-foreground`}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="mb-4 text-muted">{children}</div>
        {actions && <div className="flex justify-end gap-2">{actions}</div>}
      </div>
    </div>
  );
}
