import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HardshipAdminClient } from "./HardshipAdminClient";

export default async function HardshipAdminPage() {
  await requireRole("ADMIN");

  const invoices = await prisma.hardshipInvoice.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tripForm: {
        include: { employee: { select: { id: true, name: true, empId: true, department: true } } },
      },
      paidByUser: { select: { name: true } },
    },
  });

  const serialize = (v: any) => JSON.parse(JSON.stringify(v, (_, val) =>
    val !== null && typeof val === "object" && typeof val.toFixed === "function" ? Number(val) : val
  ));

  return <HardshipAdminClient invoices={serialize(invoices)} />;
}
