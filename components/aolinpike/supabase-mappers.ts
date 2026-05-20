import { competitions, createInitialResults, createInitialVault, defaultPlayers } from "./data";
import type { Results, StoredState, SystemUpdate, SystemUpdateKind, Vault } from "./types";

export const activeRoomSlug = "aolinpike-2026";

export type RevealPhase = "sealed" | "active" | "complete";

export type RevealState = {
  phase: RevealPhase;
  visibleCount: number;
};

export type RoomSnapshot = StoredState & {
  roomId: string;
  revealState: RevealState;
};

export type DbPlayer = {
  id: string;
  name: string;
  pin?: string;
  photo_url: string | null;
  sort_order: number;
  submitted: boolean;
};

export type DbGame = {
  id: string;
  game_key: string;
  sort_order: number;
};

export type DbResult = {
  game_id: string;
  winner_player_id: string | null;
  runner_up_player_id: string | null;
};

export type DbSecretCard = {
  player_id: string;
  game_id: string;
  kind: "boost" | "sabotage";
};

export type DbSystemUpdate = {
  id: string;
  kind: SystemUpdateKind;
  title: string;
  detail: string | null;
  actor: string | null;
  created_at: string;
};

export function buildSnapshot({
  roomId,
  players,
  games,
  results,
  secretCards,
  updates,
  adminPin,
  revealState,
}: {
  roomId: string;
  players: DbPlayer[];
  games: DbGame[];
  results: DbResult[];
  secretCards: DbSecretCard[];
  updates: DbSystemUpdate[];
  adminPin?: string;
  revealState: RevealState;
}): RoomSnapshot {
  const orderedPlayers = [...players].sort((a, b) => a.sort_order - b.sort_order);
  const playerNames = orderedPlayers.map((player) => player.name);
  const playerById = new Map(orderedPlayers.map((player) => [player.id, player]));
  const gameKeyById = new Map(games.map((game) => [game.id, game.game_key]));
  const initialResults = createInitialResults();
  const mappedResults: Results = { ...initialResults };

  for (const result of results) {
    const gameKey = gameKeyById.get(result.game_id);
    if (!gameKey || !mappedResults[gameKey]) continue;

    mappedResults[gameKey] = {
      winner: result.winner_player_id ? (playerById.get(result.winner_player_id)?.name ?? "") : "",
      runnerUp: result.runner_up_player_id ? (playerById.get(result.runner_up_player_id)?.name ?? "") : "",
    };
  }

  const vault: Vault = createInitialVault(playerNames);
  for (const card of secretCards) {
    const player = playerById.get(card.player_id)?.name;
    const gameKey = gameKeyById.get(card.game_id);
    if (!player || !gameKey) continue;
    vault[player][card.kind].push(gameKey);
  }

  const submitted = Object.fromEntries(orderedPlayers.map((player) => [player.name, player.submitted]));
  const mappedUpdates: SystemUpdate[] = updates.map((update) => ({
    id: update.id,
    kind: update.kind,
    title: update.title,
    detail: update.detail ?? "",
    actor: update.actor ?? "System",
    createdAt: update.created_at,
  }));

  return {
    roomId,
    players: playerNames.length === 4 ? playerNames : defaultPlayers,
    results: mappedResults,
    vault,
    playerPins: Object.fromEntries(orderedPlayers.map((player) => [player.name, ""])),
    submissionStatus: submitted,
    playerPhotos: Object.fromEntries(orderedPlayers.map((player) => [player.name, player.photo_url ?? ""])),
    adminPin: adminPin ?? "",
    updates: mappedUpdates,
    revealState,
  };
}

export function getPlayerIdByName(snapshot: RoomSnapshot, players: DbPlayer[], name: string) {
  const player = players.find((item) => item.name === name);
  if (!player) throw new Error(`Unknown player: ${name || "(empty)"}`);
  return player.id;
}

export function getCompetitionByKey(gameKey: string) {
  const competition = competitions.find((item) => item.id === gameKey);
  if (!competition) throw new Error(`Unknown game: ${gameKey}`);
  return competition;
}

export function normalizePin(pin: unknown) {
  return String(pin ?? "").replace(/\D/g, "").slice(0, 4);
}
