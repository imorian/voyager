import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ zip: string }> }) {
  const { zip } = await params;
  const year = new Date().getFullYear();
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
      lodging: Number(rate.Meals ?? rate.lodging ?? 0),
    });
  } catch {
    return NextResponse.json({ error: "GSA API error" }, { status: 500 });
  }
}
