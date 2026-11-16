import { useEffect, useState } from "react";
import { onAuthStateChanged, type User as AuthUser } from "firebase/auth";
import { auth } from "@/lib/firebase";

type AuthState = {
  user: AuthUser | null;
  ready: boolean;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, ready: false });

  useEffect(() => {
    // The listener is attached in the browser and released when the component unmounts.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ user, ready: true });
    });

    return unsubscribe;
  }, []);

  return { user: state.user, loading: !state.ready };
}
