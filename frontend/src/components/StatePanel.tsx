import { AlertCircle, Inbox } from "lucide-react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <span className="loading-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="state-panel state-panel-error" role="alert">
      <AlertCircle size={19} aria-hidden="true" />
      <div>
        <p className="text-ink font-semibold">We couldn’t load this view</p>
        <p className="text-ink-muted mt-1 text-sm">{message}</p>
        <button className="text-button mt-3" onClick={onRetry} type="button">
          Try again
        </button>
      </div>
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="state-panel state-panel-empty">
      <span className="empty-icon">
        <Inbox size={20} aria-hidden="true" />
      </span>
      <div>
        <p className="text-ink font-semibold">{title}</p>
        <p className="text-ink-muted mt-1 text-sm">{message}</p>
      </div>
    </div>
  );
}
