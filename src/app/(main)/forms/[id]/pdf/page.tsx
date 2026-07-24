import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PdfPageClient } from "./PdfPageClient";

export default async function PdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const isDev = process.env.NEXT_PUBLIC_DEV_TOOLS === "true";

  const form = await prisma.tripForm.findUnique({
    where: { id },
    include: {
      employee: { select: { name: true, empId: true, department: true, position: true } },
      expenseLines: { orderBy: [{ phase: "asc" }, { section: "asc" }, { lineNumber: "asc" }] },
      hardshipInvoice: { include: { days: { orderBy: { dayNumber: "asc" } } } },
      mieDayRows: { orderBy: { dayNumber: "asc" } },
    },
  });

  if (!form) notFound();
  if (user.role === "EMPLOYEE" && form.employeeId !== user.id) notFound();
  if (!isDev && form.status !== "POST_APPROVED") notFound();

  const serialize = (v: any) => JSON.parse(JSON.stringify(v, (_, val) =>
    val !== null && typeof val === "object" && typeof val.toFixed === "function" ? Number(val) : val
  ));
  return <PdfPageClient form={serialize(form)} />;
}
