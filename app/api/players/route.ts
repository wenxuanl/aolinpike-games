import { getRoomInternals } from "@/lib/aolinpike-room";
import { normalizePin } from "@/components/aolinpike/supabase-mappers";
import { recordSystemUpdate } from "@/lib/system-updates";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const adminPin = normalizePin(body.adminPin);
    const { supabase, room, players } = await getRoomInternals();
    if (adminPin !== room.admin_pin) {
      return Response.json({ error: "Wrong admin PIN." }, { status: 401 });
    }

    const index = Number(body.index);
    const player = players[index];
    if (!player) return Response.json({ error: "Unknown player." }, { status: 404 });

    const updates: { name?: string; photo_url?: string } = {};
    if (typeof body.name === "string") updates.name = body.name.trim() || `Player ${index + 1}`;
    if (typeof body.photo === "string") updates.photo_url = body.photo;
    const nextName = updates.name ?? player.name;
    const nextPhoto = updates.photo_url ?? (player.photo_url ?? "");
    const nameChanged = typeof updates.name === "string" && nextName !== player.name;
    const photoChanged = typeof updates.photo_url === "string" && nextPhoto !== (player.photo_url ?? "");

    const { error } = await supabase.from("players").update(updates).eq("id", player.id);
    if (error) throw error;
    if (nameChanged) {
      await recordSystemUpdate(supabase, {
        roomId: room.id,
        kind: "player",
        title: "Player name changed",
        detail: `From ${player.name} to ${nextName}.`,
        actor: "Admin",
      });
    }
    if (photoChanged) {
      await recordSystemUpdate(supabase, {
        roomId: room.id,
        kind: "player",
        title: `${nextName} profile picture changed`,
        detail: nextPhoto ? "Admin saved a new player photo." : "Admin cleared the player photo.",
        actor: "Admin",
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update player." }, { status: 500 });
  }
}
