import type { SupabaseClient } from "@supabase/supabase-js";
import type { SystemUpdateKind } from "@/components/aolinpike/types";

export async function recordSystemUpdate(
  supabase: SupabaseClient,
  {
    roomId,
    kind,
    title,
    detail = "",
    actor = "System",
  }: {
    roomId: string;
    kind: SystemUpdateKind;
    title: string;
    detail?: string;
    actor?: string;
  }
) {
  const { error } = await supabase.from("system_updates").insert({
    room_id: roomId,
    kind,
    title,
    detail,
    actor,
  });
  if (error) throw error;
}
