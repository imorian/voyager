import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { email: authUser.email! } });
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { usdPerDay, area } = await req.json();

  // Upsert rate — create new record with today's effectiveFrom
  const rate = await prisma.perDiemRate.upsert({
    where: { area },
    create: { area, usdPerDay, effectiveFrom: new Date(), updatedBy: admin.id },
    update: { usdPerDay, effectiveFrom: new Date(), updatedBy: admin.id },
  });

  return NextResponse.json(rate);
}
