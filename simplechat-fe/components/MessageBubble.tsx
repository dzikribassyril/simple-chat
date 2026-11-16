"use client";

import { formatClock } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";

type MessageBubbleProps = {
  message: ChatMessage;
  own: boolean;
  senderName: string;
  showSender: boolean;
};

export function MessageBubble({
  message,
  own,
  senderName,
  showSender,
}: MessageBubbleProps) {
  const isoTime = message.createdAt?.toDate().toISOString();

  return (
    <li className={own ? "message message-own" : "message"}>
      {showSender && !own && <span className="message-sender">{senderName}</span>}
      <div className="message-bubble">
        <p className="message-text">{message.text}</p>
        <time className="message-time" dateTime={isoTime}>
          {formatClock(message.createdAt)}
        </time>
      </div>
    </li>
  );
}
