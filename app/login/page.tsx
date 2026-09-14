"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { BookOpen, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
export default function Login() {
  const [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next?.startsWith("/rooms/") ? next : "/";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <Header />
      <main className="auth-split">
        <section className="auth-art">
          <BookOpen size={70} />
          <span className="eyebrow" style={{ marginBottom: 25 }}>
            Your place to figure it out
          </span>
          <h1>
            A shared table.
            <br />
            An open mind.
          </h1>
          <p>
            There’s a particular kind of understanding that happens when you
            work through something together. Make a little room for it.
          </p>
        </section>
        <section className="auth-form">
          <div className="form-wrap">
            <span className="eyebrow">Pull up a chair</span>
            <h1 style={{ marginTop: 15 }}>
              {register ? "Make yourself at home." : "Welcome back."}
            </h1>
            <p className="muted">
              {register
                ? "Create an account to start studying together."
                : "Your notes and your people are waiting."}
            </p>
            <form onSubmit={submit}>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  minLength={10}
                  maxLength={72}
                  autoComplete={register ? "new-password" : "current-password"}
                  required
                />
              </label>
              {register && (
                <small>
                  At least 10 characters. A longer passphrase works well.
                </small>
              )}
              {error && (
                <div role="alert" className="error">
                  {error}
                </div>
              )}
              <button disabled={busy}>
                {busy ? "One moment…" : register ? "Create account" : "Sign in"}
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="quiet"
                onClick={() => setRegister(!register)}
              >
                {register
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}
