import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { fetchAllGsaRates } from "@/lib/gsa";

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

  const body = await req.json();
  const year = Number(body.year);
  if (!year || year < 2020 || year > 2030) {
    return NextResponse.json({ error: "Valid fiscal year required (2020–2030)" }, { status: 400 });
  }

  const rates = await fetchAllGsaRates(year);
  if (rates.length === 0) {
    return NextResponse.json({ error: "No rates returned from GSA API — check the year and try again" }, { status: 502 });
  }

  const BATCH = 50;
  let upserted = 0;

  for (let i = 0; i < rates.length; i += BATCH) {
    const batch = rates.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (r) => {
        const existing = await prisma.perDiemRate.findFirst({
          where: { city: r.city, state: r.state, fiscalYear: r.fiscalYear },
          select: { id: true },
        });
        const data = {
          lodgingJan: r.lodgingJan, lodgingFeb: r.lodgingFeb, lodgingMar: r.lodgingMar,
          lodgingApr: r.lodgingApr, lodgingMay: r.lodgingMay, lodgingJun: r.lodgingJun,
          lodgingJul: r.lodgingJul, lodgingAug: r.lodgingAug, lodgingSep: r.lodgingSep,
          lodgingOct: r.lodgingOct, lodgingNov: r.lodgingNov, lodgingDec: r.lodgingDec,
          mieTotal: r.mieTotal, mieFirstLast: r.mieFirstLast,
          mieBreakfast: r.mieBreakfast, mieLunch: r.mieLunch,
          mieDinner: r.mieDinner, mieIncidental: r.mieIncidental,
          usdPerDay: r.mieTotal, updatedBy: admin.id,
        };
        if (existing) {
          await prisma.perDiemRate.update({ where: { id: existing.id }, data });
        } else {
          await prisma.perDiemRate.create({
            data: {
              city: r.city, state: r.state, country: "US", fiscalYear: r.fiscalYear,
              effectiveFrom: new Date(), ...data,
            },
          });
        }
        upserted++;
      })
    );
  }

  return NextResponse.json({ synced: upserted, year });
}
