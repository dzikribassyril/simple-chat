"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authAdapter, dbAdapter } from "@/lib/adapters";
import { useAuth } from "@/hooks/useAuth";
import { useRooms } from "@/hooks/useChats";
import { useMessages } from "@/hooks/useMessages";
import { useUsers } from "@/hooks/useUsers";
import { createDirectRoom, createGroupRoom, deleteRoom, sendMessage } from "@/services/chatApi";
import { RoomList, resolveRoomTitle } from "@/components/ChatList";
import { RoomWindow } from "@/components/ChatWindow";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { EditProfileModal } from "@/components/EditProfileModal";
import { StartRoomModal } from "@/components/StartChatModal";

type ModalKind = "start" | "group" | "profile" | "delete" | null;

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <main className="center-screen">
          <p className="list-status">Loading conversations...</p>
        </main>
      }
    >
      <ChatRoom />
    </Suspense>
  );
}

function ChatRoom() {
  const { user: uid, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [roomId, setRoomId] = useState<string | null>(() => searchParams.get("room"));
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalError, setModalError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const { rooms, loading: roomsLoading, error: roomsError } = useRooms(uid);
  const { users, loading: usersLoading } = useUsers(uid);
  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    refresh: refreshMessages,
  } = useMessages(roomId);

  const activeRoom = useMemo(() => {
    return rooms.find((room) => room.id === roomId) || null;
  }, [rooms, roomId]);

  const displayName = useMemo(() => {
    return users.find((candidate) => candidate.id === uid)?.name || "User";
  }, [users, uid]);

  // Redirect ke halaman login jika sesi tidak ditemukan
  useEffect(() => {
    if (!authLoading && !uid) router.replace("/login");
  }, [authLoading, uid, router]);

  // Buat profil otomatis saat user pertama kali login
  useEffect(() => {
    if (uid) dbAdapter.ensureProfile(uid).catch(() => {});
  }, [uid]);

  function selectRoom(id: string | null) {
    setRoomId(id);
    const url = id ? `?room=${id}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  function openModal(kind: ModalKind) {
    setModalError("");
    setModal(kind);
  }

  function closeModal() {
    setModalError("");
    setModal(null);
  }

  async function handleStartRoom(recipientId: string) {
    if (!uid || busy) return;

    const existing = rooms.find(
      (room) =>
        room.type === "direct" &&
        room.memberIds.length === 2 &&
        room.memberIds.includes(recipientId),
    );
    if (existing) {
      closeModal();
      selectRoom(existing.id);
      return;
    }

    setBusy(true);
    try {
      const { roomId: newRoomId } = await createDirectRoom(recipientId);
      closeModal();
      selectRoom(newRoomId);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Could not create the conversation.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateGroup(name: string, memberIds: string[]) {
    if (busy) return;
    setBusy(true);

    try {
      const { roomId: newRoomId } = await createGroupRoom(name, memberIds);
      closeModal();
      selectRoom(newRoomId);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Could not create the group.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSend(text: string) {
    if (!roomId) return false;

    setSending(true);
    setSendError("");

    try {
      await sendMessage(roomId, text);
      await refreshMessages();
      return true;
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Could not send the message.");
      return false;
    } finally {
      setSending(false);
    }
  }

  async function handleSaveName(name: string) {
    if (!uid || busy) return;
    setBusy(true);

    try {
      await dbAdapter.updateDisplayName(uid, name);
      closeModal();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Could not save your display name.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteRoom() {
    if (!roomId || busy) return;
    setBusy(true);

    try {
      await deleteRoom(roomId);
      closeModal();
      selectRoom(null);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Could not delete the conversation.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await authAdapter.signOut();
    router.replace("/login");
  }

  if (authLoading || !uid) {
    return (
      <main className="center-screen">
        <p className="list-status">
          {authLoading ? "Checking your session..." : "Redirecting to the sign-in page..."}
        </p>
      </main>
    );
  }

  const otherUsers = users.filter((candidate) => candidate.id !== uid);
  const emptyUsersMessage = usersLoading
    ? "Loading the user directory..."
    : "No other users yet. Someone shows up here after their first sign-in.";

  const roomTitle = activeRoom ? resolveRoomTitle(activeRoom, users, uid) : "";
  const roomSubtitle = activeRoom
    ? activeRoom.type === "group"
      ? `${activeRoom.memberIds.length} members`
      : "Direct message"
    : "";

  return (
    <div className="shell" data-has-room={roomId ? "true" : "false"}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <h1 className="brand">SimpleChat App</h1>
          <button type="button" className="sidebar-signout" onClick={handleSignOut}>
            Sign out
          </button>
        </div>

        <div className="sidebar-identity">
          <span>
            Signed in as <strong>{displayName}</strong>
          </span>
          <button type="button" className="sidebar-edit" onClick={() => openModal("profile")}>
            Edit name
          </button>
        </div>

        <div className="sidebar-actions">
          <button type="button" className="primary" onClick={() => openModal("start")}>
            New room
          </button>
          <button type="button" onClick={() => openModal("group")}>
            Create group
          </button>
        </div>

        {roomsError && (
          <p className="error" role="alert">
            {roomsError}
          </p>
        )}

        <div className="sidebar-list">
          <RoomList
            rooms={rooms}
            users={users}
            currentUid={uid}
            activeRoomId={roomId}
            loading={roomsLoading}
            onSelect={selectRoom}
          />
        </div>
      </aside>

      <main className="window-area">
        {activeRoom ? (
          <RoomWindow
            title={roomTitle}
            subtitle={roomSubtitle}
            messages={messages}
            loading={messagesLoading}
            error={messagesError}
            currentUid={uid}
            users={users}
            sending={sending}
            sendError={sendError}
            onSend={handleSend}
            onBack={() => selectRoom(null)}
            onDelete={() => openModal("delete")}
          />
        ) : roomId && !roomsLoading ? (
          <section className="window window-placeholder">
            <div className="empty">
              <strong>Conversation unavailable</strong>
              <p>You are not a member of this conversation, or the room no longer exists.</p>
              <button type="button" onClick={() => selectRoom(null)}>
                Back to conversations
              </button>
            </div>
          </section>
        ) : (
          <section className="window window-placeholder">
            <div className="empty">
              <strong>Pick a conversation</strong>
              <p>Choose a room from the list to read and send messages.</p>
            </div>
          </section>
        )}
      </main>

      {modal === "start" && (
        <StartRoomModal
          users={otherUsers}
          busy={busy}
          error={modalError}
          emptyMessage={emptyUsersMessage}
          onClose={closeModal}
          onStart={handleStartRoom}
        />
      )}

      {modal === "group" && (
        <CreateGroupModal
          users={otherUsers}
          busy={busy}
          error={modalError}
          emptyMessage={emptyUsersMessage}
          onClose={closeModal}
          onCreate={handleCreateGroup}
        />
      )}

      {modal === "profile" && (
        <EditProfileModal
          currentName={displayName}
          busy={busy}
          error={modalError}
          onClose={closeModal}
          onSave={handleSaveName}
        />
      )}

      {modal === "delete" && activeRoom && (
        <ConfirmDialog
          title="Delete conversation"
          message={
            activeRoom.type === "group"
              ? `This deletes "${activeRoom.name || "Untitled group"}" and its messages for every member.`
              : "This deletes the conversation and its messages for both people."
          }
          confirmLabel="Delete conversation"
          busyLabel="Deleting..."
          busy={busy}
          error={modalError}
          onClose={closeModal}
          onConfirm={handleDeleteRoom}
        />
      )}
    </div>
  );
}
