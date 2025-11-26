"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    fetch("/api/auth/check", {
      credentials: 'include'
    })
      .then((res) => res.json())
          .then((data) => {
            if (data && data.authenticated) {
              router.push("/dashboard");
            }
          });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, rememberMe }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--surface-muted)]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-20 top-10 w-72 h-72 rounded-full bg-[rgba(13,140,64,0.12)] blur-3xl" />
        <div className="absolute right-0 bottom-0 w-80 h-80 rounded-full bg-[rgba(13,140,64,0.15)] blur-3xl" />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto min-h-screen px-6 py-12 flex flex-col gap-10">
        <header className="flex items-center justify-between bg-white/70 backdrop-blur rounded-2xl border border-white/60 px-6 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[url('/img/logo.png')] bg-cover bg-center flex items-center justify-center">

            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-[var(--color-text-muted)]">Pointman International Services Inc.</p>
              <h1 className="text-xl font-semibold text-[var(--color-text)]">Pointman Applicant Tracking System</h1>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 flex-1">
          <div className="text-center lg:text-left space-y-6 max-w-xl">
            <p className="text-xs uppercase tracking-[0.5em] text-[var(--color-text-muted)]">
              Pointman Applicant Tracking
            </p>
            <h2 className="text-4xl lg:text-5xl font-semibold text-[var(--color-text)] leading-tight">
              Secure access to your recruitment command center
            </h2>
            <p className="text-[var(--color-text-muted)] text-base leading-relaxed">
              Manage applicants, transmittals, deployments, and passports in one unified workspace.
              Sign in to keep your operations running smoothly.
            </p>
          </div>

          <div className="w-full max-w-md glass-panel p-8 space-y-6 border border-white/70 shadow-xl shadow-[rgba(9,59,26,0.08)] rounded-[2rem]">
            <div className="space-y-1 text-center">
              <h2 className="text-2xl font-semibold text-[var(--color-text)]">
                Welcome back
              </h2>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-[var(--color-text)]"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="input-soft w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[var(--color-text)]"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-soft w-full"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-secondary)] focus:ring-[var(--color-secondary)] cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="flex items-center justify-between text-[var(--color-text-muted)] text-xs">
              <div>
                <p className="font-semibold text-[var(--color-text)]">Need access?</p>
                <p>Contact IT Pointman to provision a new account.</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[var(--color-text)]">Support</p>
                <p>itpointman41@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
