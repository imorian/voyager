import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PostTripForm } from "./PostTripForm";

export default async function PostTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const form = await prisma.tripForm.findUnique({
    where: { id },
    include: {
      expenseLines: {
        include: { receipts: true },
        orderBy: [{ section: "asc" }, { lineNumber: "asc" }],
      },
    },
  });

  if (!form) notFound();
  if (form.employeeId !== user.id) notFound();

  // Only accessible when pre-approved or post phases
  if (!["PRE_APPROVED", "POST_DRAFT", "POST_SUBMITTED", "POST_APPROVED", "POST_REJECTED"].includes(form.status)) {
    redirect(`/forms/${form.id}`);
  }

  const isReadOnly = !["PRE_APPROVED", "POST_DRAFT", "POST_REJECTED"].includes(form.status);
  const rates = await prisma.perDiemRate.findMany();

  return <PostTripForm form={form as any} user={user as any} rates={rates as any} isReadOnly={isReadOnly} />;
}
