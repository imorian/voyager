import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { postSubmittedEmail } from "@/lib/email/templates";
import { formatDate } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const form = await prisma.tripForm.findUnique({ where: { id } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (form.employeeId !== dbUser.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["PRE_APPROVED", "POST_DRAFT", "POST_REJECTED"].includes(form.status)) return NextResponse.json({ error: "Form is locked" }, { status: 400 });

  const body = await req.json();
  const { action, expenseLines, ...fields } = body;

  if (action === "SUBMIT") {
    // Validate receipts
    const linesWithAmount = (expenseLines ?? []).filter((l: any) => Number(l.amountLocalFx ?? 0) > 0);
    for (const line of linesWithAmount) {
      const existingLine = await prisma.expenseLine.findUnique({
        where: { tripFormId_phase_section_lineNumber: { tripFormId: id, phase: "POST", section: line.section, lineNumber: line.lineNumber } },
        include: { receipts: true },
      });
      if (!existingLine || existingLine.receipts.length === 0) {
        return NextResponse.json({ error: `Receipt required for ${line.section.toLowerCase()} line ${line.lineNumber}` }, { status: 400 });
      }
    }
  }

  const toUpdate: any = {
    totalTripDays: fields.totalTripDays ? Number(fields.totalTripDays) : null,
    costOfLivingArea: fields.costOfLivingArea || null,
    botFxRate: fields.botFxRate ? Number(fields.botFxRate) : null,
  };

  if (action === "SUBMIT") {
    if (fields.costOfLivingArea) {
      const rate = await prisma.perDiemRate.findFirst({ where: { area: fields.costOfLivingArea } });
      if (rate) {
        const usd = Number(fields.totalTripDays ?? 0) * Number(rate.usdPerDay);
        const thb = usd * Number(fields.botFxRate ?? 0);
        toUpdate.perDiemTotalUsd = usd;
        toUpdate.perDiemTotalThb = thb;
      }
    }
    toUpdate.status = "POST_SUBMITTED";
    toUpdate.postSubmittedAt = new Date();
    toUpdate.postRejectionNote = null;
  } else {
    toUpdate.status = form.status === "PRE_APPROVED" ? "POST_DRAFT" : form.status;
  }

  await prisma.$transaction(async (tx) => {
    await tx.tripForm.update({ where: { id: id }, data: toUpdate });

    if (expenseLines?.length) {
      for (const line of expenseLines) {
        const thb = Number(line.amountLocalFx ?? 0) * Number(line.fxRateBot ?? 0);
        await tx.expenseLine.upsert({
          where: { tripFormId_phase_section_lineNumber: { tripFormId: id, phase: "POST", section: line.section, lineNumber: line.lineNumber } },
          create: {
            tripFormId: id, phase: "POST", section: line.section, lineNumber: line.lineNumber,
            expenseType: line.expenseType || null, expenseDate: line.expenseDate ? new Date(line.expenseDate) : null,
            workDetails: line.workDetails || null,
            amountLocalFx: line.amountLocalFx ? Number(line.amountLocalFx) : null,
            fxRateBot: line.fxRateBot ? Number(line.fxRateBot) : null,
            amountThb: thb || null,
          },
          update: {
            expenseType: line.expenseType || null, expenseDate: line.expenseDate ? new Date(line.expenseDate) : null,
            workDetails: line.workDetails || null,
            amountLocalFx: line.amountLocalFx ? Number(line.amountLocalFx) : null,
            fxRateBot: line.fxRateBot ? Number(line.fxRateBot) : null,
            amountThb: thb || null,
          },
        });
      }
    }

    if (action === "SUBMIT") {
      await tx.approvalLog.create({
        data: { tripFormId: id, phase: "POST", action: "SUBMITTED", actorId: dbUser.id },
      });
    }
  });

  if (action === "SUBMIT" && dbUser.managerId) {
    const manager = await prisma.user.findUnique({ where: { id: dbUser.managerId } });
    if (manager) {
      const { subject, html } = postSubmittedEmail(
        form.referenceNumber, dbUser.name,
        [form.outCity, form.outCountry].filter(Boolean).join(", "),
        form.outDepDate ? formatDate(form.outDepDate) : ""
      );
      await sendEmail(manager.email, subject, html, id, manager.id, "POST_SUBMITTED");
    }
  }

  return NextResponse.json({ ok: true });
}
