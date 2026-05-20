import { getRoomInternals } from "@/lib/aolinpike-room";
import { normalizePin } from "@/components/aolinpike/supabase-mappers";
import { getApiErrorMessage } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pin = normalizePin(body.pin);
    const { supabase, room, players, games } = await getRoomInternals();
    if (pin !== room.admin_pin) return Response.json({ error: "Wrong admin PIN." }, { status: 401 });

    const { data: cards, error } = await supabase
      .from("secret_cards")
      .select("player_id, game_id, kind")
      .eq("room_id", room.id);
    if (error) throw error;

    const playerById = new Map(players.map((player) => [player.id, player.name]));
    const gameById = new Map(games.map((game) => [game.id, game.game_key]));
    const vault = Object.fromEntries(players.map((player) => [player.name, { boost: [] as string[], sabotage: [] as string[] }]));

    for (const card of cards) {
      const playerName = playerById.get(card.player_id);
      const gameKey = gameById.get(card.game_id);
      if (!playerName || !gameKey) continue;
      vault[playerName][card.kind as "boost" | "sabotage"].push(gameKey);
    }

    return Response.json({
      ok: true,
      playerPins: Object.fromEntries(players.map((player) => [player.name, player.pin])),
      adminPin: room.admin_pin,
      vault,
    });
  } catch (error) {
    return Response.json({ error: getApiErrorMessage(error, "Unable to unlock admin.") }, { status: 500 });
  }
}
