import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApprovalReviewClient } from "./ApprovalReviewClient";

export default async function ApprovalReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("MANAGER", "ADMIN");

  const form = await prisma.tripForm.findUnique({
    where: { id },
    include: {
      employee: true,
      expenseLines: {
        include: { receipts: true },
        orderBy: [{ phase: "asc" }, { section: "asc" }, { lineNumber: "asc" }],
      },
    },
  });

  if (!form) notFound();

  if (
    user.role === "MANAGER" &&
    form.employee.managerId !== user.id
  ) notFound();

  return <ApprovalReviewClient form={form as any} user={user as any} />;
}
