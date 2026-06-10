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

const gsaFields = (b: any) => ({
  fiscalYear: b.fiscalYear ?? null,
  lodgingJan: b.lodgingJan ?? null, lodgingFeb: b.lodgingFeb ?? null, lodgingMar: b.lodgingMar ?? null,
  lodgingApr: b.lodgingApr ?? null, lodgingMay: b.lodgingMay ?? null, lodgingJun: b.lodgingJun ?? null,
  lodgingJul: b.lodgingJul ?? null, lodgingAug: b.lodgingAug ?? null, lodgingSep: b.lodgingSep ?? null,
  lodgingOct: b.lodgingOct ?? null, lodgingNov: b.lodgingNov ?? null, lodgingDec: b.lodgingDec ?? null,
  mieTotal: b.mieTotal ?? null, mieFirstLast: b.mieFirstLast ?? null,
  mieBreakfast: b.mieBreakfast ?? null, mieLunch: b.mieLunch ?? null,
  mieDinner: b.mieDinner ?? null, mieIncidental: b.mieIncidental ?? null,
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.city || !body.state) return NextResponse.json({ error: "city and state are required" }, { status: 400 });

  const rate = await prisma.perDiemRate.create({
    data: {
      city: body.city, state: body.state, country: body.country || "US",
      usdPerDay: body.usdPerDay || body.mieTotal || 0,
      effectiveFrom: new Date(), updatedBy: admin.id,
      ...gsaFields(body),
    },
  });
  return NextResponse.json(rate, { status: 201 });
}
