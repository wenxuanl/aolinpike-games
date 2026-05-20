import { getRoomInternals } from "@/lib/aolinpike-room";
import { normalizePin } from "@/components/aolinpike/supabase-mappers";
import { recordSystemUpdate } from "@/lib/system-updates";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const adminPin = normalizePin(body.adminPin);
    const action = String(body.action ?? "");
    const { supabase, room } = await getRoomInternals();
    if (adminPin !== room.admin_pin) return Response.json({ error: "Wrong admin PIN." }, { status: 401 });

    const { data: current, error: currentError } = await supabase
      .from("reveal_state")
      .select("visible_count")
      .eq("room_id", room.id)
      .single();
    if (currentError) throw currentError;

    if (action === "next" && Number(body.expectedVisibleCount) !== Number(current.visible_count ?? 0)) {
      return Response.json(
        { error: "Reveal already moved on from another device. Syncing before the next card." },
        { status: 409 }
      );
    }

    const next =
      action === "open"
        ? { phase: "active", visible_count: 0 }
        : action === "reset"
          ? { phase: "sealed", visible_count: 0 }
          : { phase: body.complete ? "complete" : "active", visible_count: Math.max(0, Number(current.visible_count ?? 0) + 1) };

    const { error } = await supabase.from("reveal_state").update(next).eq("room_id", room.id);
    if (error) throw error;
    await recordSystemUpdate(supabase, {
      roomId: room.id,
      kind: "reveal",
      title:
        action === "open"
          ? "Reveal ceremony started"
          : action === "reset"
            ? "Reveal ceremony reset"
            : body.complete
              ? "Reveal ceremony completed"
              : "Reveal advanced",
      detail: action === "next" ? `Visible reveal events: ${next.visible_count}.` : "Reveal state changed for every connected screen.",
      actor: "Admin",
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update reveal." }, { status: 500 });
  }
}
