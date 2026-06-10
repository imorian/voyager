import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { preSubmittedEmail } from "@/lib/email/templates";
import { formatDate } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const form = await prisma.tripForm.findUnique({ where: { id } });
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (form.employeeId !== dbUser.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["DRAFT", "PRE_REJECTED"].includes(form.status)) return NextResponse.json({ error: "Form is locked" }, { status: 400 });

  const body = await req.json();
  const { action, expenseLines, ...fields } = body;

  const toUpdate: any = {
    purpose: fields.purpose,
    objective: fields.objective,
    costChargedTo: fields.costChargedTo,
    costCenter: fields.costCenter,
    outCity: fields.outCity,
    outCountry: fields.outCountry,
    outAirline: fields.outAirline,
    outFlightNo: fields.outFlightNo,
    outDepDate: fields.outDepDate ? new Date(fields.outDepDate) : null,
    outDepTime: fields.outDepTime,
    outArrDate: fields.outArrDate ? new Date(fields.outArrDate) : null,
    outArrTime: fields.outArrTime,
    inCity: fields.inCity,
    inCountry: fields.inCountry,
    inAirline: fields.inAirline,
    inFlightNo: fields.inFlightNo,
    inDepDate: fields.inDepDate ? new Date(fields.inDepDate) : null,
    inDepTime: fields.inDepTime,
    inArrDate: fields.inArrDate ? new Date(fields.inArrDate) : null,
    inArrTime: fields.inArrTime,
    totalTripDays: fields.totalTripDays ? Number(fields.totalTripDays) : null,
    costOfLivingArea: fields.costOfLivingArea || null,
    botFxRate: fields.botFxRate ? Number(fields.botFxRate) : null,
  };

  if (action === "SUBMIT") {
    if (!dbUser.managerId) return NextResponse.json({ error: "Your manager is not set up yet. Contact your admin." }, { status: 400 });

    // Snapshot employee info
    toUpdate.empIdSnap = dbUser.empId;
    toUpdate.empNameSnap = dbUser.name;
    toUpdate.positionSnap = dbUser.position;
    toUpdate.gradeSnap = dbUser.grade;
    toUpdate.departmentSnap = dbUser.department;
    toUpdate.divisionSnap = dbUser.division;

    // Snapshot per diem rate
    if (fields.costOfLivingArea) {
      const rate = await prisma.perDiemRate.findUnique({ where: { area: fields.costOfLivingArea } });
      if (rate) {
        toUpdate.perDiemUsdPerDay = rate.usdPerDay;
        const days = Number(fields.totalTripDays ?? 0);
        const usd = days * Number(rate.usdPerDay);
        const thb = usd * Number(fields.botFxRate ?? 0);
        toUpdate.perDiemTotalUsd = usd;
        toUpdate.perDiemTotalThb = thb;
      }
    }

    toUpdate.status = "PRE_SUBMITTED";
    toUpdate.preSubmittedAt = new Date();
    toUpdate.preRejectionNote = null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.tripForm.update({ where: { id: id }, data: toUpdate });

    // Upsert expense lines
    if (expenseLines?.length) {
      for (const line of expenseLines) {
        const thb = Number(line.amountLocalFx ?? 0) * Number(line.fxRateBot ?? 0);
        await tx.expenseLine.upsert({
          where: { tripFormId_phase_section_lineNumber: { tripFormId: id, phase: "PRE", section: line.section, lineNumber: line.lineNumber } },
          create: {
            tripFormId: id, phase: "PRE", section: line.section, lineNumber: line.lineNumber,
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
        data: { tripFormId: id, phase: "PRE", action: "SUBMITTED", actorId: dbUser.id },
      });
    }
  });

  // Send email to manager
  if (action === "SUBMIT" && dbUser.managerId) {
    const manager = await prisma.user.findUnique({ where: { id: dbUser.managerId } });
    if (manager) {
      const { subject, html } = preSubmittedEmail(
        form.referenceNumber, dbUser.name,
        [fields.outCity, fields.outCountry].filter(Boolean).join(", "),
        fields.outDepDate ? formatDate(new Date(fields.outDepDate)) : ""
      );
      await sendEmail(manager.email, subject, html, id, manager.id, "PRE_SUBMITTED");
    }
  }

  return NextResponse.json({ ok: true });
}
