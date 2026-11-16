"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // A user with an existing session goes straight to the chat dashboard.
  useEffect(() => {
    if (!loading && user) router.replace("/chat");
  }, [user, loading, router]);

  async function handleSignIn() {
    setBusy(true);
    setError("");

    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      setError(
        "Sign-in with Google failed. Check the sign-in settings in Firebase Console and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="center-screen">
      <div className="login-card">
        <h1>SimpleChat App</h1>
        <p className="subtitle">
          Sign in with your Google account to open your conversations.
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button className="primary login-button" onClick={handleSignIn} disabled={busy || loading}>
          {loading ? "Checking your session..." : busy ? "Opening Google..." : "Continue with Google"}
        </button>
      </div>
    </main>
  );
}
