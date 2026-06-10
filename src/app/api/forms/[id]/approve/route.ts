import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { preApprovedEmail, postApprovedEmail } from "@/lib/email/templates";
import { formatDate } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const approver = await prisma.user.findUnique({ where: { email: authUser.email! } });
  if (!approver || !["MANAGER", "ADMIN"].includes(approver.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await prisma.tripForm.findUnique({ where: { id }, include: { employee: true } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { phase, notes } = await req.json();
  const isPre = phase === "pre";

  // Optimistic locking check
  if (isPre && form.status !== "PRE_SUBMITTED") return NextResponse.json({ error: "Already actioned" }, { status: 409 });
  if (!isPre && form.status !== "POST_SUBMITTED") return NextResponse.json({ error: "Already actioned" }, { status: 409 });

  const now = new Date();

  const toUpdate: any = isPre
    ? { status: "PRE_APPROVED", preApprovedBy: approver.id, preApprovedAt: now }
    : {
        status: "POST_APPROVED", postApprovedBy: approver.id, postApprovedAt: now,
      };

  if (!isPre) {
    // Compute grand total for post approval
    const lines = await prisma.expenseLine.findMany({ where: { tripFormId: id, phase: "POST" } });
    const totalExpenses = lines.reduce((s, l) => s + Number(l.amountThb ?? 0), 0);
    const perDiemThb = Number(form.perDiemTotalThb ?? 0);
    toUpdate.postTotalExpensesThb = totalExpenses;
    toUpdate.postTotalPerdiemThb = perDiemThb;
    toUpdate.postGrandTotalThb = totalExpenses + perDiemThb;
  }

  await prisma.$transaction(async (tx) => {
    await tx.tripForm.update({ where: { id: id }, data: toUpdate });
    await tx.approvalLog.create({
      data: { tripFormId: id, phase: isPre ? "PRE" : "POST", action: "APPROVED", actorId: approver.id, notes },
    });
  });

  // Email employee
  const employee = form.employee;
  if (isPre) {
    const { subject, html } = preApprovedEmail(form.referenceNumber, [form.outCity, form.outCountry].filter(Boolean).join(", "), form.outDepDate ? formatDate(form.outDepDate) : "");
    await sendEmail(employee.email, subject, html, id, employee.id, "PRE_APPROVED");
  } else {
    const { subject, html } = postApprovedEmail(form.referenceNumber);
    await sendEmail(employee.email, subject, html, id, employee.id, "POST_APPROVED");
  }

  return NextResponse.json({ ok: true });
}
