import { useEffect, useState } from "react";
import { subscribeMessages } from "@/lib/chats";
import type { ChatMessage } from "@/lib/types";

type MessagesState = {
  chatId: string;
  messages: ChatMessage[];
  loading: boolean;
  error: string;
};

export function useMessages(chatId: string | null) {
  const [state, setState] = useState<MessagesState>({
    chatId: "",
    messages: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    if (!chatId) return;

    let active = true;

    const unsubscribe = subscribeMessages(
      chatId,
      (messages) => {
        if (active) setState({ chatId, messages, loading: false, error: "" });
      },
      () => {
        if (active) {
          setState({
            chatId,
            messages: [],
            loading: false,
            error: "Could not load the messages. Check access permissions and reload the page.",
          });
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [chatId]);

  if (!chatId) return { messages: [], loading: false, error: "" };

  // Messages from the previous room are dropped as soon as the room changes.
  if (state.chatId !== chatId) return { messages: [], loading: true, error: "" };

  return { messages: state.messages, loading: state.loading, error: state.error };
}
