import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminUsersClient } from "./AdminUsersClient";

export default async function AdminUsersPage() {
  await requireRole("ADMIN");
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: { manager: { select: { name: true } } },
  });
  const managers = await prisma.user.findMany({
    where: { role: { in: ["MANAGER", "ADMIN"] } },
    select: { id: true, name: true },
  });
  return <AdminUsersClient users={users as any} managers={managers} />;
}
