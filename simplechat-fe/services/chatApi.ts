import { auth } from "@/lib/firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Every request carries the ID token of the signed-in user.
async function request<T>(
  method: "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  const token = await user.getIdToken();

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Make sure the backend is running on port 3001.",
      0,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.error || "The request failed. Try again.", response.status);
  }

  return payload as T;
}

export function createDirectChat(recipientId: string) {
  return request<{ chatId: string }>("POST", "/api/chats", {
    type: "direct",
    recipientId,
  });
}

export function createGroupChat(name: string, memberIds: string[]) {
  return request<{ chatId: string }>("POST", "/api/chats", {
    type: "group",
    name,
    memberIds,
  });
}

export function sendMessage(chatId: string, text: string) {
  return request<{ success: true; messageId: string }>("POST", `/api/chats/${chatId}/messages`, {
    text,
  });
}

export function deleteChat(chatId: string) {
  return request<{ success: true; deletedMessages: number }>("DELETE", `/api/chats/${chatId}`);
}
