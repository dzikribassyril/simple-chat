import type { User as AuthUser } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ChatUser } from "@/lib/types";

export const MAX_DISPLAY_NAME = 100;

// Security Rules only allow a name field, so the name is capped at 100 characters.
function resolveProfileName(user: AuthUser) {
  const displayName = user.displayName?.trim();
  if (displayName) return displayName.slice(0, MAX_DISPLAY_NAME);

  const emailName = user.email?.split("@")[0]?.trim();
  if (emailName) return emailName.slice(0, MAX_DISPLAY_NAME);

  return "User";
}

// The profile is created on the first sign-in. An existing document is left alone.
export async function ensureProfile(user: AuthUser): Promise<void> {
  const profileRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(profileRef);
  // exists() is a method on the Web SDK snapshot, not a property.
  if (snapshot.exists()) return;

  await setDoc(profileRef, { name: resolveProfileName(user) });
}

// The display name is the only field a user may change on their own profile,
// which is exactly what the Security Rules allow.
export async function updateDisplayName(uid: string, name: string): Promise<void> {
  const trimmed = name.trim().slice(0, MAX_DISPLAY_NAME);
  await updateDoc(doc(db, "users", uid), { name: trimmed });
}

// The user list is subscribed so a peer name always reflects the latest change.
export function subscribeUsers(
  onData: (users: ChatUser[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      const users: ChatUser[] = [];

      for (const userDoc of snapshot.docs) {
        const name = userDoc.data().name;

        // Only profiles written by a Google sign-in are listed. The shared
        // users collection also holds manual entries from another app on this
        // project, and those document IDs are not Google user IDs, so they
        // could never sign in and become a chat member.
        if (typeof name !== "string" || name.length === 0) continue;

        users.push({ id: userDoc.id, name });
      }

      onData(users);
    },
    onError,
  );
}
