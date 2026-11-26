"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { UserPicker } from "@/components/UserPicker";
import type { Contact } from "@/lib/types";

type CreateGroupModalProps = {
  users: Contact[];
  busy: boolean;
  error: string;
  emptyMessage: string;
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => void;
};

export function CreateGroupModal({
  users,
  busy,
  error,
  emptyMessage,
  onClose,
  onCreate,
}: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [formError, setFormError] = useState("");

  function toggle(userId: string) {
    setFormError("");
    setSelected((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Group name is required.");
      return;
    }

    // Pembuat otomatis masuk grup, jadi cukup pilih dua anggota lain.
    if (selected.length < 2) {
      setFormError(
        "Pick at least two other members. A group needs at least three people including you.",
      );
      return;
    }

    onCreate(trimmed, selected);
  }

  return (
    <Modal title="Create group" locked={busy} onClose={onClose}>
      <form className="group-form" onSubmit={submit}>
        <label htmlFor="group-name">
          Group name
          <input
            id="group-name"
            value={name}
            maxLength={60}
            disabled={busy}
            placeholder="Example: Study group"
            onChange={(event) => {
              setFormError("");
              setName(event.target.value);
            }}
          />
        </label>

        <fieldset>
          <legend>Members ({selected.length + 1} including you)</legend>
          <UserPicker
            users={users}
            mode="multiple"
            selectedIds={selected}
            onSelect={toggle}
            emptyMessage={emptyMessage}
          />
        </fieldset>

        {(formError || error) && (
          <p className="error" role="alert">
            {formError || error}
          </p>
        )}

        <div className="form-actions">
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Creating group..." : "Create group"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
