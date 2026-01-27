import {
  useState,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { AlertModal } from "../components/ui/AlertModal";

interface AlertContextType {
  showAlert: (
    title: string,
    message: string,
    options?: {
      variant?: "default" | "warning" | "error" | "success";
      onConfirm?: () => void;
      confirmText?: string;
      cancelText?: string;
      showCancel?: boolean;
    }
  ) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "default" | "warning" | "error" | "success";
    onConfirm?: () => void;
    confirmText: string;
    cancelText: string;
    showCancel: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "default",
    confirmText: "OK",
    cancelText: "Cancel",
    showCancel: false,
  });

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      options?: {
        variant?: "default" | "warning" | "error" | "success";
        onConfirm?: () => void;
        confirmText?: string;
        cancelText?: string;
        showCancel?: boolean;
      }
    ) => {
      setAlert({
        isOpen: true,
        title,
        message,
        variant: options?.variant || "default",
        onConfirm: options?.onConfirm,
        confirmText: options?.confirmText || "OK",
        cancelText: options?.cancelText || "Cancel",
        showCancel: options?.showCancel || false,
      });
    },
    []
  );

  const handleClose = useCallback(() => {
    setAlert((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (alert.onConfirm) {
      alert.onConfirm();
    }
    handleClose();
  }, [handleClose, alert]);

  const value = {
    showAlert,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertModal
        isOpen={alert.isOpen}
        title={alert.title}
        variant={alert.variant}
        onClose={handleClose}
        onConfirm={handleConfirm}
        confirmText={alert.confirmText}
        cancelText={alert.cancelText}
        showCancel={alert.showCancel}
        message={alert.message}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}
