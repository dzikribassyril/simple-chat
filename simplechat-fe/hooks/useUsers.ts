import { useEffect, useState } from "react";
import { dbAdapter } from "@/lib/adapters";
import type { Contact } from "@/lib/types";

type UsersState = {
  uid: string;
  users: Contact[];
  loading: boolean;
  error: string;
};

export function useUsers(uid: string | null) {
  const [state, setState] = useState<UsersState>({
    uid: "",
    users: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    if (!uid) return;

    let active = true;

    const unsubscribe = dbAdapter.subscribeUsers(
      (users) => {
        if (active) setState({ uid, users, loading: false, error: "" });
      },
      () => {
        if (active) {
          setState({
            uid,
            users: [],
            loading: false,
            error: "Could not load user directory. Check access permissions and reload page.",
          });
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid]);

  if (!uid) return { users: [], loading: false, error: "" };

  if (state.uid !== uid) return { users: [], loading: true, error: "" };

  return { users: state.users, loading: state.loading, error: state.error };
}
