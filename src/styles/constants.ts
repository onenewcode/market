import { theme } from "./theme";

export const statusColors = {
  verified: "bg-green-500",
  unverified: "bg-yellow-500",
  active: "bg-blue-500",
  error: "bg-red-500",
  pending: "bg-yellow-500",
  expired: "bg-gray-500",
  claimed: "bg-green-500",
  cancelled: "bg-red-500",
} as const;

export const scoreLevelColors = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-red-100 text-red-700",
} as const;

export const buttonVariants = theme.button.variants;
export const inputStyles = theme.input;
export const modalStyles = theme.modal;
export const alertStyles = theme.alert;
export const layoutStyles = theme.layout;
export const typographyStyles = theme.typography;

export type ButtonVariant = keyof typeof buttonVariants;
export type StatusColor = keyof typeof statusColors;
export type ScoreLevelColor = keyof typeof scoreLevelColors;
