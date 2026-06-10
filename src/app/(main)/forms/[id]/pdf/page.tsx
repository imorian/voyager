import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PdfPageClient } from "./PdfPageClient";

export default async function PdfPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const form = await prisma.tripForm.findUnique({
    where: { id: params.id },
    include: {
      expenseLines: { orderBy: [{ section: "asc" }, { lineNumber: "asc" }] },
      preApprover: { select: { name: true } },
      postApprover: { select: { name: true } },
    },
  });

  if (!form) notFound();
  if (user.role === "EMPLOYEE" && form.employeeId !== user.id) notFound();
  if (form.status !== "POST_APPROVED") notFound();

  return (
    <PdfPageClient
      form={{
        ...form,
        preApproverName: form.preApprover?.name,
        postApproverName: form.postApprover?.name,
        expenseLines: undefined,
      } as any}
      preLines={form.expenseLines.filter((l) => l.phase === "PRE") as any}
      postLines={form.expenseLines.filter((l) => l.phase === "POST") as any}
    />
  );
}
