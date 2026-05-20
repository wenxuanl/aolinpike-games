import { competitions } from "@/components/aolinpike/data";
import { getRoomInternals } from "@/lib/aolinpike-room";
import { normalizePin } from "@/components/aolinpike/supabase-mappers";
import { recordSystemUpdate } from "@/lib/system-updates";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const adminPin = normalizePin(body.adminPin);
    const { supabase, room, players, games } = await getRoomInternals();
    if (adminPin !== room.admin_pin) return Response.json({ error: "Wrong admin PIN." }, { status: 401 });

    const resultRows = games.map((game) => {
      const winner = randomItem(players);
      const runnerUp = randomItem(players.filter((player) => player.id !== winner.id));
      return {
        room_id: room.id,
        game_id: game.id,
        winner_player_id: winner.id,
        runner_up_player_id: runnerUp.id,
      };
    });

    const gameIds = games.map((game) => game.id);
    const cardRows = players.flatMap((player) => [
      ...randomUniqueItems(gameIds, 2).map((gameId) => ({ room_id: room.id, player_id: player.id, game_id: gameId, kind: "boost" })),
      ...randomUniqueItems(gameIds, 2).map((gameId) => ({ room_id: room.id, player_id: player.id, game_id: gameId, kind: "sabotage" })),
    ]);

    const deleteResults = await supabase.from("results").delete().eq("room_id", room.id);
    if (deleteResults.error) throw deleteResults.error;
    const insertResults = await supabase.from("results").insert(resultRows);
    if (insertResults.error) throw insertResults.error;
    const deleteCards = await supabase.from("secret_cards").delete().eq("room_id", room.id);
    if (deleteCards.error) throw deleteCards.error;
    const insertCards = await supabase.from("secret_cards").insert(cardRows);
    if (insertCards.error) throw insertCards.error;
    const submitPlayers = await supabase.from("players").update({ submitted: true }).eq("room_id", room.id);
    if (submitPlayers.error) throw submitPlayers.error;
    const resetReveal = await supabase.from("reveal_state").update({ phase: "sealed", visible_count: 0 }).eq("room_id", room.id);
    if (resetReveal.error) throw resetReveal.error;
    await recordSystemUpdate(supabase, {
      roomId: room.id,
      kind: "system",
      title: "Test data generated",
      detail: "Scores and card picks were filled for rehearsal mode.",
      actor: "Admin",
    });

    return Response.json({ ok: true, games: competitions.length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to generate test data." }, { status: 500 });
  }
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomUniqueItems<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const selected: T[] = [];

  while (pool.length > 0 && selected.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    const [item] = pool.splice(index, 1);
    selected.push(item);
  }

  return selected;
}
