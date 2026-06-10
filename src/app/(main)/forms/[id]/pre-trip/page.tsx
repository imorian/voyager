import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PreTripForm } from "./PreTripForm";

export default async function PreTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const form = await prisma.tripForm.findUnique({
    where: { id },
    include: { expenseLines: { where: { phase: "PRE" }, orderBy: [{ section: "asc" }, { lineNumber: "asc" }] } },
  });

  if (!form) notFound();
  if (form.employeeId !== user.id) notFound();

  const isReadOnly = !["DRAFT", "PRE_REJECTED"].includes(form.status);

  const rates = await prisma.perDiemRate.findMany();

  return (
    <PreTripForm
      form={form as any}
      user={user as any}
      rates={rates as any}
      isReadOnly={isReadOnly}
    />
  );
}
