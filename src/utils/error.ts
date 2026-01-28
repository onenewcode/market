export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

export function isNetworkError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("connection")
  );
}

export function isUserCancelledError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  const userCancelPatterns = [
    "user rejected",
    "user cancelled",
    "transaction cancelled",
  ];

  if (userCancelPatterns.some((pattern) => message.includes(pattern))) {
    return true;
  }

  if (error instanceof Error) {
    const errorWithCause = error as Error & { cause?: unknown };
    if (errorWithCause.cause) {
      const causeMessage = getErrorMessage(errorWithCause.cause).toLowerCase();
      if (
        userCancelPatterns.some((pattern) => causeMessage.includes(pattern))
      ) {
        return true;
      }
    }
  }

  return false;
}
