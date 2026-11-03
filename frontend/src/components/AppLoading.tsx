export function AppLoading() {
  return (
    <main className="bg-canvas grid min-h-screen place-items-center px-6">
      <div
        className="text-ink-muted flex items-center gap-3 text-sm font-medium"
        role="status"
      >
        <span className="loading-dot" aria-hidden="true" />
        Loading DeskPilot
      </div>
    </main>
  );
}
