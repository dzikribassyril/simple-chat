"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { MAX_DISPLAY_NAME } from "@/lib/users";

type EditProfileModalProps = {
  currentName: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (name: string) => void;
};

export function EditProfileModal({
  currentName,
  busy,
  error,
  onClose,
  onSave,
}: EditProfileModalProps) {
  const [name, setName] = useState(currentName);
  const [formError, setFormError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Your display name cannot be empty.");
      return;
    }

    if (trimmed.length > MAX_DISPLAY_NAME) {
      setFormError(`Your display name must be at most ${MAX_DISPLAY_NAME} characters.`);
      return;
    }

    onSave(trimmed);
  }

  return (
    <Modal title="Change display name" locked={busy} onClose={onClose}>
      <form className="group-form" onSubmit={submit}>
        <label htmlFor="display-name">
          Display name
          <input
            id="display-name"
            value={name}
            maxLength={MAX_DISPLAY_NAME}
            disabled={busy}
            placeholder="How others see you"
            onChange={(event) => {
              setFormError("");
              setName(event.target.value);
            }}
          />
        </label>

        <p className="modal-description">
          This is the name other people see in the conversation list and next to your messages.
        </p>

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
            {busy ? "Saving..." : "Save name"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
