import { getRoomInternals } from "@/lib/aolinpike-room";
import { getApiErrorMessage } from "@/lib/api-error";
import { normalizePin } from "@/components/aolinpike/supabase-mappers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const playerName = typeof body.player === "string" ? body.player : "";
    const pin = normalizePin(body.pin);
    const { supabase, room, players, games } = await getRoomInternals();
    const player = players.find((item) => item.name === playerName);

    if (!player) return Response.json({ error: "Choose a valid player." }, { status: 404 });
    if (player.pin !== pin) return Response.json({ error: "Wrong PIN for this player." }, { status: 401 });

    const { data, error } = await supabase
      .from("secret_cards")
      .select("game_id, kind")
      .eq("room_id", room.id)
      .eq("player_id", player.id);
    if (error) throw error;

    const gameById = new Map(games.map((game) => [game.id, game.game_key]));

    return Response.json({
      player: {
        id: player.id,
        name: player.name,
        photo: player.photo_url ?? "",
      },
      vault: {
        boost: data.filter((card) => card.kind === "boost").map((card) => gameById.get(card.game_id)).filter(Boolean),
        sabotage: data.filter((card) => card.kind === "sabotage").map((card) => gameById.get(card.game_id)).filter(Boolean),
      },
    });
  } catch (error) {
    return Response.json({ error: getApiErrorMessage(error, "Unable to unlock player.") }, { status: 500 });
  }
}
