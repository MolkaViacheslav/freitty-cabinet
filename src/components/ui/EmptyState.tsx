type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

/** Generic "no data" placeholder — used when a filtered list or detail panel has nothing to show. */
export function EmptyState({ icon = "📭", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-white px-6 py-16 text-center">
      <div className="text-3xl">{icon}</div>
      <div className="text-sm font-semibold text-ink">{title}</div>
      {description && <div className="max-w-sm text-xs text-muted">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
