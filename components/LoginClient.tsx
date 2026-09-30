"use client";
import { useLanguage } from "@/components/LanguageProvider";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Github } from "lucide-react";
import { signInError, signInReturnPath } from "@/lib/auth-navigation";
import Header from "@/components/Header";
export default function LoginClient({
  enabledProviders,
}: {
  enabledProviders: string[];
}) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [providerBusy, setProviderBusy] = useState("");
  const [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setError(
      signInError(new URLSearchParams(window.location.search).get("error")),
    );
  }, []);
  async function providerSignIn(id: string) {
    setError("");
    setProviderBusy(id);
    try {
      await signIn(id, {
        callbackUrl: signInReturnPath(window.location.search),
      });
    } catch {
      setError("Unable to sign in. Please try again.");
      setProviderBusy("");
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || providerBusy) return;
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email")),
      password = String(data.get("password"));
    try {
      if (register) {
        const r = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!r.ok) throw new Error((await r.json()).error);
      }
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error)
        throw new Error("Email or password was not recognized.");
      window.location.href = signInReturnPath(window.location.search);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="auth-split">
        <section className="auth-art">
          <h2>
            {t("Learn from")}
            <br />
            {t("the same page")}
          </h2>
          <p>
            {t(
              "Bring your course notes, ask questions together, and check your understanding against the source.",
            )}
          </p>
        </section>
        <section className="auth-form">
          <div className="form-wrap">
            <h1>{register ? t("Create your account") : t("Sign in")}</h1>
            <p className="muted">
              {register
                ? t("Create an account to start studying together.")
                : t("Continue to your rooms, notes, and discussions.")}
            </p>
            <div
              className="oauth-options"
              aria-label={t("Other sign-in options")}
            >
              {[
                { id: "google", name: "Google" },
                { id: "azure-ad", name: "Microsoft" },
                { id: "github", name: "GitHub" },
              ].map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  className="secondary oauth-button"
                  disabled={
                    busy ||
                    !!providerBusy ||
                    !enabledProviders.includes(provider.id)
                  }
                  aria-busy={providerBusy === provider.id}
                  aria-describedby={
                    !enabledProviders.includes(provider.id)
                      ? "oauth-availability"
                      : undefined
                  }
                  onClick={() => providerSignIn(provider.id)}
                >
                  {provider.id === "github" ? (
                    <Github size={19} aria-hidden="true" />
                  ) : provider.id === "azure-ad" ? (
                    <svg
                      viewBox="0 0 20 20"
                      width="19"
                      height="19"
                      aria-hidden="true"
                    >
                      <path
                        fill="currentColor"
                        d="M1 1h8v8H1zm10 0h8v8h-8zM1 11h8v8H1zm10 0h8v8h-8z"
                      />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      width="19"
                      height="19"
                      aria-hidden="true"
                    >
                      <path
                        fill="currentColor"
                        d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.8 4.8 0 0 1-2 3.2A6.5 6.5 0 1 1 18 7.4l2.8-2.8A10.5 10.5 0 1 0 12 22.5c6 0 9.8-4.2 9.8-10.3Z"
                      />
                    </svg>
                  )}
                  {providerBusy === provider.id
                    ? t("Connecting…")
                    : t("Continue with {provider}", {
                        provider: provider.name,
                      })}
                </button>
              ))}
            </div>
            {enabledProviders.length < 3 && (
              <small id="oauth-availability" className="muted">
                {t("Unavailable sign-in options are still being configured.")}
              </small>
            )}
            <div className="auth-divider">
              <span>{t("or use your email")}</span>
            </div>
            <form onSubmit={submit}>
              <label>
                {t("Email address")}
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <div className="stack" style={{ gap: 7 }}>
                <label htmlFor="password">{t("Password")}</label>
                <span className="password-field">
                  <input
                    id="password"
                    name="password"
                    type={visible ? "text" : "password"}
                    minLength={register ? 10 : undefined}
                    aria-describedby={register ? "password-help" : undefined}
                    maxLength={72}
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    required
                  />
                  <button
                    type="button"
                    className="secondary icon-button"
                    aria-label={
                      visible ? t("Hide password") : t("Show password")
                    }
                    aria-pressed={visible}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </div>
              {register && (
                <small id="password-help">
                  {t("At least 10 characters. A longer passphrase works well.")}
                </small>
              )}
              {error && (
                <div role="alert" className="error">
                  {t(error)}
                </div>
              )}
              <button disabled={busy || !!providerBusy} aria-busy={busy}>
                {busy
                  ? register
                    ? t("Creating account…")
                    : t("Signing in…")
                  : register
                    ? t("Create account")
                    : t("Sign in")}
              </button>
              <button
                type="button"
                className="quiet"
                disabled={busy || !!providerBusy}
                onClick={() => {
                  setRegister(!register);
                  setError("");
                }}
              >
                {register
                  ? t("Already have an account? Sign in")
                  : t("New here? Create an account")}
              </button>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}
