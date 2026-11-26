"use client";

import type { Contact } from "@/lib/types";

type UserPickerProps = {
  users: Contact[];
  mode: "single" | "multiple";
  selectedIds: string[];
  onSelect: (userId: string) => void;
  emptyMessage: string;
  disabled?: boolean;
};

export function UserPicker({
  users,
  mode,
  selectedIds,
  onSelect,
  emptyMessage,
  disabled = false,
}: UserPickerProps) {
  if (users.length === 0) {
    return <p className="picker-empty">{emptyMessage}</p>;
  }

  return (
    <ul className="picker-list">
      {users.map((user) => {
        // Status pilihan diambil dari daftar ID yang dikirim komponen induk.
        const checked = selectedIds.includes(user.id);

        return (
          <li key={user.id}>
            {mode === "multiple" ? (
              <label className="picker-row">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onSelect(user.id)}
                />
                <span>{user.name}</span>
              </label>
            ) : (
              <button
                type="button"
                className="picker-row"
                disabled={disabled}
                onClick={() => onSelect(user.id)}
              >
                <span>{user.name}</span>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
