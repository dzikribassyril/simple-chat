"use client";

import type { Room, Contact } from "@/lib/types";

type RoomListProps = {
  rooms: Room[];
  users: Contact[];
  currentUid: string;
  activeRoomId: string | null;
  loading: boolean;
  onSelect: (roomId: string) => void;
};

export function resolveRoomTitle(
  room: Room,
  users: Contact[],
  currentUid: string,
) {
  if (room.type === "group") return room.name || "Untitled group";

  // Cari ID lawan bicara di daftar member, lalu ambil nama dari daftar users
  const otherId = room.memberIds.find((memberId) => memberId !== currentUid);
  if (!otherId) return "Direct message";

  return users.find((user) => user.id === otherId)?.name || "Unnamed user";
}

export function RoomList({
  rooms,
  users,
  currentUid,
  activeRoomId,
  loading,
  onSelect,
}: RoomListProps) {
  if (loading) {
    return <p className="list-status">Loading conversations...</p>;
  }

  const directRooms = rooms.filter((room) => room.type === "direct");
  const groupRooms = rooms.filter((room) => room.type === "group");

  return (
    <div className="room-list">
      {directRooms.length > 0 && (
        <section className="list-section">
          <h2 className="list-heading">Direct messages</h2>
          <ul>
            {directRooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                title={resolveRoomTitle(room, users, currentUid)}
                active={room.id === activeRoomId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </section>
      )}

      {groupRooms.length > 0 && (
        <section className="list-section">
          <h2 className="list-heading">Groups</h2>
          <ul>
            {groupRooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                title={resolveRoomTitle(room, users, currentUid)}
                active={room.id === activeRoomId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type RoomRowProps = {
  room: Room;
  title: string;
  active: boolean;
  onSelect: (roomId: string) => void;
};

function RoomRow({ room, title, active, onSelect }: RoomRowProps) {
  return (
    <li>
      <button
        type="button"
        className={active ? "room-row room-row-active" : "room-row"}
        aria-current={active ? "true" : undefined}
        onClick={() => onSelect(room.id)}
      >
        <span className="room-row-name">{title}</span>
        {room.type === "group" && (
          <span className="room-row-meta">{room.memberIds.length} members</span>
        )}
      </button>
    </li>
  );
}
