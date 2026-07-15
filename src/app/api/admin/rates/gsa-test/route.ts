import { NextRequest, NextResponse } from "next/server";

// Temporary debug endpoint — remove before going live
export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get("year") ?? "2026";
  const state = req.nextUrl.searchParams.get("state") ?? "CA";

  const apiKey = process.env.GSA_API_KEY;
  const res = await fetch(`https://api.gsa.gov/travel/perdiem/v2/rates/state/${state}/year/${year}${apiKey ? `?api_key=${apiKey}` : ""}`, {
    headers: { Accept: "application/json" },
  });

  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  return NextResponse.json({ status: res.status, body: json });
}
