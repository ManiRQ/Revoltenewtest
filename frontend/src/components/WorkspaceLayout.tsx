import {
  Activity,
  Bell,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings2,
  Users,
  UserRound,
  X,
  Ticket,
  UserCog,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { apiRequest, getErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useApiResource } from "../lib/use-api-resource";
import type { TicketPage, WorkspaceSettings } from "../types";

const navigation = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Tickets", to: "/tickets", icon: Ticket },
  { label: "Customers", to: "/customers", icon: Users },
  { label: "Agents", to: "/agents", icon: UserCog },
  { label: "Reports", to: "/reports", icon: Activity },
  { label: "Settings", to: "/settings", icon: Settings2 },
];

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const recent = useApiResource<TicketPage>(
    "/api/tickets?page=1&pageSize=4&sort=updated",
  );
  const workspace = useApiResource<WorkspaceSettings>("/api/settings");
  const health = useApiResource<{ status: string }>("/api/health");
  const serviceUnavailable = Boolean(
    health.error || health.data?.status === "unavailable",
  );

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = query.trim();
    navigate(search ? `/tickets?q=${encodeURIComponent(search)}` : "/tickets");
    setMobileMenuOpen(false);
  }

  async function signOut() {
    setSignOutError(null);
    try {
      await apiRequest<unknown>("/api/auth/sign-out", { method: "POST" });
      await refresh();
      navigate("/login", { replace: true });
    } catch (error) {
      setSignOutError(getErrorMessage(error));
    }
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <NavLink className="brand-lockup" to="/dashboard" aria-label="DeskPilot home">
          <span className="brand-mark" aria-hidden="true">
            D
          </span>
          <span className="brand-name">DeskPilot</span>
          <span className="brand-plan">SUPPORT</span>
        </NavLink>

        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switcher">
          <span className="workspace-avatar">D</span>
          <span className="min-w-0 flex-1">
            <span className="text-ink block truncate text-sm font-semibold">
              {workspace.data?.workspaceName ?? "DeskPilot Support"}
            </span>
            <span className="text-ink-muted block text-xs">Main workspace</span>
          </span>
          <ChevronDown size={15} className="text-ink-muted" aria-hidden="true" />
        </div>

        <p className="nav-section-label">WORKSPACE</p>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink
              className={({ isActive }) =>
                `nav-link${isActive ? "nav-link-active" : ""}`
              }
              key={to}
              to={to}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
              {label === "Tickets" && (
                <span className="nav-count">{recent.data?.total ?? "—"}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <a className="nav-link" href="mailto:support@deskpilot.example">
            <CircleHelp size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>Help & support</span>
          </a>
          <div className="sidebar-footnote">
            <span
              className={`online-indicator${serviceUnavailable ? "offline-indicator" : ""}`}
              aria-hidden="true"
            />
            {health.loading
              ? "Checking service status…"
              : serviceUnavailable
                ? "Service check unavailable"
                : "All systems operational"}
          </div>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="topbar">
          <button
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            className="icon-button mobile-menu-toggle"
            onClick={() => setMobileMenuOpen((value) => !value)}
            type="button"
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>

          <form className="global-search" onSubmit={submitSearch} role="search">
            <Search size={17} aria-hidden="true" />
            <input
              aria-label="Search tickets by ID or subject"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tickets…"
              value={query}
            />
          </form>

          <div className="topbar-actions">
            <div className="relative">
              <button
                aria-expanded={notificationsOpen}
                aria-label="Recent ticket activity"
                className="icon-button notification-button"
                onClick={() => setNotificationsOpen((value) => !value)}
                type="button"
              >
                <Bell size={19} strokeWidth={1.8} />
              </button>
              {notificationsOpen && (
                <div className="popover notification-popover">
                  <div className="popover-heading">
                    <span>Recent ticket activity</span>
                    <button
                      className="text-button text-xs"
                      onClick={() => setNotificationsOpen(false)}
                      type="button"
                    >
                      Close
                    </button>
                  </div>
                  {recent.loading ? (
                    <p className="popover-empty">Checking for updates…</p>
                  ) : recent.error ? (
                    <p className="popover-empty">Activity is unavailable right now.</p>
                  ) : recent.data?.items.length ? (
                    recent.data.items.slice(0, 3).map((ticket) => (
                      <button
                        className="notification-item"
                        key={ticket.id}
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate(`/tickets/${ticket.id}`);
                        }}
                        type="button"
                      >
                        <span className="notification-item-dot" />
                        <span className="min-w-0">
                          <span className="text-ink block truncate font-medium">
                            {ticket.subject}
                          </span>
                          <span className="text-ink-muted mt-1 block text-xs">
                            {ticket.ticketNumber} · {ticket.status}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="popover-empty">No recent ticket activity.</p>
                  )}
                </div>
              )}
            </div>

            <div className="profile-menu-wrap">
              <button
                aria-expanded={profileOpen}
                aria-label={`Profile menu for ${session?.user.name ?? "current user"}`}
                className="profile-button"
                onClick={() => setProfileOpen((value) => !value)}
                type="button"
              >
                <span className="avatar avatar-small">
                  {session?.user.name.slice(0, 1).toUpperCase() ?? "D"}
                </span>
                <span className="profile-name">{session?.user.name ?? "Agent"}</span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
              {profileOpen && (
                <div className="popover profile-popover">
                  <div className="profile-popover-user">
                    <span className="text-ink block font-semibold">
                      {session?.user.name}
                    </span>
                    <span className="text-ink-muted mt-1 block text-xs">
                      {session?.user.email}
                    </span>
                    <span className="bg-quiet text-ink-muted mt-2 inline-flex rounded px-2 py-1 text-[10px] font-bold tracking-wide uppercase">
                      {session?.user.role === "owner"
                        ? "Workspace owner"
                        : "Support agent"}
                    </span>
                  </div>
                  <NavLink
                    className="profile-menu-item"
                    onClick={() => setProfileOpen(false)}
                    to="/change-password"
                  >
                    <UserRound size={16} />
                    Change password
                  </NavLink>
                  <button
                    className="profile-menu-item profile-menu-danger"
                    onClick={() => void signOut()}
                    type="button"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {signOutError && (
          <p className="form-error-banner" role="alert">
            {signOutError}
          </p>
        )}

        {mobileMenuOpen && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {navigation.map(({ label, to, icon: Icon }) => (
              <NavLink
                className={({ isActive }) =>
                  `mobile-nav-link${isActive ? "mobile-nav-link-active" : ""}`
                }
                key={to}
                onClick={() => setMobileMenuOpen(false)}
                to={to}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        )}

        <main className="page-content" key={location.pathname}>
          {children}
        </main>
      </div>
    </div>
  );
}
