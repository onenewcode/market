import { type ButtonHTMLAttributes } from "react";
import { theme } from "../../styles/theme";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  isLoading?: boolean;
}

export function Button({ 
  children, 
  className = "", 
  variant = "primary", 
  isLoading, 
  disabled,
  ...props 
}: ButtonProps) {
  const style = theme.button.variants[variant] || theme.button.variants.primary;

  return (
    <button
      className={`${theme.button.base} ${style} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
}
