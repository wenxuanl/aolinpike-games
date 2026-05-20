import { getRoomInternals } from "@/lib/aolinpike-room";
import { getApiErrorMessage } from "@/lib/api-error";
import { getCompetitionByKey, normalizePin } from "@/components/aolinpike/supabase-mappers";
import { recordSystemUpdate } from "@/lib/system-updates";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const playerId = typeof body.playerId === "string" ? body.playerId : "";
    const pin = normalizePin(body.pin);
    const nextPin = normalizePin(body.nextPin);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const photo = typeof body.photo === "string" ? body.photo : "";
    const boost: string[] = Array.isArray(body.vault?.boost) ? body.vault.boost.slice(0, 2).map(String) : [];
    const sabotage: string[] = Array.isArray(body.vault?.sabotage) ? body.vault.sabotage.slice(0, 2).map(String) : [];
    const { supabase, room, players, games } = await getRoomInternals();
    const player = players.find((item) => item.id === playerId);

    if (!player) return Response.json({ error: "Unknown player." }, { status: 404 });
    if (player.pin !== pin) return Response.json({ error: "Wrong PIN for this player." }, { status: 401 });
    if (nextPin && nextPin.length !== 4) return Response.json({ error: "New PIN must be 4 digits." }, { status: 400 });
    if (nextPin) {
      const duplicate = players.find((item) => item.id !== player.id && item.pin === nextPin);
      if (duplicate) {
        return Response.json({ error: `${nextPin} is already assigned to ${duplicate.name}. Choose a different PIN.` }, { status: 409 });
      }
    }

    const nextName = name || player.name;
    const oldPhoto = player.photo_url ?? "";
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
    const nameChanged = nextName !== player.name;
    const photoChanged = photo !== oldPhoto;
    const cardsChanged = !sameSelection(previousBoost, boost) || !sameSelection(previousSabotage, sabotage);
    const rows = [
      ...boost.map((gameKey) => ({ room_id: room.id, player_id: player.id, game_id: gameByKey.get(gameKey), kind: "boost" })),
      ...sabotage.map((gameKey) => ({ room_id: room.id, player_id: player.id, game_id: gameByKey.get(gameKey), kind: "sabotage" })),
    ].filter((row) => row.game_id);

    const profileResult = await supabase
      .from("players")
      .update({
        name: nextName,
        photo_url: photo,
        submitted: boost.length === 2 && sabotage.length === 2,
      })
      .eq("id", player.id);
    if (profileResult.error) throw profileResult.error;

    const deleteResult = await supabase.from("secret_cards").delete().eq("room_id", room.id).eq("player_id", player.id);
    if (deleteResult.error) throw deleteResult.error;
    if (rows.length > 0) {
      const insertResult = await supabase
        .from("secret_cards")
        .upsert(rows, { onConflict: "room_id,player_id,game_id,kind", ignoreDuplicates: true });
      if (insertResult.error) throw insertResult.error;
    }
    if (nextPin && nextPin !== player.pin) {
      const pinResult = await supabase.from("player_pins").upsert({ player_id: player.id, pin: nextPin }, { onConflict: "player_id" });
      if (pinResult.error) throw pinResult.error;
    }

    if (nameChanged) {
      await recordSystemUpdate(supabase, {
        roomId: room.id,
        kind: "player",
        title: `${player.name} changed their name`,
        detail: `From ${player.name} to ${nextName}.`,
        actor: nextName,
      });
    }
    if (photoChanged) {
      await recordSystemUpdate(supabase, {
        roomId: room.id,
        kind: "player",
        title: `${nextName} changed their profile picture`,
        detail: photo ? "A new player photo was saved." : "Player photo was cleared.",
        actor: nextName,
      });
    }
    if (cardsChanged) {
      await recordSystemUpdate(supabase, {
        roomId: room.id,
        kind: "cards",
        title: `${nextName} updated card selections`,
        detail: boost.length === 2 && sabotage.length === 2 ? "Secret card selections were saved." : "Secret card selections are still incomplete.",
        actor: nextName,
      });
    }
    if (nextPin && nextPin !== player.pin) {
      await recordSystemUpdate(supabase, {
        roomId: room.id,
        kind: "player",
        title: `${nextName} changed their PIN`,
        detail: "Player access was updated.",
        actor: nextName,
      });
    }

    return Response.json({ ok: true, pin: nextPin || pin });
  } catch (error) {
    return Response.json({ error: getApiErrorMessage(error, "Unable to save player profile.") }, { status: 500 });
  }
}

function sameSelection(left: string[], right: string[]) {
  return left.slice().sort().join("|") === right.slice().sort().join("|");
}
