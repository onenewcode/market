import { theme } from "../../styles/theme";
import { type ButtonVariant } from "../../styles/constants";
import { LoadingSpinner } from "./LoadingSpinner";

interface ActionButtonProps {
  label: string;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  variant?: ButtonVariant;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
}

export function ActionButton({
  label,
  loading = false,
  loadingLabel,
  disabled = false,
  variant = "primary",
  onClick,
  className = "",
  type = "button",
}: ActionButtonProps) {
  const variantClass = theme.button.variants[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${theme.button.base} ${variantClass} ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          {loadingLabel || "Processing..."}
        </span>
      ) : (
        label
      )}
    </button>
  );
}
