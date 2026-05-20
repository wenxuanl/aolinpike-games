import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { activeRoomSlug, buildSnapshot, type DbGame, type DbPlayer, type DbResult, type DbSecretCard, type DbSystemUpdate, type RevealPhase } from "@/components/aolinpike/supabase-mappers";

export async function getRoomSnapshot({ includeSecrets = false, includeAdminPin = false } = {}) {
  const supabase = getSupabaseAdminClient();

  const { data: room, error: roomError } = await supabase
    .from("game_rooms")
    .select("id, slug, admin_pin")
    .eq("slug", activeRoomSlug)
    .single();
  if (roomError) throw roomError;

  const [playersResult, gamesResult, resultsResult, revealResult, updatesResult] = await Promise.all([
    supabase.from("players").select("id, name, photo_url, sort_order, submitted").eq("room_id", room.id).order("sort_order"),
    supabase.from("games").select("id, game_key, sort_order").eq("room_id", room.id).order("sort_order"),
    supabase.from("results").select("game_id, winner_player_id, runner_up_player_id").eq("room_id", room.id),
    supabase.from("reveal_state").select("phase, visible_count").eq("room_id", room.id).single(),
    supabase
      .from("system_updates")
      .select("id, kind, title, detail, actor, created_at")
      .eq("room_id", room.id)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  if (playersResult.error) throw playersResult.error;
  if (gamesResult.error) throw gamesResult.error;
  if (resultsResult.error) throw resultsResult.error;
  if (revealResult.error) throw revealResult.error;
  if (updatesResult.error) throw updatesResult.error;

  const phase = revealResult.data.phase as RevealPhase;
  const shouldIncludeSecrets = includeSecrets || phase !== "sealed";
  const secretCardsResult = shouldIncludeSecrets
    ? await supabase.from("secret_cards").select("player_id, game_id, kind").eq("room_id", room.id)
    : { data: [] as DbSecretCard[], error: null };

  if (secretCardsResult.error) throw secretCardsResult.error;

  return buildSnapshot({
    roomId: room.id,
    players: playersResult.data as DbPlayer[],
    games: gamesResult.data as DbGame[],
    results: resultsResult.data as DbResult[],
    secretCards: secretCardsResult.data as DbSecretCard[],
    updates: updatesResult.data as DbSystemUpdate[],
    adminPin: includeAdminPin ? room.admin_pin : undefined,
    revealState: {
      phase,
      visibleCount: revealResult.data.visible_count ?? 0,
    },
  });
}

export async function getRoomInternals() {
  const supabase = getSupabaseAdminClient();
  const { data: room, error: roomError } = await supabase
    .from("game_rooms")
    .select("id, admin_pin")
    .eq("slug", activeRoomSlug)
    .single();
  if (roomError) throw roomError;

  const [playersResult, pinsResult, gamesResult] = await Promise.all([
    supabase.from("players").select("id, name, photo_url, sort_order, submitted").eq("room_id", room.id).order("sort_order"),
    supabase.from("player_pins").select("player_id, pin"),
    supabase.from("games").select("id, game_key, sort_order").eq("room_id", room.id).order("sort_order"),
  ]);

  if (playersResult.error) throw playersResult.error;
  if (pinsResult.error) throw pinsResult.error;
  if (gamesResult.error) throw gamesResult.error;
  const pinByPlayerId = new Map(pinsResult.data.map((row) => [row.player_id, row.pin]));

  return {
    supabase,
    room,
    players: playersResult.data.map((player) => ({
      ...player,
      pin: pinByPlayerId.get(player.id) ?? "",
    })) as (DbPlayer & { pin: string })[],
    games: gamesResult.data as DbGame[],
  };
}
