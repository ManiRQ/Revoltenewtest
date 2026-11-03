import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { apiRequest, getErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth-context";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid work email."),
  password: z.string().min(1, "Enter your password."),
});

export function LoginPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const state = location.state as { from?: { pathname?: string } } | null;
  const setupJustFinished =
    new URLSearchParams(location.search).get("setup") === "complete";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest<unknown>("/api/auth/sign-in/email", {
        method: "POST",
        body: JSON.stringify({ ...result.data, rememberMe: true }),
      });
      await refresh();
      navigate(state?.from?.pathname ?? "/dashboard", { replace: true });
    } catch (reason) {
      setError(getErrorMessage(reason));
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-side-panel">
        <Link className="brand-lockup auth-brand" to="/login">
          <span className="brand-mark" aria-hidden="true">
            D
          </span>
          <span className="brand-name">DeskPilot</span>
        </Link>
        <div className="auth-side-content">
          <span className="auth-overline">SUPPORT, IN SYNC</span>
          <h1>Make every customer feel heard.</h1>
          <p>One calm workspace for the conversations that move your team forward.</p>
          <div className="auth-quote-card">
            <span className="auth-quote-mark">“</span>
            <p>Great support is a conversation, not a queue.</p>
            <span className="auth-quote-label">YOUR TEAM, IN STEP</span>
          </div>
        </div>
        <span className="auth-side-footer">DeskPilot Support Workspace</span>
      </div>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <span className="auth-mobile-mark">
            <span className="brand-mark">D</span> DeskPilot
          </span>
          <p className="eyebrow">WELCOME BACK</p>
          <h2>Sign in to DeskPilot</h2>
          <p className="auth-description">
            Use your work account to continue to the support workspace.
          </p>
          {setupJustFinished && (
            <p className="success-banner auth-banner" role="status">
              Workspace is ready. Sign in with the owner account you just created.
            </p>
          )}

          <form className="auth-form" onSubmit={submit} noValidate>
            {error && (
              <p className="form-error-banner" role="alert">
                {error}
              </p>
            )}
            <div className="field-wrap">
              <label className="field-label" htmlFor="email">
                Work email
              </label>
              <input
                autoComplete="username"
                className="form-control"
                id="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                type="email"
                value={email}
              />
            </div>
            <div className="field-wrap">
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <div className="password-input-wrap">
                <input
                  autoComplete="current-password"
                  className="form-control"
                  id="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="password-visibility"
                  onClick={() => setShowPassword((value) => !value)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <button
              className="primary-button auth-submit"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Signing in…" : "Sign in"}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
          <p className="auth-footnote">Access is managed by your workspace owner.</p>
        </div>
      </section>
    </main>
  );
}
