import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { z } from "zod";
import { apiRequest, getErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth-context";

const setupSchema = z
  .object({
    workspaceName: z.string().trim().min(2, "Use at least 2 characters.").max(80),
    name: z.string().trim().min(2, "Enter your full name.").max(100),
    email: z.string().trim().email("Enter a valid work email."),
    password: z.string().min(12, "Use at least 12 characters.").max(128),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export function SetupPage() {
  const { refresh, setupComplete } = useAuth();
  const navigate = useNavigate();
  const [workspaceName, setWorkspaceName] = useState("DeskPilot Support");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const result = setupSchema.safeParse({
      workspaceName,
      name,
      email,
      password,
      confirmPassword,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check the setup details.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("/api/setup", {
        method: "POST",
        body: JSON.stringify({
          workspaceName: result.data.workspaceName,
          name: result.data.name,
          email: result.data.email,
          password: result.data.password,
        }),
      });
      await refresh();
      navigate("/login?setup=complete", { replace: true });
    } catch (reason) {
      setError(getErrorMessage(reason));
      setSubmitting(false);
    }
  }

  if (setupComplete) {
    return (
      <main className="auth-page auth-setup-page">
        <section className="auth-form-panel auth-form-panel-full">
          <div className="auth-form-wrap">
            <span className="setup-icon">
              <CheckCircle2 size={24} />
            </span>
            <p className="eyebrow">WORKSPACE READY</p>
            <h1>DeskPilot is set up</h1>
            <p className="auth-description">
              Sign in to continue to your support workspace.
            </p>
            <Link className="primary-button auth-submit" to="/login">
              Go to sign in <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page auth-setup-page">
      <section className="auth-form-panel auth-form-panel-full">
        <div className="auth-form-wrap setup-form-wrap">
          <Link className="brand-lockup auth-brand-inline" to="/setup">
            <span className="brand-mark" aria-hidden="true">
              D
            </span>
            <span className="brand-name">DeskPilot</span>
          </Link>
          <p className="eyebrow">FIRST-TIME SETUP</p>
          <h1>Create your workspace</h1>
          <p className="auth-description">
            Set up the owner account. You’ll use it to give your support agents access.
          </p>
          <form className="auth-form" onSubmit={submit} noValidate>
            {error && (
              <p className="form-error-banner" role="alert">
                {error}
              </p>
            )}
            <div className="field-wrap">
              <label className="field-label" htmlFor="workspaceName">
                Workspace name
              </label>
              <input
                className="form-control"
                id="workspaceName"
                maxLength={80}
                onChange={(event) => setWorkspaceName(event.target.value)}
                value={workspaceName}
              />
            </div>
            <div className="field-wrap">
              <label className="field-label" htmlFor="ownerName">
                Your name
              </label>
              <input
                autoComplete="name"
                className="form-control"
                id="ownerName"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </div>
            <div className="field-wrap">
              <label className="field-label" htmlFor="ownerEmail">
                Work email
              </label>
              <input
                autoComplete="email"
                className="form-control"
                id="ownerEmail"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </div>
            <div className="field-wrap">
              <label className="field-label" htmlFor="ownerPassword">
                Create a password
              </label>
              <input
                autoComplete="new-password"
                className="form-control"
                id="ownerPassword"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
              <span className="field-help">At least 12 characters.</span>
            </div>
            <div className="field-wrap">
              <label className="field-label" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                autoComplete="new-password"
                className="form-control"
                id="confirmPassword"
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                value={confirmPassword}
              />
            </div>
            <button
              className="primary-button auth-submit"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Creating workspace…" : "Create workspace"}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
          <p className="auth-footnote">
            This one-time setup closes after the first owner account is created.
          </p>
        </div>
      </section>
    </main>
  );
}
