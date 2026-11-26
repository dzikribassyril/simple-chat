"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authAdapter } from "@/lib/adapters";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace("/chat");
  }, [user, loading, router]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !username.trim() || !password) return;

    setBusy(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), username: username.trim(), password }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || "Registration failed");
      }

      // Auto-login setelah register berhasil
      await authAdapter.signInWithEmail(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="center-screen">
      <div className="login-card">
        <h1>Create Account</h1>
        <p className="subtitle">
          Enter your email, username, and password to get started.
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy || loading}
            required
            autoComplete="email"
          />
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={busy || loading}
            required
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy || loading}
            required
            autoComplete="new-password"
          />
          <button type="submit" disabled={busy || loading || !email.trim() || !username.trim() || !password}>
            {busy ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p style={{ marginTop: "16px", fontSize: "14px", color: "#71717a", textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#2563eb", textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}