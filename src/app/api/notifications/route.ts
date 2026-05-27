import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const { data: notifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const unreadCount = (notifications ?? []).filter((n) => !n.read).length;
    return NextResponse.json({ notifications: notifications ?? [], unreadCount });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const { ids, markAllRead } = await req.json();

    if (markAllRead) {
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
    } else if (ids?.length) {
      await supabase.from("notifications").update({ read: true }).in("id", ids).eq("user_id", user.id);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
