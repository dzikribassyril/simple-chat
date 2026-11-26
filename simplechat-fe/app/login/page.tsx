"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authAdapter } from "@/lib/adapters";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace("/chat");
  }, [user, loading, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setBusy(true);
    setError("");

    try {
      // Panggil backend untuk lookup email dari username
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/users/lookup?username=${encodeURIComponent(username.trim())}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "User not found");
      }
      const { email } = await res.json();

      // Login pakai email yang didapat
      await authAdapter.signInWithEmail(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Check your credentials.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="center-screen">
      <div className="login-card">
        <h1>SimpleChat App</h1>
        <p className="subtitle">
          Sign in with your username and password.
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
            autoComplete="current-password"
          />
          <button type="submit" disabled={busy || loading || !username.trim() || !password}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={{ marginTop: "16px", fontSize: "14px", color: "#71717a", textAlign: "center" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "#2563eb", textDecoration: "none" }}>
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}