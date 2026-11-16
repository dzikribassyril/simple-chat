"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

type MessageInputProps = {
  busy: boolean;
  error: string;
  onSend: (text: string) => Promise<boolean>;
};

export function MessageInput({ busy, error, onSend }: MessageInputProps) {
  const [text, setText] = useState("");

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    // The text is cleared only after the backend confirms the message was saved.
    const delivered = await onSend(trimmed);
    if (delivered) setText("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends the message, Shift+Enter inserts a new line.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  function handleInput(event: FormEvent<HTMLTextAreaElement>) {
    // The textarea height follows its content so long lines are not cut off.
    const target = event.currentTarget;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      {error && (
        <p className="error composer-error" role="alert">
          {error}
        </p>
      )}

      <div className="composer-row">
        <label className="visually-hidden" htmlFor="message-input">
          Write a message
        </label>
        <textarea
          id="message-input"
          className="composer-input"
          value={text}
          rows={1}
          maxLength={4000}
          disabled={busy}
          placeholder="Write a message..."
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
        />
        <button type="submit" className="primary composer-send" disabled={busy || !text.trim()}>
          {busy ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
