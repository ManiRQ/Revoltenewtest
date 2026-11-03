import { KeyRound, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { z } from "zod";
import { apiRequest, getErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth-context";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(12, "Use at least 12 characters.").max(128),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "Choose a password you haven’t used for this temporary sign-in.",
    path: ["newPassword"],
  });

export function ChangePasswordPage() {
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const result = passwordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check the password details.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest("/api/account/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: result.data.currentPassword,
          newPassword: result.data.newPassword,
        }),
      });
      await refresh();
      navigate("/dashboard", { replace: true });
    } catch (reason) {
      setError(getErrorMessage(reason));
      setSaving(false);
    }
  }

  return (
    <main className="auth-page auth-setup-page">
      <section className="auth-form-panel auth-form-panel-full">
        <div className="auth-form-wrap">
          <span className="setup-icon">
            <KeyRound size={23} />
          </span>
          <p className="eyebrow">SECURE YOUR ACCOUNT</p>
          <h1>
            {session?.mustChangePassword ? "Set a new password" : "Change password"}
          </h1>
          <p className="auth-description">
            {session?.mustChangePassword
              ? "Your temporary password has been used. Create a new one before continuing."
              : "Enter your current password, then choose a new one."}
          </p>
          {session?.mustChangePassword && (
            <p className="info-banner">
              <ShieldCheck size={16} />
              Choose at least 12 characters. Your team owner will not see it.
            </p>
          )}
          <form className="auth-form" onSubmit={submit} noValidate>
            {error && (
              <p className="form-error-banner" role="alert">
                {error}
              </p>
            )}
            <div className="field-wrap">
              <label className="field-label" htmlFor="currentPassword">
                Current password
              </label>
              <input
                autoComplete="current-password"
                className="form-control"
                id="currentPassword"
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                value={currentPassword}
              />
            </div>
            <div className="field-wrap">
              <label className="field-label" htmlFor="newPassword">
                New password
              </label>
              <input
                autoComplete="new-password"
                className="form-control"
                id="newPassword"
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                value={newPassword}
              />
            </div>
            <div className="field-wrap">
              <label className="field-label" htmlFor="confirmPassword">
                Confirm new password
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
              disabled={saving}
              type="submit"
            >
              {saving ? "Saving password…" : "Save password"}
            </button>
          </form>
          {!session?.mustChangePassword && (
            <button
              className="text-button auth-cancel"
              onClick={() => navigate(-1)}
              type="button"
            >
              Cancel
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
