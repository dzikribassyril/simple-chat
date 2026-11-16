import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Chat, ChatMessage } from "@/lib/types";

const MAX_HISTORY = 50;

// Security Rules only grant access to chats the user belongs to, so the query
// filters on the memberIds array.
export function subscribeChats(
  uid: string,
  onData: (chats: Chat[]) => void,
  onError: (error: Error) => void,
) {
  const chatsQuery = query(
    collection(db, "chats"),
    where("memberIds", "array-contains", uid),
  );

  return onSnapshot(
    chatsQuery,
    (snapshot) => {
      const chats: Chat[] = snapshot.docs.map((chatDoc) => {
        const data = chatDoc.data();
        const chat: Chat = {
          id: chatDoc.id,
          type: data.type === "group" ? "group" : "direct",
          name: typeof data.name === "string" ? data.name : undefined,
          memberIds: Array.isArray(data.memberIds) ? (data.memberIds as string[]) : [],
        };
        return chat;
      });
      onData(chats);
    },
    onError,
  );
}

// Only the 50 newest messages are fetched; the listener stays active while the
// room is open.
export function subscribeMessages(
  chatId: string,
  onData: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
) {
  const messagesQuery = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "desc"),
    limit(MAX_HISTORY),
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map((messageDoc) => {
        const data = messageDoc.data();
        return {
          id: messageDoc.id,
          senderId: String(data.senderId ?? ""),
          text: String(data.text ?? ""),
          createdAt: data.createdAt ?? null,
        };
      });

      // createdAt is sorted ascending; the document id breaks ties when two
      // messages share the same timestamp.
      messages.sort((first, second) => {
        const firstTime = first.createdAt?.toMillis() ?? 0;
        const secondTime = second.createdAt?.toMillis() ?? 0;
        if (firstTime !== secondTime) return firstTime - secondTime;
        return first.id.localeCompare(second.id);
      });

      onData(messages);
    },
    onError,
  );
}
