export const theme = {
  // Layout
  layout: {
    pageContainer: "space-y-6",
    mainContainer:
      "relative min-h-screen overflow-x-clip bg-bg1 text-foreground",
    contentWrapper:
      "relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-10 border-x border-border-low px-6 py-16",
    header: "space-y-3",
    section: "w-full max-w-3xl",
    card: "bg-card border border-border-low rounded-xl shadow-sm p-6",
    cardCompact: "bg-card border border-border-low rounded-lg p-4",
    flexBetween: "flex justify-between items-center",
    flexCenter: "flex items-center justify-center",
    gridConnectors: "grid gap-3 sm:grid-cols-2 max-w-md mx-auto",
  },

  // Typography
  typography: {
    h1: "text-3xl font-semibold tracking-tight text-foreground",
    h2: "text-2xl font-bold",
    h3: "text-xl font-semibold",
    body: "text-base leading-relaxed text-muted",
    label: "text-sm text-muted",
    mono: "font-mono text-sm break-all",
    link: "text-sm underline text-muted hover:text-foreground cursor-pointer",
    error: "text-red-500 text-sm",
  },

  // Components
  button: {
    base: "inline-flex items-center justify-center rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    variants: {
      primary:
        "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm px-6 py-2",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 px-6 py-2",
      danger:
        "bg-red-500 text-white hover:bg-red-600 px-6 py-2",
      outline:
        "border border-border-low hover:bg-muted/10 bg-transparent px-6 py-2",
      ghost:
        "hover:bg-muted/10 text-foreground/80 hover:text-foreground px-4 py-2",
      link: "text-sm underline text-muted hover:text-foreground p-0 h-auto",
      connector:
        "flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5",
    },
    nav: {
      base: "px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer",
      active: "border-primary text-primary",
      inactive: "border-transparent text-muted hover:text-foreground",
    },
  },

  input: {
    base: "rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-60 w-full",
  },

  alert: {
    base: "p-3 rounded-lg text-sm border",
    warning:
      "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400",
    error: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  },

  status: {
    verified: "bg-green-500",
    unverified: "bg-yellow-500",
    error: "bg-red-500",
    badge: "inline-block w-2 h-2 rounded-full",
    level: {
      high: "bg-green-100 text-green-700",
      medium: "bg-yellow-100 text-yellow-700",
      low: "bg-red-100 text-red-700",
    },
  },
};
