import { theme } from "../../styles/theme";

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  title = "No data found",
  message,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <h3 className={theme.typography.h3 + " mb-2"}>{title}</h3>
      {message && <p className="text-sm text-muted mb-4">{message}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className={`${theme.button.base} ${theme.button.variants.primary}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
