"use client";

import type { Chat, ChatUser } from "@/lib/types";

type ChatListProps = {
  chats: Chat[];
  users: ChatUser[];
  currentUid: string;
  activeChatId: string | null;
  loading: boolean;
  onSelect: (chatId: string) => void;
};

// The peer name is read from the users collection, as described in PRD section 4.3.
export function resolveChatTitle(
  chat: Chat,
  users: ChatUser[],
  currentUid: string,
) {
  if (chat.type === "group") return chat.name || "Untitled group";

  const otherId = chat.memberIds.find((memberId) => memberId !== currentUid);
  if (!otherId) return "Direct message";

  return users.find((user) => user.id === otherId)?.name || "Unnamed user";
}

export function ChatList({
  chats,
  users,
  currentUid,
  activeChatId,
  loading,
  onSelect,
}: ChatListProps) {
  if (loading) {
    return <p className="list-status">Loading conversations...</p>;
  }

  if (chats.length === 0) {
    return (
      <div className="list-empty">
        <strong>No conversations yet</strong>
        <p>Start a new chat or create a group to begin.</p>
      </div>
    );
  }

  const directChats = chats.filter((chat) => chat.type === "direct");
  const groupChats = chats.filter((chat) => chat.type === "group");

  return (
    <div className="chat-list">
      {directChats.length > 0 && (
        <section className="list-section">
          <h2 className="list-heading">Direct messages</h2>
          <ul>
            {directChats.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                title={resolveChatTitle(chat, users, currentUid)}
                active={chat.id === activeChatId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </section>
      )}

      {groupChats.length > 0 && (
        <section className="list-section">
          <h2 className="list-heading">Groups</h2>
          <ul>
            {groupChats.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                title={resolveChatTitle(chat, users, currentUid)}
                active={chat.id === activeChatId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type ChatRowProps = {
  chat: Chat;
  title: string;
  active: boolean;
  onSelect: (chatId: string) => void;
};

function ChatRow({ chat, title, active, onSelect }: ChatRowProps) {
  return (
    <li>
      <button
        type="button"
        className={active ? "chat-row chat-row-active" : "chat-row"}
        aria-current={active ? "true" : undefined}
        onClick={() => onSelect(chat.id)}
      >
        <span className="chat-row-name">{title}</span>
        {chat.type === "group" && (
          <span className="chat-row-meta">{chat.memberIds.length} members</span>
        )}
      </button>
    </li>
  );
}
