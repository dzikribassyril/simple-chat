import { useEffect, useState } from "react";
import { subscribeChats } from "@/lib/chats";
import type { Chat } from "@/lib/types";

type ChatsState = {
  uid: string;
  chats: Chat[];
  loading: boolean;
  error: string;
};

export function useChats(uid: string | null) {
  const [state, setState] = useState<ChatsState>({
    uid: "",
    chats: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    if (!uid) return;

    let active = true;

    const unsubscribe = subscribeChats(
      uid,
      (chats) => {
        if (active) setState({ uid, chats, loading: false, error: "" });
      },
      () => {
        if (active) {
          setState({
            uid,
            chats: [],
            loading: false,
            error: "Could not load your conversations. Check access permissions and reload the page.",
          });
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid]);

  if (!uid) return { chats: [], loading: false, error: "" };

  // Data belonging to the previous uid must not show while the new one loads.
  if (state.uid !== uid) return { chats: [], loading: true, error: "" };

  return { chats: state.chats, loading: state.loading, error: state.error };
}
