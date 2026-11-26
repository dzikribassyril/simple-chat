"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalProps = {
  title: string;
  locked?: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ title, locked = false, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    // Buka dialog dan nonaktifkan interaksi dengan halaman di belakangnya.
    if (dialog && !dialog.open) dialog.showModal();

    // Tutup dialog saat komponen dilepas.
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Cegah Escape menutup dialog saat dialog sedang dikunci.
        event.preventDefault();
        if (!locked) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="close-button"
          aria-label="Close"
          disabled={locked}
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {children}
    </dialog>
  );
}
