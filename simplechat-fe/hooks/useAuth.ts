import { useEffect, useState } from "react";
import { authAdapter } from "@/lib/adapters";

export function useAuth() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authAdapter.onAuthChange((userId) => {
      setUid(userId);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { uid, user: uid, loading };
}
