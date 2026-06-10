import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PdfPageClient } from "./PdfPageClient";

export default async function PdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const form = await prisma.tripForm.findUnique({ where: { id } });

  if (!form) notFound();
  if (user.role === "EMPLOYEE" && form.employeeId !== user.id) notFound();
  if (form.status !== "POST_APPROVED") notFound();

  return <PdfPageClient form={form as any} />;
}
