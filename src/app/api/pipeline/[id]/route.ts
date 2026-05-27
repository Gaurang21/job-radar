import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await requireUser();
    const body = await req.json();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.stage !== undefined) updates.stage = body.stage;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.deadline !== undefined) updates.deadline = body.deadline;

    const { data, error } = await supabase
      .from("pipeline_items")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, item: data });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await requireUser();
    const { data: item } = await supabase
      .from("pipeline_items")
      .select("job_id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await supabase.from("pipeline_items").delete().eq("id", params.id).eq("user_id", user.id);
    await supabase.from("jobs").update({ saved: false }).eq("id", item.job_id).eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
