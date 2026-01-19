import { type InputHTMLAttributes, forwardRef } from "react";
import { theme } from "../../styles/theme";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`${theme.input.base} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
