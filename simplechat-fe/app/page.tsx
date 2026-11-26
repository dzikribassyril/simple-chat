"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Status login cuma bisa dicek di browser, jadi redirect-nya ditaruh setelah pengecekan auth selesai.
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
