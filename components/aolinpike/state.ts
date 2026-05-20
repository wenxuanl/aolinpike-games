"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { competitions, createInitialPhotos, createInitialPins, createInitialResults, createInitialVault, defaultAdminPin, defaultPlayers } from "./data";
import { getBaseScores, getCompletedCount, rankScores } from "./scoring";
import type { CardKind, PlayerVault, Results } from "./types";
import type { RevealState, RoomSnapshot } from "./supabase-mappers";

const fallbackRevealState: RevealState = { phase: "sealed", visibleCount: 0 };
type RealtimeStatus = "idle" | "connecting" | "subscribed" | "closed" | "error";

function createFallbackState(): RoomSnapshot {
  const players = defaultPlayers;
  return {
    roomId: "",
    players,
    results: createInitialResults(),
    vault: createInitialVault(players),
    playerPins: createInitialPins(players),
    submissionStatus: Object.fromEntries(players.map((player) => [player, false])),
    playerPhotos: createInitialPhotos(players),
    adminPin: defaultAdminPin,
    updates: [],
    revealState: fallbackRevealState,
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Request failed.");
  }
  return payload as T;
}

export function useAolinpikeState() {
  const [storedState, setStoredState] = useState<RoomSnapshot>(createFallbackState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [busyKeys, setBusyKeys] = useState<string[]>([]);
  const busyRef = useRef(new Set<string>());
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [activePlayer, setActivePlayer] = useState(defaultPlayers[0]);
  const { players, results, vault, playerPins, submissionStatus, playerPhotos, adminPin, revealState, updates } = storedState;

  const refresh = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      setLoading(false);
      setError("This device is offline. Showing the last synced scoreboard on this phone.");
      return;
    }

    try {
      const snapshot = await requestJson<RoomSnapshot>("/api/room");
      setStoredState(snapshot);
      setActivePlayer((player) => (snapshot.players.includes(player) ? player : snapshot.players[0]));
      setLastSyncedAt(new Date());
      setError("");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to sync game room.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
      setRealtimeStatus("connecting");
      refresh();
    }

    function handleOffline() {
      setIsOffline(true);
      setRealtimeStatus("closed");
      setError("This device is offline. Changes will not save until the connection returns.");
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refresh]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !storedState.roomId || isOffline) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRealtimeStatus("connecting");
    const channel = supabase
      .channel(`aolinpike-room-${storedState.roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${storedState.roomId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "results", filter: `room_id=eq.${storedState.roomId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "reveal_state", filter: `room_id=eq.${storedState.roomId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "system_updates", filter: `room_id=eq.${storedState.roomId}` }, refresh)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("subscribed");
          setError("");
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("error");
          setError("Live sync is having trouble. Tap Retry Sync or wait for reconnect.");
          return;
        }
        if (status === "CLOSED") {
          setRealtimeStatus("closed");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOffline, refresh, storedState.roomId]);

  useEffect(() => {
    if (!storedState.roomId || isOffline || realtimeStatus === "subscribed") return;
    const fallbackRefresh = window.setInterval(refresh, 15000);
    return () => window.clearInterval(fallbackRefresh);
  }, [isOffline, realtimeStatus, refresh, storedState.roomId]);

  const baseScores = useMemo(() => getBaseScores(players, results), [players, results]);
  const rankedBaseScores = useMemo(() => rankScores(baseScores), [baseScores]);
  const completedCount = useMemo(() => getCompletedCount(results), [results]);
  const allGamesComplete = completedCount === competitions.length;

  function isBusy(key?: string) {
    return key ? busyKeys.includes(key) : busyKeys.length > 0;
  }

  function setBusy(key: string, busy: boolean) {
    if (busy) busyRef.current.add(key);
    else busyRef.current.delete(key);
    setBusyKeys(Array.from(busyRef.current));
    setPendingAction(busyRef.current.values().next().value ?? "");
  }

  async function mutate<T = { ok: true }>(key: string, url: string, body: Record<string, unknown>, init?: RequestInit) {
    if (busyRef.current.has(key)) {
      throw new Error("That save is already in progress. Give it one beat.");
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      throw new Error("This phone is offline. Reconnect before saving changes.");
    }

    setBusy(key, true);
    setMutationError("");
    try {
      const response = await requestJson<T>(url, {
        method: init?.method ?? "POST",
        body: JSON.stringify(body),
        ...init,
      });
      await refresh();
      return response;
    } catch (mutateError) {
      const message = mutateError instanceof Error ? mutateError.message : "Unable to save change.";
      setMutationError(message);
      throw new Error(message);
    } finally {
      setBusy(key, false);
    }
  }

  async function renamePlayer(index: number, nextName: string, adminAccessPin = "") {
    await mutate(`rename-${index}`, "/api/players", { index, name: nextName, adminPin: adminAccessPin }, { method: "PATCH" });
  }

  async function updateResult(gameId: string, field: keyof Results[string], player: string, adminAccessPin = "") {
    await mutate(`result-${gameId}-${field}`, "/api/results", { gameId, field, player, adminPin: adminAccessPin });
  }

  function toggleVaultCard(player: string, kind: CardKind, gameId: string) {
    setStoredState((current) => {
      const playerVault = current.vault[player] ?? { boost: [], sabotage: [] };
      const selected = playerVault[kind];
      const isSelected = selected.includes(gameId);
      const nextSelected = isSelected ? selected.filter((id) => id !== gameId) : selected.length < 2 ? [...selected, gameId] : selected;

      return {
        ...current,
        vault: {
          ...current.vault,
          [player]: {
            ...playerVault,
            [kind]: nextSelected,
          },
        },
      };
    });
  }

  async function unlockPlayerBooth(player: string, pin: string) {
    const key = `unlock-player-${player}`;
    if (busyRef.current.has(key)) throw new Error("Unlock is already in progress.");
    setBusy(key, true);
    setMutationError("");
    try {
      const response = await requestJson<{ vault: PlayerVault }>("/api/booth/unlock", {
        method: "POST",
        body: JSON.stringify({ player, pin }),
      });
      return response.vault;
    } catch (unlockError) {
      const message = unlockError instanceof Error ? unlockError.message : "Unable to unlock booth.";
      setMutationError(message);
      throw new Error(message);
    } finally {
      setBusy(key, false);
    }
  }

  async function unlockAdminBooth(pin: string) {
    const key = "unlock-admin";
    if (busyRef.current.has(key)) throw new Error("Admin unlock is already in progress.");
    setBusy(key, true);
    setMutationError("");
    try {
      return await requestJson<{ ok: true; playerPins: Record<string, string>; adminPin: string; vault: Record<string, PlayerVault> }>(
        "/api/booth/admin-unlock",
        {
          method: "POST",
          body: JSON.stringify({ pin }),
        }
      );
    } catch (unlockError) {
      const message = unlockError instanceof Error ? unlockError.message : "Unable to unlock admin.";
      setMutationError(message);
      throw new Error(message);
    } finally {
      setBusy(key, false);
    }
  }

  async function savePlayerVault(player: string, nextVault: PlayerVault, pin = "") {
    await mutate(`save-vault-${player}`, "/api/booth/save", {
      player,
      pin,
      vault: {
        boost: nextVault.boost.slice(0, 2),
        sabotage: nextVault.sabotage.slice(0, 2),
      },
    });
  }

  async function unlockPlayerByPin(player: string, pin: string) {
    const key = "unlock-player-profile";
    if (busyRef.current.has(key)) throw new Error("Player unlock is already in progress.");
    setBusy(key, true);
    setMutationError("");
    try {
      return await requestJson<{ player: { id: string; name: string; photo: string }; vault: PlayerVault }>("/api/player/unlock", {
        method: "POST",
        body: JSON.stringify({ player, pin }),
      });
    } catch (unlockError) {
      const message = unlockError instanceof Error ? unlockError.message : "Unable to unlock player.";
      setMutationError(message);
      throw new Error(message);
    } finally {
      setBusy(key, false);
    }
  }

  async function savePlayerProfile(playerId: string, pin: string, name: string, photo: string, nextVault: PlayerVault, nextPin = "") {
    const response = await mutate<{ ok: true; pin: string }>("save-player-profile", "/api/player/save", {
      playerId,
      pin,
      nextPin,
      name,
      photo,
      vault: {
        boost: nextVault.boost.slice(0, 2),
        sabotage: nextVault.sabotage.slice(0, 2),
      },
    });
    return response;
  }

  async function updatePlayerPin(player: string, pin: string, adminAccessPin = "") {
    await mutate(`pin-${player}`, "/api/admin/pins", { player, nextPlayerPin: pin, adminPin: adminAccessPin }, { method: "PATCH" });
  }

  async function updateAdminPin(pin: string, adminAccessPin = "") {
    await mutate("pin-admin", "/api/admin/pins", { nextAdminPin: pin, adminPin: adminAccessPin }, { method: "PATCH" });
  }

  async function updatePlayerPhoto(player: string, photo: string, adminAccessPin = "") {
    const index = players.indexOf(player);
    if (index < 0) return;
    await mutate(`photo-${player}`, "/api/players", { index, photo, adminPin: adminAccessPin }, { method: "PATCH" });
  }

  async function resetVault(adminAccessPin = "") {
    await mutate("reset-vault", "/api/admin/reset", { scope: "vault", adminPin: adminAccessPin });
  }

  async function generateTestData(adminAccessPin = "") {
    await mutate("test-data", "/api/admin/test-data", { adminPin: adminAccessPin });
  }

  async function resetAll(adminAccessPin = "") {
    await mutate("reset-all", "/api/admin/reset", { scope: "all", adminPin: adminAccessPin });
  }

  async function openReveal(adminAccessPin = "") {
    await mutate("reveal-open", "/api/reveal", { action: "open", adminPin: adminAccessPin }, { method: "PATCH" });
  }

  async function revealNext(adminAccessPin = "", complete = false) {
    await mutate("reveal-next", "/api/reveal", { action: "next", complete, expectedVisibleCount: revealState.visibleCount, adminPin: adminAccessPin }, { method: "PATCH" });
  }

  return {
    players,
    results,
    vault,
    playerPins,
    submissionStatus,
    playerPhotos,
    adminPin,
    updates,
    revealState,
    activePlayer,
    setActivePlayer,
    baseScores,
    rankedBaseScores,
    completedCount,
    allGamesComplete,
    loading,
    error,
    mutationError,
    pendingAction,
    busyKeys,
    isBusy,
    isOffline,
    realtimeStatus,
    lastSyncedAt,
    refresh,
    renamePlayer,
    updateResult,
    toggleVaultCard,
    unlockPlayerBooth,
    unlockAdminBooth,
    unlockPlayerByPin,
    savePlayerProfile,
    savePlayerVault,
    updatePlayerPin,
    updateAdminPin,
    updatePlayerPhoto,
    resetVault,
    generateTestData,
    resetAll,
    openReveal,
    revealNext,
  };
}

export type AolinpikeState = ReturnType<typeof useAolinpikeState>;
