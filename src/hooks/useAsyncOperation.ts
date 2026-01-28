import { useCallback, useState } from "react";
import { useAlert } from "./useAlert";
import { getErrorMessage } from "../utils/error";

export interface AsyncOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showSuccessAlert?: boolean;
  showErrorAlert?: boolean;
  suppressUserCancelAlert?: boolean;
  onUserCancel?: () => void;
}

export function useAsyncOperation() {
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  const execute = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      options: AsyncOperationOptions = {}
    ): Promise<T | null> => {
      const {
        successMessage,
        errorMessage,
        onSuccess,
        onError,
        showSuccessAlert = false,
        showErrorAlert = true,
        suppressUserCancelAlert = false,
        onUserCancel,
      } = options;

      setLoading(true);
      try {
        const result = await operation();

        if (successMessage && showSuccessAlert) {
          showAlert("Success", successMessage, { variant: "success" });
        }

        onSuccess?.();
        return result;
      } catch (error) {
        const errorMsg = getErrorMessage(error);
        const isUserCancelled = isUserCancelledError(error);

        if (isUserCancelled) {
          console.warn("User cancelled operation:", errorMsg);
          onUserCancel?.();
          return null;
        }

        const displayError = errorMessage || `Operation failed: ${errorMsg}`;

        if (showErrorAlert) {
          showAlert("Error", displayError, { variant: "error" });
        }

        onError?.(error instanceof Error ? error : new Error(errorMsg));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [showAlert]
  );

  return { execute, loading };
}

function isUserCancelledError(error: unknown): boolean {
  const errorMsg = getErrorMessage(error).toLowerCase();
  const userCancelPatterns = [
    "user rejected",
    "user cancelled",
    "transaction cancelled",
    "transaction plan failed to execute",
  ];
  return userCancelPatterns.some((pattern) => errorMsg.includes(pattern));
}
