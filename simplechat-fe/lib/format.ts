import type { Timestamp } from "firebase/firestore";

export function formatClock(timestamp: Timestamp | null) {
  if (!timestamp) return "";
  return timestamp.toDate().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(timestamp: Timestamp | null) {
  if (!timestamp) return "";
  return timestamp.toDate().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
