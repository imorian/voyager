import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } });
  if (!dbUser || dbUser.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (e: any) {
    return NextResponse.json({ error: `File read failed: ${e.message}` }, { status: 400 });
  }

  let rows: any[];
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  } catch (e: any) {
    return NextResponse.json({ error: `Excel parse failed: ${e.message}` }, { status: 400 });
  }

  if (!rows.length) return NextResponse.json({ error: "No rows found in file" }, { status: 400 });

  // Log first row to verify column names
  console.log("First row sample:", JSON.stringify(rows[0]));

  let upserted = 0;
  const BATCH = 20;

  try {
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      for (const row of batch) {
        const zip = String(row["Zip"] ?? "").trim().padStart(5, "0");
        const fiscalYear = Number(row["FiscalYear"] ?? 0);
        if (!zip || zip === "00000" || !fiscalYear) continue;

        const mieTotal = Number(row["Meals"] ?? 0);
        if (!mieTotal) continue;

        await prisma.zipPerDiemRate.upsert({
          where: { zip_fiscalYear: { zip, fiscalYear } },
          create: {
            zip,
            destinationId: row["DestinationID"] ? Number(row["DestinationID"]) : null,
            name: String(row["Name"] ?? ""),
            county: row["County"] ? String(row["County"]) : null,
            state: String(row["State"] ?? ""),
            fiscalYear,
            mieTotal,
            lodgingOct: row["Oct"] ? Number(row["Oct"]) : null,
            lodgingNov: row["Nov"] ? Number(row["Nov"]) : null,
            lodgingDec: row["Dec"] ? Number(row["Dec"]) : null,
            lodgingJan: row["Jan"] ? Number(row["Jan"]) : null,
            lodgingFeb: row["Feb"] ? Number(row["Feb"]) : null,
            lodgingMar: row["Mar"] ? Number(row["Mar"]) : null,
            lodgingApr: row["Apr"] ? Number(row["Apr"]) : null,
            lodgingMay: row["May"] ? Number(row["May"]) : null,
            lodgingJun: row["Jun"] ? Number(row["Jun"]) : null,
            lodgingJul: row["Jul"] ? Number(row["Jul"]) : null,
            lodgingAug: row["Aug"] ? Number(row["Aug"]) : null,
            lodgingSep: row["Sep"] ? Number(row["Sep"]) : null,
          },
          update: {
            name: String(row["Name"] ?? ""),
            county: row["County"] ? String(row["County"]) : null,
            state: String(row["State"] ?? ""),
            mieTotal,
            lodgingOct: row["Oct"] ? Number(row["Oct"]) : null,
            lodgingNov: row["Nov"] ? Number(row["Nov"]) : null,
            lodgingDec: row["Dec"] ? Number(row["Dec"]) : null,
            lodgingJan: row["Jan"] ? Number(row["Jan"]) : null,
            lodgingFeb: row["Feb"] ? Number(row["Feb"]) : null,
            lodgingMar: row["Mar"] ? Number(row["Mar"]) : null,
            lodgingApr: row["Apr"] ? Number(row["Apr"]) : null,
            lodgingMay: row["May"] ? Number(row["May"]) : null,
            lodgingJun: row["Jun"] ? Number(row["Jun"]) : null,
            lodgingJul: row["Jul"] ? Number(row["Jul"]) : null,
            lodgingAug: row["Aug"] ? Number(row["Aug"]) : null,
            lodgingSep: row["Sep"] ? Number(row["Sep"]) : null,
          },
        });
        upserted++;
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: `DB error after ${upserted} rows: ${e.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, imported: upserted, total: rows.length });
}
