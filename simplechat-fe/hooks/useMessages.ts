import { useEffect, useState } from "react";
import { dbAdapter } from "@/lib/adapters";
import type { Message } from "@/lib/types";

type MessagesState = {
  roomId: string;
  messages: Message[];
  loading: boolean;
  error: string;
};

export function useMessages(roomId: string | null) {
  const [state, setState] = useState<MessagesState>({
    roomId: "",
    messages: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    if (!roomId) return;

    let active = true;

    const unsubscribe = dbAdapter.subscribeMessages(
      roomId,
      (messages) => {
        if (active) setState({ roomId, messages, loading: false, error: "" });
      },
      () => {
        if (active) {
          setState({
            roomId,
            messages: [],
            loading: false,
            error: "Could not load messages. Check access permissions and reload page.",
          });
        }
      },
    );

    // subscribeMessages sudah menangani realtime + fallback polling internal,
    // jadi setInterval tambahan tidak diperlukan dan hanya menambah beban query.
    return () => {
      active = false;
      unsubscribe();
    };
  }, [roomId]);

  if (!roomId) {
    return { messages: [], loading: false, error: "", refresh: async () => {} };
  }

  if (state.roomId !== roomId) {
    return {
      messages: [],
      loading: true,
      error: "",
      refresh: () => dbAdapter.refreshMessages(roomId),
    };
  }

  return {
    messages: state.messages,
    loading: state.loading,
    error: state.error,
    refresh: roomId
      ? () => dbAdapter.refreshMessages(roomId)
      : async () => {},
  };
}
