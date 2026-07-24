"use client";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Props { form: any }

function formatDate(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function PdfPageClient({ form }: Props) {
  const postLines = (form.expenseLines ?? []).filter((l: any) => l.phase === "POST");
  const transport = postLines.filter((l: any) => l.section === "TRANSPORTATION" && (l.expenseType || l.amountLocalFx));
  const accommodation = postLines.filter((l: any) => l.section === "ACCOMMODATION" && (l.expenseType || l.amountLocalFx));
  const other = postLines.filter((l: any) => l.section === "OTHER" && (l.expenseType || l.amountLocalFx));

  const totalTransport = transport.reduce((s: number, l: any) => s + Number(l.amountLocalFx ?? 0), 0);
  const totalAccom = accommodation.reduce((s: number, l: any) => s + Number(l.amountLocalFx ?? 0), 0);
  const totalOther = other.reduce((s: number, l: any) => s + Number(l.amountLocalFx ?? 0), 0);
  const mieDayRows = form.mieDayRows ?? [];
  const gsaMieTotal = mieDayRows.reduce((s: number, d: any) => s + Number(d.gsaNet ?? 0), 0);
  const grandTotal = totalTransport + totalAccom + totalOther + gsaMieTotal;

  const hardship = form.hardshipInvoice;
  const hardshipDays = hardship?.days ?? [];
  const hardshipTotal = Number(hardship?.total ?? 0);

  function printInvoice(which: "gsa" | "hardship") {
    const el = document.getElementById(`invoice-${which}`);
    if (!el) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${which === "gsa" ? "Invoice 1 — GSA" : "Invoice 2 — Hardship"} · ${form.referenceNumber}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 32px; }
          h1 { font-size: 18px; font-weight: bold; }
          h2 { font-size: 13px; font-weight: bold; margin: 16px 0 6px; }
          h3 { font-size: 11px; font-weight: bold; margin: 12px 0 4px; color: #444; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          th { background: #f3f4f6; text-align: left; padding: 5px 8px; font-size: 10px; border: 1px solid #ddd; }
          td { padding: 4px 8px; border: 1px solid #ddd; font-size: 10px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row td { font-weight: bold; background: #f9fafb; }
          .grand-total { margin-top: 16px; padding: 12px 16px; border: 2px solid #111; }
          .grand-total-label { font-size: 13px; font-weight: bold; }
          .grand-total-amount { font-size: 20px; font-weight: bold; }
          .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin: 12px 0; }
          .field label { font-size: 9px; color: #666; text-transform: uppercase; }
          .field p { font-weight: 600; }
          .divider { border-top: 1px solid #ddd; margin: 12px 0; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 9px; font-weight: bold; }
          .badge-purple { background: #f3e8ff; color: #7c3aed; border: 1px solid #d8b4fe; }
          .badge-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        ${el.innerHTML}
      </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Invoice Export</p>
          <h1 className="text-2xl font-bold font-mono">{form.referenceNumber}</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => printInvoice("gsa")}>
            <Printer className="h-4 w-4 mr-2" />Print Invoice 1 (GSA)
          </Button>
          {hardship && (
            <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50" onClick={() => printInvoice("hardship")}>
              <Printer className="h-4 w-4 mr-2" />Print Invoice 2 (Hardship)
            </Button>
          )}
        </div>
      </div>

      {/* ── INVOICE 1 — GSA ── */}
      <div id="invoice-gsa" className="bg-white border rounded-lg p-8 space-y-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">Invoice 1 — GSA Expense Claim</h1>
            <p className="text-sm text-gray-500 mt-0.5">BGP Holding (US) LLC</p>
          </div>
          <div className="text-right">
            <p className="font-mono font-bold text-lg">{form.referenceNumber}</p>
            <p className="text-xs text-gray-500">Date: {formatDate(form.postSubmittedAt ?? form.updatedAt)}</p>
          </div>
        </div>

        <div className="border-t pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Field label="Employee" value={form.empNameSnap ?? form.employee?.name} />
          <Field label="Employee ID" value={form.empIdSnap ?? form.employee?.empId} />
          <Field label="Department" value={form.employee?.department} />
          <Field label="Position" value={form.employee?.position} />
          <Field label="Destination" value={[form.outCity, form.outCountry].filter(Boolean).join(", ")} />
          <Field label="Departure" value={formatDate(form.outDepDate)} />
          <Field label="Return" value={formatDate(form.inArrDate)} />
          <Field label="Total Days" value={form.totalTripDays?.toString()} />
          <div className="col-span-2"><Field label="Purpose" value={form.purpose} /></div>
          <Field label="Cost Center" value={form.costCenter} />
          <Field label="Cost Charged To" value={form.costChargedTo} />
        </div>

        {/* Expense lines */}
        {[
          { title: "Transportation", rows: transport, total: totalTransport },
          { title: "Accommodation", rows: accommodation, total: totalAccom },
          { title: "Other Expenses", rows: other, total: totalOther },
        ].map(({ title, rows, total }) => rows.length > 0 && (
          <div key={title}>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">{title}</h2>
            <table className="w-full text-xs border border-gray-200 rounded overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Amount (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((l: any) => (
                  <tr key={l.id}>
                    <td className="px-3 py-1.5 text-gray-500">{l.lineNumber}</td>
                    <td className="px-3 py-1.5">{l.expenseType || "—"}</td>
                    <td className="px-3 py-1.5">{l.expenseDate ? formatDate(l.expenseDate) : "—"}</td>
                    <td className="px-3 py-1.5">{l.workDetails || "—"}</td>
                    <td className="px-3 py-1.5 text-right font-medium">${Number(l.amountLocalFx ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={4} className="px-3 py-1.5 text-right">Subtotal</td>
                  <td className="px-3 py-1.5 text-right">${total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {/* M&IE per diem table */}
        {mieDayRows.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">M&IE Per Diem (GSA)</h2>
            <table className="w-full text-xs border border-gray-200 rounded overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Day</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">City / State</th>
                  <th className="px-3 py-2 text-right">GSA Rate</th>
                  <th className="px-3 py-2 text-center">1st/Last</th>
                  <th className="px-3 py-2 text-center">BF</th>
                  <th className="px-3 py-2 text-center">Lunch</th>
                  <th className="px-3 py-2 text-center">Dinner</th>
                  <th className="px-3 py-2 text-right">Net M&IE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mieDayRows.map((d: any) => (
                  <tr key={d.id} className={d.firstLast ? "bg-blue-50/40" : ""}>
                    <td className="px-3 py-1.5 text-gray-500">{d.dayNumber}</td>
                    <td className="px-3 py-1.5">{formatDate(d.date)}</td>
                    <td className="px-3 py-1.5">{d.city || "—"}</td>
                    <td className="px-3 py-1.5 text-right">${Number(d.gsaRate ?? 0).toFixed(0)}</td>
                    <td className="px-3 py-1.5 text-center">{d.firstLast ? "✓" : ""}</td>
                    <td className="px-3 py-1.5 text-center">{d.breakfast ? "✓" : ""}</td>
                    <td className="px-3 py-1.5 text-center">{d.lunch ? "✓" : ""}</td>
                    <td className="px-3 py-1.5 text-center">{d.dinner ? "✓" : ""}</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-green-700">${Number(d.gsaNet ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                  <td colSpan={8} className="px-3 py-2 text-right">Total M&IE</td>
                  <td className="px-3 py-2 text-right text-green-700">${gsaMieTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Grand total */}
        <div className="border-t-2 border-gray-900 pt-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">Grand Total — Invoice 1 (GSA)</p>
            <div className="flex gap-4 text-xs text-gray-500 mt-1">
              <span>Transport: ${totalTransport.toFixed(2)}</span>
              <span>Accommodation: ${totalAccom.toFixed(2)}</span>
              <span>Other: ${totalOther.toFixed(2)}</span>
              <span>M&IE: ${gsaMieTotal.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-3xl font-bold">${grandTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* ── INVOICE 2 — HARDSHIP ── */}
      {hardship && (
        <div id="invoice-hardship" className="bg-white border border-purple-200 rounded-lg p-8 space-y-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-purple-900">Invoice 2 — Hardship Allowance</h1>
              <p className="text-sm text-purple-500 mt-0.5">BGP Holding (US) LLC</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-lg">{form.referenceNumber}</p>
              <p className="text-xs text-gray-500">Date: {formatDate(form.postSubmittedAt ?? form.updatedAt)}</p>
              {hardship.paidAt && (
                <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 border border-green-300 rounded-full px-2 py-0.5 font-medium">
                  Paid {formatDate(hardship.paidAt)}{hardship.paidNote ? ` · ${hardship.paidNote}` : ""}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-purple-100 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Field label="Employee" value={form.empNameSnap ?? form.employee?.name} />
            <Field label="Employee ID" value={form.empIdSnap ?? form.employee?.empId} />
            <Field label="Destination" value={[form.outCity, form.outCountry].filter(Boolean).join(", ")} />
            <Field label="Trip Dates" value={`${formatDate(form.outDepDate)} → ${formatDate(form.inArrDate)}`} />
          </div>

          {hardshipDays.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-purple-700 mb-2">Hardship Allowance Breakdown</h2>
              <p className="text-xs text-gray-500 mb-3">Rate = GSA × 1.15 (sales tax) × 1.22 (tip) · First/Last day −15% · Lunch/Dinner −35% · Premium = Hardship − GSA</p>
              <table className="w-full text-xs border border-purple-200 rounded overflow-hidden">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Day</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">City / State</th>
                    <th className="px-3 py-2 text-right">GSA Rate</th>
                    <th className="px-3 py-2 text-center">1st/Last</th>
                    <th className="px-3 py-2 text-center">Lunch</th>
                    <th className="px-3 py-2 text-center">Dinner</th>
                    <th className="px-3 py-2 text-right">GSA Net</th>
                    <th className="px-3 py-2 text-right">Hardship Gross</th>
                    <th className="px-3 py-2 text-right text-purple-700">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100">
                  {hardshipDays.map((d: any) => (
                    <tr key={d.id} className={d.firstLast ? "bg-purple-50/40" : ""}>
                      <td className="px-3 py-1.5 text-gray-500">{d.dayNumber}</td>
                      <td className="px-3 py-1.5">{formatDate(d.date)}</td>
                      <td className="px-3 py-1.5">{d.city || "—"}</td>
                      <td className="px-3 py-1.5 text-right">${Number(d.gsaRate ?? 0).toFixed(0)}</td>
                      <td className="px-3 py-1.5 text-center">{d.firstLast ? "✓" : ""}</td>
                      <td className="px-3 py-1.5 text-center">{d.lunch ? "✓" : ""}</td>
                      <td className="px-3 py-1.5 text-center">{d.dinner ? "✓" : ""}</td>
                      <td className="px-3 py-1.5 text-right">${Number(d.gsaNet ?? 0).toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-right">${Number(d.hardshipGross ?? 0).toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-right font-semibold text-purple-700">${Number(d.hardshipPremium ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-purple-50 font-semibold border-t-2 border-purple-300">
                    <td colSpan={9} className="px-3 py-2 text-right">Total Hardship Premium</td>
                    <td className="px-3 py-2 text-right text-purple-700">${hardshipTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t-2 border-purple-900 pt-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-lg text-purple-900">Total — Invoice 2 (Hardship)</p>
              <p className="text-xs text-purple-500 mt-1">This amount is in addition to Invoice 1 (GSA)</p>
            </div>
            <p className="text-3xl font-bold text-purple-900">${hardshipTotal.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || "—"}</p>
    </div>
  );
}
