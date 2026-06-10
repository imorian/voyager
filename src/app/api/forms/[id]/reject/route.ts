import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { preRejectedEmail, postRejectedEmail } from "@/lib/email/templates";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const approver = await prisma.user.findUnique({ where: { email: authUser.email! } });
  if (!approver || !["MANAGER", "ADMIN"].includes(approver.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await prisma.tripForm.findUnique({ where: { id }, include: { employee: true } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { phase, notes } = await req.json();
  if (!notes?.trim()) return NextResponse.json({ error: "Rejection reason required" }, { status: 400 });

  const isPre = phase === "pre";
  if (isPre && form.status !== "PRE_SUBMITTED") return NextResponse.json({ error: "Already actioned" }, { status: 409 });
  if (!isPre && form.status !== "POST_SUBMITTED") return NextResponse.json({ error: "Already actioned" }, { status: 409 });

  const toUpdate: any = isPre
    ? { status: "PRE_REJECTED", preRejectionNote: notes }
    : { status: "POST_REJECTED", postRejectionNote: notes };

  await prisma.$transaction(async (tx) => {
    await tx.tripForm.update({ where: { id: id }, data: toUpdate });
    await tx.approvalLog.create({
      data: { tripFormId: id, phase: isPre ? "PRE" : "POST", action: "REJECTED", actorId: approver.id, notes },
    });
  });

  const employee = form.employee;
  if (isPre) {
    const { subject, html } = preRejectedEmail(form.referenceNumber, notes);
    await sendEmail(employee.email, subject, html, id, employee.id, "PRE_REJECTED");
  } else {
    const { subject, html } = postRejectedEmail(form.referenceNumber, notes);
    await sendEmail(employee.email, subject, html, id, employee.id, "POST_REJECTED");
  }

  return NextResponse.json({ ok: true });
}
