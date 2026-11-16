"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useChats } from "@/hooks/useChats";
import { useMessages } from "@/hooks/useMessages";
import { useUsers } from "@/hooks/useUsers";
import { ensureProfile, updateDisplayName } from "@/lib/users";
import { createDirectChat, createGroupChat, deleteChat, sendMessage } from "@/services/chatApi";
import { ChatList, resolveChatTitle } from "@/components/ChatList";
import { ChatWindow } from "@/components/ChatWindow";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { EditProfileModal } from "@/components/EditProfileModal";
import { StartChatModal } from "@/components/StartChatModal";

type ModalKind = "start" | "group" | "profile" | "delete" | null;

export default function ChatPage() {
  // useSearchParams is used inside this boundary so the route can still be prerendered.
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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");

  const [modal, setModal] = useState<ModalKind>(null);
  const [modalError, setModalError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [profileError, setProfileError] = useState("");

  const uid = user?.uid ?? null;
  const { chats, loading: chatsLoading, error: chatsError } = useChats(uid);
  const { users, loading: usersLoading } = useUsers(uid);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === roomId) ?? null,
    [chats, roomId],
  );

  // Messages are only read once the room is confirmed to belong to this user.
  const canReadRoom = Boolean(roomId) && (chatsLoading || activeChat !== null);
  const { messages, loading: messagesLoading, error: messagesError } = useMessages(
    canReadRoom ? roomId : null,
  );

  // The display name comes from the users collection, with a fallback to the
  // Google account.
  const displayName = useMemo(() => {
    const fromDirectory = users.find((candidate) => candidate.id === uid);
    if (fromDirectory) return fromDirectory.name;
    return user?.displayName || user?.email?.split("@")[0] || "User";
  }, [users, uid, user]);

  // A user without a session is sent to the sign-in page.
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // The profile in the users collection is created on the first sign-in.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    ensureProfile(user)
      .then(() => {
        if (!cancelled) setProfileError("");
      })
      .catch(() => {
        if (!cancelled) setProfileError("Could not save your profile to the database.");
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // pushState keeps the room in the URL without asking the server for a new page.
  function selectRoom(chatId: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("room", chatId);
    window.history.pushState(null, "", `?${params.toString()}`);
  }

  function clearRoom() {
    const params = new URLSearchParams(window.location.search);
    params.delete("room");
    const query = params.toString();
    window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
  }

  async function handleStartChat(recipientId: string) {
    setBusy(true);
    setModalError("");

    try {
      const { chatId } = await createDirectChat(recipientId);
      setModal(null);
      selectRoom(chatId);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Could not create the conversation.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateGroup(name: string, memberIds: string[]) {
    setBusy(true);
    setModalError("");

    try {
      const { chatId } = await createGroupChat(name, memberIds);
      setModal(null);
      selectRoom(chatId);
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
      return true;
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Could not send the message.");
      return false;
    } finally {
      setSending(false);
    }
  }

  async function handleSaveName(name: string) {
    if (!uid) return;

    setBusy(true);
    setModalError("");

    try {
      await updateDisplayName(uid, name);
      setModal(null);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Could not save your display name.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteChat() {
    if (!roomId) return;

    setBusy(true);
    setModalError("");

    try {
      await deleteChat(roomId);
      setModal(null);
      clearRoom();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Could not delete the conversation.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch {
      setProfileError("Could not sign out. Try again.");
    }
  }

  if (authLoading) {
    return (
      <main className="center-screen">
        <p className="list-status">Checking your session...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="center-screen">
        <p className="list-status">Redirecting to the sign-in page...</p>
      </main>
    );
  }

  const otherUsers = users.filter((candidate) => candidate.id !== uid);
  const emptyUsersMessage = usersLoading
    ? "Loading the user directory..."
    : "No other users yet. Someone shows up here after their first sign-in.";

  const roomTitle = activeChat ? resolveChatTitle(activeChat, users, uid ?? "") : "";
  const roomSubtitle = activeChat
    ? activeChat.type === "group"
      ? `${activeChat.memberIds.length} members`
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
          <button
            type="button"
            className="sidebar-edit"
            onClick={() => {
              setModalError("");
              setModal("profile");
            }}
          >
            Edit name
          </button>
        </div>

        <div className="sidebar-actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              setModalError("");
              setModal("start");
            }}
          >
            New chat
          </button>
          <button
            type="button"
            onClick={() => {
              setModalError("");
              setModal("group");
            }}
          >
            Create group
          </button>
        </div>

        {profileError && (
          <p className="error" role="alert">
            {profileError}
          </p>
        )}
        {chatsError && (
          <p className="error" role="alert">
            {chatsError}
          </p>
        )}

        <div className="sidebar-list">
          <ChatList
            chats={chats}
            users={users}
            currentUid={uid ?? ""}
            activeChatId={roomId}
            loading={chatsLoading}
            onSelect={selectRoom}
          />
        </div>
      </aside>

      <main className="window-area">
        {activeChat ? (
          <ChatWindow
            title={roomTitle}
            subtitle={roomSubtitle}
            messages={messages}
            loading={messagesLoading}
            error={messagesError}
            currentUid={uid ?? ""}
            users={users}
            sending={sending}
            sendError={sendError}
            onSend={handleSend}
            onBack={clearRoom}
            onDelete={() => {
              setModalError("");
              setModal("delete");
            }}
          />
        ) : roomId && !chatsLoading ? (
          <section className="window window-placeholder">
            <div className="empty">
              <strong>Conversation unavailable</strong>
              <p>You are not a member of this conversation, or the room no longer exists.</p>
              <button type="button" onClick={clearRoom}>
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
        <StartChatModal
          users={otherUsers}
          busy={busy}
          error={modalError}
          emptyMessage={emptyUsersMessage}
          onClose={() => setModal(null)}
          onStart={handleStartChat}
        />
      )}

      {modal === "group" && (
        <CreateGroupModal
          users={otherUsers}
          busy={busy}
          error={modalError}
          emptyMessage={emptyUsersMessage}
          onClose={() => setModal(null)}
          onCreate={handleCreateGroup}
        />
      )}

      {modal === "profile" && (
        <EditProfileModal
          currentName={displayName}
          busy={busy}
          error={modalError}
          onClose={() => setModal(null)}
          onSave={handleSaveName}
        />
      )}

      {modal === "delete" && activeChat && (
        <ConfirmDialog
          title="Delete conversation"
          message={
            activeChat.type === "group"
              ? `This deletes "${activeChat.name || "Untitled group"}" and its messages for every member.`
              : "This deletes the conversation and its messages for both people."
          }
          confirmLabel="Delete conversation"
          busyLabel="Deleting..."
          busy={busy}
          error={modalError}
          onClose={() => setModal(null)}
          onConfirm={handleDeleteChat}
        />
      )}
    </div>
  );
}
