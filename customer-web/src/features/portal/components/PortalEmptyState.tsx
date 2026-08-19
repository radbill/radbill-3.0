interface PortalEmptyStateProps {
  title: string;
  description?: string;
}

export function PortalEmptyState({ title, description }: PortalEmptyStateProps) {
  return (
    <div className="portal-empty">
      <span className="portal-empty__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M6 7.5h12M8 4.5h8M6 10.5v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5M10 13h4" />
        </svg>
      </span>
      <p className="text-body">{title}</p>
      {description ? <p className="text-muted">{description}</p> : null}
    </div>
  );
}
