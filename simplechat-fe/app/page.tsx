"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // The Firebase session is only known in the browser, so the redirect happens
  // after the auth state has been checked.
  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/chat" : "/login");
  }, [user, loading, router]);

  return (
    <main className="center-screen">
      <p className="list-status">Checking your session...</p>
    </main>
  );
}
