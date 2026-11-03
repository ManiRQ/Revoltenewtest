import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="panel state-panel state-panel-empty">
      <div>
        <p className="text-ink font-semibold">That page isn’t here</p>
        <p className="text-ink-muted mt-1 text-sm">
          The link may be incorrect or the page may have moved.
        </p>
        <Link className="text-button mt-3 inline-flex" to="/dashboard">
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}
