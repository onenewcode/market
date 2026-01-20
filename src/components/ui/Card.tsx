import { type ReactNode } from "react";
import { theme } from "../../styles/theme";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return <div className={`${theme.layout.card} ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: CardProps) {
  return (
    <h2 className={`${theme.typography.h2} mb-4 ${className}`}>{children}</h2>
  );
}
