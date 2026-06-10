import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { TripFormPdf } from "@/components/pdf/TripFormPdf";
import React from "react";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } });
  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await prisma.tripForm.findUnique({
    where: { id },
    include: {
      expenseLines: { orderBy: [{ section: "asc" }, { lineNumber: "asc" }] },
      preApprover: { select: { name: true } },
      postApprover: { select: { name: true } },
    },
  });

  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (dbUser.role === "EMPLOYEE" && form.employeeId !== dbUser.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (form.status !== "POST_APPROVED") return NextResponse.json({ error: "Not approved" }, { status: 400 });

  const preLines = form.expenseLines.filter((l) => l.phase === "PRE");
  const postLines = form.expenseLines.filter((l) => l.phase === "POST");
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Travel Expense";

  const pdfDoc = React.createElement(TripFormPdf, {
    form: { ...form, preApproverName: form.preApprover?.name, postApproverName: form.postApprover?.name },
    preLines,
    postLines,
    companyName,
  });

  const buffer = await renderToBuffer(pdfDoc as any);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${form.referenceNumber}.pdf"`,
    },
  });
}
