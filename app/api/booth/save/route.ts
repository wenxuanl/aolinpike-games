import { getRoomInternals } from "@/lib/aolinpike-room";
import { getCompetitionByKey, normalizePin } from "@/components/aolinpike/supabase-mappers";
import { recordSystemUpdate } from "@/lib/system-updates";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const playerName = String(body.player ?? "");
    const pin = normalizePin(body.pin);
    const boost: string[] = Array.isArray(body.vault?.boost) ? body.vault.boost.slice(0, 2).map(String) : [];
    const sabotage: string[] = Array.isArray(body.vault?.sabotage) ? body.vault.sabotage.slice(0, 2).map(String) : [];
    const { supabase, room, players, games } = await getRoomInternals();
    const player = players.find((item) => item.name === playerName);
    if (!player) return Response.json({ error: "Unknown player." }, { status: 404 });
    if (pin !== player.pin && pin !== room.admin_pin) return Response.json({ error: "Wrong PIN." }, { status: 401 });

    for (const gameKey of [...boost, ...sabotage]) getCompetitionByKey(gameKey);
    const gameByKey = new Map(games.map((game) => [game.game_key, game.id]));
    const gameById = new Map(games.map((game) => [game.id, game.game_key]));
    const existingCardsResult = await supabase
      .from("secret_cards")
      .select("game_id, kind")
      .eq("room_id", room.id)
      .eq("player_id", player.id);
    if (existingCardsResult.error) throw existingCardsResult.error;
    const previousBoost = existingCardsResult.data
      .filter((card) => card.kind === "boost")
      .map((card) => gameById.get(card.game_id))
      .filter(Boolean) as string[];
    const previousSabotage = existingCardsResult.data
      .filter((card) => card.kind === "sabotage")
      .map((card) => gameById.get(card.game_id))
      .filter(Boolean) as string[];
    const cardsChanged = !sameSelection(previousBoost, boost) || !sameSelection(previousSabotage, sabotage);
    const rows = [
      ...boost.map((gameKey) => ({ room_id: room.id, player_id: player.id, game_id: gameByKey.get(gameKey), kind: "boost" })),
      ...sabotage.map((gameKey) => ({ room_id: room.id, player_id: player.id, game_id: gameByKey.get(gameKey), kind: "sabotage" })),
    ].filter((row) => row.game_id);

    const deleteResult = await supabase.from("secret_cards").delete().eq("room_id", room.id).eq("player_id", player.id);
    if (deleteResult.error) throw deleteResult.error;
    if (rows.length > 0) {
      const insertResult = await supabase
        .from("secret_cards")
        .upsert(rows, { onConflict: "room_id,player_id,game_id,kind", ignoreDuplicates: true });
      if (insertResult.error) throw insertResult.error;
    }

    const { error } = await supabase
      .from("players")
      .update({ submitted: boost.length === 2 && sabotage.length === 2 })
      .eq("id", player.id);
    if (error) throw error;
    if (cardsChanged) {
      await recordSystemUpdate(supabase, {
        roomId: room.id,
        kind: pin === room.admin_pin ? "admin" : "cards",
        title: `${player.name} updated card selections`,
        detail: pin === room.admin_pin ? "Admin changed this player's secret card selections." : "Player saved secret card selections.",
        actor: pin === room.admin_pin ? "Admin" : player.name,
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save booth picks." }, { status: 500 });
  }
}

function sameSelection(left: string[], right: string[]) {
  return left.slice().sort().join("|") === right.slice().sort().join("|");
}
