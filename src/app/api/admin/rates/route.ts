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

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { city, state, country, usdPerDay } = await req.json();
  if (!city || !state || !usdPerDay) return NextResponse.json({ error: "city, state and usdPerDay are required" }, { status: 400 });

  const rate = await prisma.perDiemRate.create({
    data: { city, state, country: country || "US", usdPerDay, effectiveFrom: new Date(), updatedBy: admin.id },
  });
  return NextResponse.json(rate, { status: 201 });
}
