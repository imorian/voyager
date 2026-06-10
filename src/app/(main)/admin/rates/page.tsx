import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminRatesClient } from "./AdminRatesClient";

export default async function AdminRatesPage() {
  await requireRole("ADMIN");
  const rates = await prisma.perDiemRate.findMany({ orderBy: { area: "asc" }, include: { updater: { select: { name: true } } } });
  return <AdminRatesClient rates={rates as any} />;
}
