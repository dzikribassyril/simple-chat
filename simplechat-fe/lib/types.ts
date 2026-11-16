import type { Timestamp } from "firebase/firestore";

// Shape of a document in the users collection.
export type ChatUser = {
  id: string;
  name: string;
};

// Shape of a document in the chats collection.
export type Chat = {
  id: string;
  type: "direct" | "group";
  name?: string;
  memberIds: string[];
};

// Shape of a document in the messages subcollection.
export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | null;
};
