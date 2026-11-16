"use client";

import type { ChatUser } from "@/lib/types";

type UserPickerProps = {
  users: ChatUser[];
  mode: "single" | "multiple";
  selectedIds: string[];
  onSelect: (userId: string) => void;
  emptyMessage: string;
};

export function UserPicker({
  users,
  mode,
  selectedIds,
  onSelect,
  emptyMessage,
}: UserPickerProps) {
  if (users.length === 0) {
    return <p className="picker-empty">{emptyMessage}</p>;
  }

  return (
    <ul className="picker-list">
      {users.map((user) => {
        const checked = selectedIds.includes(user.id);

        return (
          <li key={user.id}>
            {mode === "multiple" ? (
              <label className="picker-row">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onSelect(user.id)}
                />
                <span>{user.name}</span>
              </label>
            ) : (
              <button
                type="button"
                className="picker-row"
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
