import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    const item = await prisma.pipelineItem.update({
      where: { id: params.id },
      data: {
        stage: body.stage ?? undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        deadline: body.deadline ? new Date(body.deadline) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      item: {
        ...item,
        deadline: item.deadline?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to update pipeline item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Find the item to get the jobId
    const item = await prisma.pipelineItem.findUnique({ where: { id: params.id } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    await prisma.pipelineItem.delete({ where: { id: params.id } });
    await prisma.job.update({ where: { id: item.jobId }, data: { saved: false } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove from pipeline" }, { status: 500 });
  }
}
