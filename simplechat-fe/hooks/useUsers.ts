import { useEffect, useState } from "react";
import { subscribeUsers } from "@/lib/users";
import type { ChatUser } from "@/lib/types";

type UsersState = {
  uid: string;
  users: ChatUser[];
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
    // The subscription only opens once a session exists so Firestore does not
    // reject the request.
    if (!uid) return;

    let active = true;

    const unsubscribe = subscribeUsers(
      (users) => {
        if (active) setState({ uid, users, loading: false, error: "" });
      },
      () => {
        if (active) {
          setState({
            uid,
            users: [],
            loading: false,
            error: "Could not load the user directory. Check access permissions and reload the page.",
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
