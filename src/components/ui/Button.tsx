import { type ButtonHTMLAttributes } from "react";

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
  const variantStyles = {
    primary: "btn-primary px-6 py-2",
    secondary: "btn-secondary px-6 py-2",
    outline: "btn-outline px-6 py-2",
    ghost: "btn-ghost px-4 py-2",
    link: "btn-link",
  };

  const style = variantStyles[variant as keyof typeof variantStyles] || variantStyles.primary;

  return (
    <button
      className={`btn ${style} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
}
