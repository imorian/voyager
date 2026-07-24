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

  const isDev = process.env.NEXT_PUBLIC_DEV_TOOLS === "true";

  // Only accessible when pre-approved or post phases (bypass in dev)
  if (!isDev && !["PRE_APPROVED", "POST_DRAFT", "POST_SUBMITTED", "POST_APPROVED", "POST_REJECTED"].includes(form.status)) {
    redirect(`/forms/${form.id}`);
  }

  const isReadOnly = !isDev && !["PRE_APPROVED", "POST_DRAFT", "POST_REJECTED"].includes(form.status);
  const rates = await prisma.perDiemRate.findMany();

  // Serialize Prisma Decimal/Date fields to plain values for client component
  const serializedForm = JSON.parse(JSON.stringify(form, (_, v) =>
    v !== null && typeof v === "object" && typeof v.toFixed === "function" ? Number(v) : v
  ));
  const serializedRates = JSON.parse(JSON.stringify(rates, (_, v) =>
    v !== null && typeof v === "object" && typeof v.toFixed === "function" ? Number(v) : v
  ));

  return <PostTripForm form={serializedForm} user={user as any} rates={serializedRates} isReadOnly={isReadOnly} />;
}
