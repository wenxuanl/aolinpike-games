import { getRoomInternals } from "@/lib/aolinpike-room";
import { normalizePin } from "@/components/aolinpike/supabase-mappers";
import { recordSystemUpdate } from "@/lib/system-updates";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const adminPin = normalizePin(body.adminPin);
    const scope = body.scope === "all" ? "all" : "vault";
    const { supabase, room } = await getRoomInternals();
    if (adminPin !== room.admin_pin) return Response.json({ error: "Wrong admin PIN." }, { status: 401 });

    const deleteCards = await supabase.from("secret_cards").delete().eq("room_id", room.id);
    if (deleteCards.error) throw deleteCards.error;
    const updatePlayers = await supabase.from("players").update({ submitted: false }).eq("room_id", room.id);
    if (updatePlayers.error) throw updatePlayers.error;

    if (scope === "all") {
      const deleteResults = await supabase.from("results").delete().eq("room_id", room.id);
      if (deleteResults.error) throw deleteResults.error;
    }

    const resetReveal = await supabase
      .from("reveal_state")
      .update({ phase: "sealed", visible_count: 0 })
      .eq("room_id", room.id);
    if (resetReveal.error) throw resetReveal.error;
    await recordSystemUpdate(supabase, {
      roomId: room.id,
      kind: "system",
      title: scope === "all" ? "Full game reset" : "Card submissions reset",
      detail: scope === "all" ? "Scores, secret cards, submissions, and reveal progress were reset." : "Secret cards and submission status were reset.",
      actor: "Admin",
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to reset." }, { status: 500 });
  }
}
