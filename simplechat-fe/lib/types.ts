export const MAX_DISPLAY_NAME = 100;

export type Contact = {
  id: string;
  name: string;
};

export type Room = {
  id: string;
  type: "direct" | "group";
  name?: string;
  memberIds: string[];
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt: {
    toMillis(): number;
    toDate(): Date;
  } | null;
};
