"use client";

import { Fragment, useEffect, useRef } from "react";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageInput } from "@/components/MessageInput";
import { formatDay } from "@/lib/format";
import type { Message, Contact } from "@/lib/types";

type RoomWindowProps = {
  title: string;
  subtitle: string;
  messages: Message[];
  loading: boolean;
  error: string;
  currentUid: string;
  users: Contact[];
  sending: boolean;
  sendError: string;
  onSend: (text: string) => Promise<boolean>;
  onBack: () => void;
  onDelete: () => void;
};

// Cek apakah dua pesan dikirim di hari yang sama. jika tidak, tampilkan label hari di antara pesan
function isSameDay(first: Message, second: Message) {
  if (!first.createdAt || !second.createdAt) return false;
  return first.createdAt.toDate().toDateString() === second.createdAt.toDate().toDateString();
}

export function RoomWindow({
  title,
  subtitle,
  messages,
  loading,
  error,
  currentUid,
  users,
  sending,
  sendError,
  onSend,
  onBack,
  onDelete,
}: RoomWindowProps) {
  const listRef = useRef<HTMLUListElement>(null);

  // Geser ke pesan terbaru setiap daftar pesan berubah
  useEffect(() => {
    const list = listRef.current;
    if (list) {
      window.requestAnimationFrame(() => {
        const scrollArea = list.closest(".message-scroll");
        if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
      });
    }
  }, [messages.length]);

  function resolveSenderName(userId: string) {
    return users.find((user) => user.id === userId)?.name || "User";
  }

  return (
    <section className="window">
      <header className="window-header">
        <button type="button" className="back-button" onClick={onBack}>
          Back
        </button>
        <div className="window-heading">
          <h2>{title}</h2>
          <p className="window-subtitle">{subtitle}</p>
        </div>
        <button type="button" className="window-delete" onClick={onDelete}>
          Delete
        </button>
      </header>

      {error && (
        <p className="error window-error" role="alert">
          {error}
        </p>
      )}

      <div className="message-scroll">
        {loading && <p className="list-status">Loading messages...</p>}

        {!loading && !error && messages.length === 0 && (
          <div className="list-empty">
            <strong>No messages yet</strong>
            <p>Write the first message below to start the conversation.</p>
          </div>
        )}

        <ul className="messages" role="log" ref={listRef}>
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const showDay = !previous || !isSameDay(previous, message);

            return (
              // Fragment supaya bisa menampilkan label hari di antara pesan.
              <Fragment key={message.id}>
                {showDay && (
                  <li className="message-day">{formatDay(message.createdAt)}</li>
                )}
                <MessageBubble
                  message={message}
                  own={message.senderId === currentUid}
                  senderName={resolveSenderName(message.senderId)}
                  showSender
                />
              </Fragment>
            );
          })}
        </ul>
      </div>

      <MessageInput busy={sending} error={sendError} onSend={onSend} />
    </section>
  );
}
