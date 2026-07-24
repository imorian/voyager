import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } });
  if (!dbUser || dbUser.role !== "ADMIN") return null;
  return dbUser;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  return NextResponse.json(serialize(invoices));
}
