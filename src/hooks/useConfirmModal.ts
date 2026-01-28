import { useState, useCallback } from "react";

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: "danger" | "primary" | "warning";
  onConfirm: () => void;
  loading: boolean;
}

export function useConfirmModal() {
  const [modalState, setModalState] = useState<ConfirmModalState>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    variant: "primary",
    onConfirm: () => {},
    loading: false,
  });

  const openModal = useCallback(
    (options: {
      title: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      variant?: "danger" | "primary" | "warning";
      onConfirm: () => void | Promise<void>;
    }) => {
      setModalState({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel || "Confirm",
        cancelLabel: options.cancelLabel || "Cancel",
        variant: options.variant || "primary",
        onConfirm: options.onConfirm,
        loading: false,
      });
    },
    []
  );

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setModalState((prev) => ({ ...prev, loading }));
  }, []);

  return {
    modalState,
    openModal,
    closeModal,
    setLoading,
  };
}
