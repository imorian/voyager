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

// PATCH /api/admin/hardship/[id] — mark as paid or unpaid
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { paid, paidNote } = await req.json();

  const invoice = await prisma.hardshipInvoice.findUnique({ where: { id } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.hardshipInvoice.update({
    where: { id },
    data: {
      paidAt: paid ? new Date() : null,
      paidBy: paid ? admin.id : null,
      paidNote: paid ? (paidNote || null) : null,
    },
  });

  const serialize = (v: any) => JSON.parse(JSON.stringify(v, (_, val) =>
    val !== null && typeof val === "object" && typeof val.toFixed === "function" ? Number(val) : val
  ));

  return NextResponse.json(serialize(updated));
}
