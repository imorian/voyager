import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ zip: string }> }) {
  const { zip } = await params;
  const year = new Date().getFullYear();

  // Check local DB first
  const local = await prisma.zipPerDiemRate.findFirst({
    where: { zip, fiscalYear: year },
  });

  if (local) {
    return NextResponse.json({
      city: local.name,
      state: local.state,
      zip,
      usdPerDay: Number(local.mieTotal),
      source: "local",
    });
  }

  // Fall back to live GSA API
  const apiKey = process.env.GSA_API_KEY;
  const url = `https://api.gsa.gov/travel/perdiem/v2/rates/zip/${zip}/year/${year}${apiKey ? `?api_key=${apiKey}` : ""}`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = await res.json();
    const rate = data.rates?.[0]?.rate?.[0];
    if (!rate) return NextResponse.json({ error: "No rate for this ZIP" }, { status: 404 });
    return NextResponse.json({
      city: rate.city,
      state: data.rates[0].state,
      zip,
      usdPerDay: Number(rate.meals),
      source: "gsa",
    });
  } catch {
    return NextResponse.json({ error: "GSA API error" }, { status: 500 });
  }
}
