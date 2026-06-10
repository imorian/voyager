import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const user = await requireUser();

  const where =
    user.role === "EMPLOYEE"
      ? { employeeId: user.id }
      : user.role === "MANAGER"
      ? { employee: { managerId: user.id } }
      : {};

  const forms = await prisma.tripForm.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { employee: { select: { name: true } } },
  });

  // Summary cards
  const openDrafts = forms.filter((f) =>
    ["DRAFT", "PRE_REJECTED", "POST_DRAFT", "POST_REJECTED"].includes(f.status)
  ).length;

  const awaitingApproval =
    user.role === "EMPLOYEE"
      ? forms.filter((f) => ["PRE_SUBMITTED", "POST_SUBMITTED"].includes(f.status)).length
      : forms.filter((f) => ["PRE_SUBMITTED", "POST_SUBMITTED"].includes(f.status)).length;

  const currentYear = new Date().getFullYear();
  const approvedThisYear = forms.filter(
    (f) => f.status === "POST_APPROVED" && f.postApprovedAt && new Date(f.postApprovedAt).getFullYear() === currentYear
  ).length;

  return (
    <DashboardClient
      forms={forms as any}
      user={user as any}
      stats={{ openDrafts, awaitingApproval, approvedThisYear }}
    />
  );
}
