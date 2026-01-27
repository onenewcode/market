import { useCallback } from "react";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export interface LoggerContextType {
  debug: (category: string, message: string, data?: unknown) => void;
  info: (category: string, message: string, data?: unknown) => void;
  warn: (category: string, message: string, data?: unknown) => void;
  error: (category: string, message: string, data?: unknown) => void;
}

export function useLogger(): LoggerContextType {
  const debug = useCallback(
    (category: string, message: string, data?: unknown) => {
      console.debug(`[${LogLevel.DEBUG}] [${category}] ${message}`, data || "");
    },
    []
  );

  const info = useCallback(
    (category: string, message: string, data?: unknown) => {
      console.info(`[${LogLevel.INFO}] [${category}] ${message}`, data || "");
    },
    []
  );

  const warn = useCallback(
    (category: string, message: string, data?: unknown) => {
      console.warn(`[${LogLevel.WARN}] [${category}] ${message}`, data || "");
    },
    []
  );

  const error = useCallback(
    (category: string, message: string, data?: unknown) => {
      console.error(`[${LogLevel.ERROR}] [${category}] ${message}`, data || "");
    },
    []
  );

  return {
    debug,
    info,
    warn,
    error,
  };
}
