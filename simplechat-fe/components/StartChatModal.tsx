"use client";

import { Modal } from "@/components/Modal";
import { UserPicker } from "@/components/UserPicker";
import type { Contact } from "@/lib/types";

type StartRoomModalProps = {
  users: Contact[];
  busy: boolean;
  error: string;
  emptyMessage: string;
  onClose: () => void;
  onStart: (userId: string) => void;
};

export function StartRoomModal({
  users,
  busy,
  error,
  emptyMessage,
  onClose,
  onStart,
}: StartRoomModalProps) {
  return (
    <Modal title="Start a room" locked={busy} onClose={onClose}>
      <p className="modal-description">
        Pick someone to talk to. The conversation is created by the backend.
      </p>

      <UserPicker
        users={users}
        mode="single"
        selectedIds={[]}
        onSelect={onStart}
        disabled={busy}
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
