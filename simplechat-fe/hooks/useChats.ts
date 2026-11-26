import { useEffect, useState } from "react";
import { dbAdapter } from "@/lib/adapters";
import type { Room } from "@/lib/types";

type RoomsState = {
  uid: string;
  rooms: Room[];
  loading: boolean;
  error: string;
};

export function useRooms(uid: string | null) {
  const [state, setState] = useState<RoomsState>({
    uid: "",
    rooms: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    if (!uid) return;

    let active = true;

    const unsubscribe = dbAdapter.subscribeRooms(
      uid,
      (rooms) => {
        if (active) setState({ uid, rooms, loading: false, error: "" });
      },
      () => {
        if (active) {
          setState({
            uid,
            rooms: [],
            loading: false,
            error: "Could not load your conversations. Check access permissions and reload page.",
          });
        }
      },
    );

    // subscribeRooms sudah menangani realtime + fallback polling internal,
    // interval tambahan hanya menambah query berulang tanpa manfaat.
    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid]);

  if (!uid) return { rooms: [], loading: false, error: "" };

  if (state.uid !== uid) return { rooms: [], loading: true, error: "" };

  return { rooms: state.rooms, loading: state.loading, error: state.error };
}
