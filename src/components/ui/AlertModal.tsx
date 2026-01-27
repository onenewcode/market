import { theme } from "../../styles/theme";

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  variant: "default" | "warning" | "error" | "success";
  onClose: () => void;
  onConfirm: () => void;
  confirmText: string;
  cancelText: string;
  showCancel: boolean;
}

export function AlertModal({
  isOpen,
  title,
  message,
  variant,
  onClose,
  onConfirm,
  confirmText,
  cancelText,
  showCancel,
}: AlertModalProps) {
  if (!isOpen) return null;

  const getAlertClass = () => {
    switch (variant) {
      case "warning":
        return theme.alert.warning;
      case "error":
        return theme.alert.error;
      case "success":
        return theme.alert.success;
      default:
        return "";
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case "success":
        return theme.button.variants.success;
      case "error":
        return theme.button.variants.danger;
      case "warning":
        return theme.button.variants.warning;
      default:
        return theme.button.variants.primary;
    }
  };

  const confirmButtonClass = `${theme.button.base} ${getButtonVariant()}`;
  const cancelButtonClass = `${theme.button.base} ${theme.button.variants.secondary}`;

  return (
    <div className={theme.modal.overlay}>
      <div className={`${theme.modal.container} ${getAlertClass()}`}>
        <div className={theme.modal.header}>
          <h3 className={theme.modal.title}>{title}</h3>
          <button onClick={onClose} className={theme.modal.closeButton}>
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
        <div className={theme.modal.content}>{message}</div>
        <div className={theme.modal.footer}>
          {showCancel && (
            <button onClick={onClose} className={cancelButtonClass}>
              {cancelText}
            </button>
          )}
          <button onClick={onConfirm} className={confirmButtonClass}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
