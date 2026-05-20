import { getRoomInternals } from "@/lib/aolinpike-room";
import { normalizePin } from "@/components/aolinpike/supabase-mappers";
import { recordSystemUpdate } from "@/lib/system-updates";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const adminPin = normalizePin(body.adminPin);
    const { supabase, room, players } = await getRoomInternals();
    if (adminPin !== room.admin_pin) return Response.json({ error: "Wrong admin PIN." }, { status: 401 });

    if (typeof body.nextAdminPin === "string") {
      const nextAdminPin = normalizePin(body.nextAdminPin);
      if (nextAdminPin.length !== 4) return Response.json({ error: "Admin PIN must be 4 digits." }, { status: 400 });
      const { error } = await supabase.from("game_rooms").update({ admin_pin: nextAdminPin }).eq("id", room.id);
      if (error) throw error;
      await recordSystemUpdate(supabase, {
        roomId: room.id,
        kind: "admin",
        title: "Admin PIN changed",
        detail: "Admin access was updated.",
        actor: "Admin",
      });
    }

    if (typeof body.player === "string" && typeof body.nextPlayerPin === "string") {
      const player = players.find((item) => item.name === body.player);
      const nextPlayerPin = normalizePin(body.nextPlayerPin);
      if (!player) return Response.json({ error: "Unknown player." }, { status: 404 });
      if (nextPlayerPin.length !== 4) return Response.json({ error: "Player PIN must be 4 digits." }, { status: 400 });
      const duplicate = players.find((item) => item.id !== player.id && item.pin === nextPlayerPin);
      if (duplicate) {
        return Response.json({ error: `${nextPlayerPin} is already assigned to ${duplicate.name}. Player PINs must be unique.` }, { status: 409 });
      }
      const { error } = await supabase
        .from("player_pins")
        .upsert({ player_id: player.id, pin: nextPlayerPin }, { onConflict: "player_id" });
      if (error) throw error;
      await recordSystemUpdate(supabase, {
        roomId: room.id,
        kind: "admin",
        title: `${player.name} PIN changed`,
        detail: "Player access was updated.",
        actor: "Admin",
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update PIN." }, { status: 500 });
  }
}
