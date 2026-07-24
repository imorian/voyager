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

  const isDev = process.env.NEXT_PUBLIC_DEV_TOOLS === "true";
  const isReadOnly = !isDev && !["DRAFT", "PRE_REJECTED"].includes(form.status);

  const rates = await prisma.perDiemRate.findMany();

  const serializedForm = JSON.parse(JSON.stringify(form, (_, v) =>
    v !== null && typeof v === "object" && typeof v.toFixed === "function" ? Number(v) : v
  ));
  const serializedRates = JSON.parse(JSON.stringify(rates, (_, v) =>
    v !== null && typeof v === "object" && typeof v.toFixed === "function" ? Number(v) : v
  ));

  return (
    <PreTripForm
      form={serializedForm}
      user={user as any}
      rates={serializedRates}
      isReadOnly={isReadOnly}
    />
  );
}
