import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const form = await prisma.tripForm.findUnique({ where: { id } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (form.employeeId !== dbUser.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isPreSubmitted = form.status === "PRE_SUBMITTED";
  const isPostSubmitted = form.status === "POST_SUBMITTED";
  if (!isPreSubmitted && !isPostSubmitted) return NextResponse.json({ error: "Can only retract submitted forms" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.tripForm.update({
      where: { id: id },
      data: { status: isPreSubmitted ? "DRAFT" : "POST_DRAFT" },
    });
    await tx.approvalLog.create({
      data: { tripFormId: id, phase: isPreSubmitted ? "PRE" : "POST", action: "RETRACTED", actorId: dbUser.id },
    });
  });

  return NextResponse.json({ ok: true });
}
