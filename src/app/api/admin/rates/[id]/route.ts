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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { usdPerDay, city, state, country } = await req.json();
  const rate = await prisma.perDiemRate.update({
    where: { id },
    data: {
      usdPerDay,
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(country !== undefined && { country }),
      effectiveFrom: new Date(),
      updatedBy: admin.id,
    },
  });
  return NextResponse.json(rate);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.perDiemRate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
