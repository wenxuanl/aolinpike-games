import { getRoomInternals } from "@/lib/aolinpike-room";
import { getCompetitionByKey, normalizePin } from "@/components/aolinpike/supabase-mappers";
import { recordSystemUpdate } from "@/lib/system-updates";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const adminPin = normalizePin(body.adminPin);
    const gameKey = String(body.gameId ?? "");
    const field = body.field === "runnerUp" ? "runnerUp" : "winner";
    const playerName = String(body.player ?? "");
    const competition = getCompetitionByKey(gameKey);

    const { supabase, room, players, games } = await getRoomInternals();
    if (adminPin !== room.admin_pin) {
      return Response.json({ error: "Wrong admin PIN." }, { status: 401 });
    }

    const game = games.find((item) => item.game_key === gameKey);
    if (!game) return Response.json({ error: "Unknown game." }, { status: 404 });
    const player = playerName ? players.find((item) => item.name === playerName) : null;
    if (playerName && !player) return Response.json({ error: "Unknown player." }, { status: 404 });

    const { data: existing } = await supabase
      .from("results")
      .select("winner_player_id, runner_up_player_id")
      .eq("room_id", room.id)
      .eq("game_id", game.id)
      .maybeSingle();

    const next = {
      room_id: room.id,
      game_id: game.id,
      winner_player_id: field === "winner" ? (player?.id ?? null) : (existing?.winner_player_id ?? null),
      runner_up_player_id: field === "runnerUp" ? (player?.id ?? null) : (existing?.runner_up_player_id ?? null),
    };

    if (next.winner_player_id && next.winner_player_id === next.runner_up_player_id) {
      if (field === "winner") next.runner_up_player_id = null;
      else next.winner_player_id = null;
    }

    const { error } = await supabase.from("results").upsert(next, { onConflict: "room_id,game_id" });
    if (error) throw error;
    await recordSystemUpdate(supabase, {
      roomId: room.id,
      kind: "score",
      title: `${competition.name} ${field === "winner" ? "winner" : "runner-up"} updated`,
      detail: playerName ? `${playerName} is now listed for ${field === "winner" ? "1st place" : "2nd place"}.` : "Placement cleared.",
      actor: "Admin",
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save result." }, { status: 500 });
  }
}
