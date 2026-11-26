import { authAdapter } from "@/lib/adapters";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  method: "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  let token: string;
  try {
    token = await authAdapter.getToken();
  } catch {
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

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

export function createDirectRoom(recipientId: string) {
  return request<{ roomId: string }>("POST", "/api/rooms", {
    type: "direct",
    recipientId,
  });
}

export function createGroupRoom(name: string, memberIds: string[]) {
  return request<{ roomId: string }>("POST", "/api/rooms", {
    type: "group",
    name,
    memberIds,
  });
}

export function sendMessage(roomId: string, text: string) {
  return request<{ success: true; messageId: string }>("POST", `/api/rooms/${roomId}/messages`, {
    text,
  });
}

export function deleteRoom(roomId: string) {
  return request<{ success: true; deletedMessages: number }>("DELETE", `/api/rooms/${roomId}`);
}
