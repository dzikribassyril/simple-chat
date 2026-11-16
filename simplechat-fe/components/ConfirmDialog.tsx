"use client";

import { Modal } from "@/components/Modal";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busyLabel,
  busy,
  error,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} locked={busy} onClose={onClose}>
      <p className="modal-description">{message}</p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="button" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="danger" disabled={busy} onClick={onConfirm}>
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
