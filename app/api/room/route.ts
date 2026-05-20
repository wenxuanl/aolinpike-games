import { getRoomSnapshot } from "@/lib/aolinpike-room";
import { getApiErrorMessage } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getRoomSnapshot();
    return Response.json(snapshot);
  } catch (error) {
    return Response.json({ error: getApiErrorMessage(error, "Unable to load room.") }, { status: 500 });
  }
}
