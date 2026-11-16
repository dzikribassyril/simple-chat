"use client";

import { Modal } from "@/components/Modal";
import { UserPicker } from "@/components/UserPicker";
import type { ChatUser } from "@/lib/types";

type StartChatModalProps = {
  users: ChatUser[];
  busy: boolean;
  error: string;
  emptyMessage: string;
  onClose: () => void;
  onStart: (userId: string) => void;
};

export function StartChatModal({
  users,
  busy,
  error,
  emptyMessage,
  onClose,
  onStart,
}: StartChatModalProps) {
  return (
    <Modal title="Start a chat" locked={busy} onClose={onClose}>
      <p className="modal-description">
        Pick someone to talk to. The conversation is created by the backend.
      </p>

      <UserPicker
        users={users}
        mode="single"
        selectedIds={[]}
        onSelect={onStart}
        emptyMessage={emptyMessage}
      />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
