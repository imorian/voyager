"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PostTripSchema, type PostTripFormData } from "@/lib/validations";
import { TRANSPORT_TYPES, ACCOMMODATION_TYPES } from "@/lib/constants";
import { getMieBreakdown } from "@/lib/gsa";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Send, Upload, X, Eye, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface Props { form: any; user: any; rates: any[]; isReadOnly: boolean }

interface DayRow {
  date: string;
  city: string;
  rateId: string;
  mieRate: number;
  firstLast: boolean;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

const EMPTY = (section: string, n: number) => ({
  phase: "POST", section, lineNumber: n,
  expenseType: "", expenseDate: "", workDetails: "",
  amountLocalFx: undefined, fxRateBot: undefined,
});

function buildDefaultDays(totalDays: number, depDate: string, defaultCity: string, defaultRate: any): DayRow[] {
  return Array.from({ length: totalDays }, (_, i) => {
    const date = depDate
      ? new Date(new Date(depDate).getTime() + i * 86400000).toISOString().slice(0, 10)
      : "";
    return {
      date,
      city: defaultCity ?? "",
      rateId: defaultRate?.id ?? "",
      mieRate: defaultRate ? Number(defaultRate.mieTotal ?? defaultRate.usdPerDay) : 0,
      firstLast: i === 0 || i === totalDays - 1,
      breakfast: false,
      lunch: false,
      dinner: false,
    };
  });
}

export function PostTripForm({ form, user, rates, isReadOnly }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLine, setUploadingLine] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Record<string, any[]>>({});

  const [openSections, setOpenSections] = useState({ transport: true, accommodation: true, other: true });
  const savedTransport = form.expenseLines?.filter((l: any) => l.section === "TRANSPORTATION" && (l.expenseType || l.amountLocalFx)).length ?? 0;
  const savedAccom = form.expenseLines?.filter((l: any) => l.section === "ACCOMMODATION" && (l.expenseType || l.amountLocalFx)).length ?? 0;
  const savedOther = form.expenseLines?.filter((l: any) => l.section === "OTHER" && (l.expenseType || l.amountLocalFx)).length ?? 0;
  const [rowCounts, setRowCounts] = useState({ transport: Math.max(1, savedTransport), accommodation: Math.max(1, savedAccom), other: Math.max(1, savedOther) });
  const toggleSection = (s: keyof typeof openSections) => setOpenSections(p => ({ ...p, [s]: !p[s] }));
  const addRow = (s: keyof typeof rowCounts) => setRowCounts(p => ({ ...p, [s]: Math.min(p[s] + 1, 20) }));

  // Per-day M&IE tracking
  const cityRates = rates.filter((r: any) => r.city);
  const nonStandardRates = cityRates.filter((r: any) => !r.city?.toLowerCase().includes("standard"));
  const standardRate = cityRates.find((r: any) => r.city?.toLowerCase().includes("standard"));

  const [days, setDays] = useState<DayRow[]>([]);
  const [citySearches, setCitySearches] = useState<string[]>([]);
  const [zipResults, setZipResults] = useState<(any | null)[]>([]);
  const [zipLookingIdx, setZipLookingIdx] = useState<number | null>(null);

  const postLines = form.expenseLines?.filter((l: any) => l.phase === "POST") ?? [];
  const preLines = form.expenseLines?.filter((l: any) => l.phase === "PRE") ?? [];
  // Fall back to pre-trip line data when no post line exists yet (first time opening post-trip)
  const getLine = (section: string, num: number) => {
    const post = postLines.find((l: any) => l.section === section && l.lineNumber === num);
    if (post) return post;
    const pre = preLines.find((l: any) => l.section === section && l.lineNumber === num);
    if (pre) return { ...pre, phase: "POST" }; // carry over pre-trip data as starting point
    return null;
  };

  const totalDaysFromForm = form.totalTripDays ?? 0;
  const depDate = form.outDepDate ? new Date(form.outDepDate).toISOString().slice(0, 10) : "";
  const defaultCity = form.outCity ?? "";

  // Initialize day rows on mount — auto-match GSA rate from pre-trip city
  useEffect(() => {
    const n = totalDaysFromForm || 0;
    if (n > 0) {
      const autoRate = defaultCity
        ? cityRates.find((r: any) =>
            r.city?.toLowerCase() === defaultCity.toLowerCase() ||
            defaultCity.toLowerCase().includes(r.city?.toLowerCase() ?? "___")
          ) ?? standardRate ?? null
        : null;
      const builtDays = buildDefaultDays(n, depDate, defaultCity, autoRate);
      if (autoRate) {
        const label = `${autoRate.city}, ${autoRate.state}`;
        setCitySearches(Array(n).fill(label));
      } else {
        setCitySearches(Array(n).fill(defaultCity));
      }
      setDays(builtDays);
      setZipResults(Array(n).fill(null));
    }
  }, []);

  const defaultValues: PostTripFormData = {
    totalTripDays: form.totalTripDays ?? 0,
    costOfLivingArea: form.costOfLivingArea ?? undefined,
    botFxRate: form.botFxRate ? Number(form.botFxRate) : undefined,
    expenseLines: [
      ...[1,2,3,4,5].map((n) => { const l = getLine("TRANSPORTATION", n); return l ? { ...l, amountLocalFx: l.amountLocalFx ? Number(l.amountLocalFx) : undefined, fxRateBot: l.fxRateBot ? Number(l.fxRateBot) : undefined, expenseDate: l.expenseDate ? new Date(l.expenseDate).toISOString().slice(0,10) : "" } : EMPTY("TRANSPORTATION", n); }),
      ...[1,2,3,4,5].map((n) => { const l = getLine("ACCOMMODATION", n); return l ? { ...l, amountLocalFx: l.amountLocalFx ? Number(l.amountLocalFx) : undefined, fxRateBot: l.fxRateBot ? Number(l.fxRateBot) : undefined, expenseDate: l.expenseDate ? new Date(l.expenseDate).toISOString().slice(0,10) : "" } : EMPTY("ACCOMMODATION", n); }),
      ...[1,2,3,4,5].map((n) => { const l = getLine("OTHER", n); return l ? { ...l, amountLocalFx: l.amountLocalFx ? Number(l.amountLocalFx) : undefined, fxRateBot: l.fxRateBot ? Number(l.fxRateBot) : undefined, expenseDate: l.expenseDate ? new Date(l.expenseDate).toISOString().slice(0,10) : "" } : EMPTY("OTHER", n); }),
    ],
  };

  useEffect(() => {
    const init: Record<string, any[]> = {};
    postLines.forEach((l: any) => {
      if (l.receipts?.length) init[`${l.section}-${l.lineNumber}`] = l.receipts;
    });
    setReceipts(init);
  }, []);

  const { register, handleSubmit, watch, setValue } = useForm<PostTripFormData>({
    resolver: zodResolver(PostTripSchema),
    defaultValues,
  });

  const watchLines = watch("expenseLines") ?? [];
  const watchDays = watch("totalTripDays") ?? 0;

  // Rebuild day rows when total days changes
  useEffect(() => {
    const n = Number(watchDays) || 0;
    if (n <= 0) { setDays([]); setCitySearches([]); setZipResults([]); return; }
    setDays(prev => {
      const next = buildDefaultDays(n, depDate, defaultCity, null);
      // preserve existing edits for rows that already exist
      return next.map((row, i) => prev[i] ? { ...row, ...prev[i], date: row.date } : row);
    });
    setCitySearches(prev => { const a = Array(n).fill(defaultCity); prev.forEach((v, i) => { if (i < n) a[i] = v; }); return a; });
    setZipResults(prev => { const a = Array(n).fill(null); prev.forEach((v, i) => { if (i < n) a[i] = v; }); return a; });
  }, [watchDays]);

  function updateDay(i: number, patch: Partial<DayRow>) {
    setDays(prev => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  }

  async function lookupZip(i: number, zip: string) {
    setZipLookingIdx(i);
    try {
      const res = await fetch(`/api/gsa/zip/${zip}`);
      if (res.ok) {
        const data = await res.json();
        setZipResults(prev => { const a = [...prev]; a[i] = data; return a; });
      }
    } catch {}
    setZipLookingIdx(null);
  }

  function selectRate(i: number, r: any) {
    const mie = Number(r.mieTotal ?? r.usdPerDay);
    updateDay(i, { rateId: r.id, mieRate: mie, city: r.city ? `${r.city}, ${r.state}` : citySearches[i] });
    setCitySearches(prev => { const a = [...prev]; a[i] = r.city ? `${r.city}, ${r.state}` : a[i]; return a; });
    setZipResults(prev => { const a = [...prev]; a[i] = null; return a; });
  }

  // Calculate GSA M&IE totals from day rows
  const mieTotalUsd = days.reduce((sum, d) => {
    if (!d.mieRate) return sum;
    const bd = getMieBreakdown(d.mieRate);
    let amount = d.firstLast ? d.mieRate * 0.75 : d.mieRate;
    if (d.breakfast) amount -= bd.breakfast;
    if (d.lunch) amount -= bd.lunch;
    if (d.dinner) amount -= bd.dinner;
    return sum + Math.max(0, amount);
  }, 0);

  // Calculate Hardship Allowance — the PREMIUM over GSA (hardship amount minus GSA net)
  // Applied rate = GSA Meal × 1.15 × 1.22; First/Last −15%, Lunch/Dinner −35%, no breakfast deduction
  function calcHardshipDay(d: DayRow): number {
    if (!d.mieRate) return 0;
    const applied = d.mieRate * 1.15 * 1.22;
    let hardship = d.firstLast ? applied * 0.85 : applied;
    if (d.lunch) hardship -= applied * 0.35;
    if (d.dinner) hardship -= applied * 0.35;
    hardship = Math.max(0, hardship);
    // GSA net for same day
    const bd = getMieBreakdown(d.mieRate);
    let gsa = d.firstLast ? d.mieRate * 0.75 : d.mieRate;
    if (d.breakfast) gsa -= bd.breakfast;
    if (d.lunch) gsa -= bd.lunch;
    if (d.dinner) gsa -= bd.dinner;
    gsa = Math.max(0, gsa);
    return Math.max(0, hardship - gsa);
  }
  const hardshipTotal = days.reduce((sum, d) => sum + calcHardshipDay(d), 0);

  function calcUsd(line: any) { const v = Number(line?.amountLocalFx ?? 0); return isNaN(v) ? 0 : v; }

  const transportLines = (watchLines ?? []).slice(0, rowCounts.transport);
  const accommodationLines = (watchLines ?? []).slice(5, 5 + rowCounts.accommodation);
  const otherLines = (watchLines ?? []).slice(10, 10 + rowCounts.other);

  const totalTransport = transportLines.reduce((s, l) => s + calcUsd(l), 0);
  const totalAccom = accommodationLines.reduce((s, l) => s + calcUsd(l), 0);
  const totalOther = otherLines.reduce((s, l) => s + calcUsd(l), 0);
  const grandTotal = totalTransport + totalAccom + totalOther + (isNaN(mieTotalUsd) ? 0 : mieTotalUsd);

  async function uploadReceipt(file: File, section: string, lineNumber: number) {
    const key = `${section}-${lineNumber}`;
    setUploadingLine(key);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tripFormId", form.id);
    formData.append("section", section);
    formData.append("lineNumber", String(lineNumber));
    const res = await fetch("/api/receipts", { method: "POST", body: formData });
    setUploadingLine(null);
    if (res.ok) {
      const data = await res.json();
      setReceipts((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), data] }));
      toast({ title: "Receipt uploaded" });
    } else {
      toast({ variant: "destructive", title: "Upload failed" });
    }
  }

  async function deleteReceipt(receiptId: string, key: string) {
    const res = await fetch(`/api/receipts/${receiptId}`, { method: "DELETE" });
    if (res.ok) setReceipts((prev) => ({ ...prev, [key]: prev[key].filter((r) => r.id !== receiptId) }));
  }

  async function save(data: PostTripFormData) {
    setSaving(true);
    const res = await fetch(`/api/forms/${form.id}/post-trip`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, action: "SAVE" }),
    });
    setSaving(false);
    if (res.ok) toast({ title: "Saved" });
    else { const e = await res.json(); toast({ variant: "destructive", title: e.error ?? "Save failed" }); }
  }

  async function submit(data: PostTripFormData) {
    setSubmitting(true);
    const res = await fetch(`/api/forms/${form.id}/post-trip`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, action: "SUBMIT" }),
    });
    setSubmitting(false);
    if (res.ok) { toast({ title: "Submitted" }); router.push(`/forms/${form.id}`); }
    else { const e = await res.json(); toast({ variant: "destructive", title: e.error ?? "Submit failed" }); }
  }

  return (
    <form className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Post-Trip Expense Claim · BGP Holding (US) LLC</p>
          <h1 className="text-xl font-bold font-mono">{form.referenceNumber}</h1>
        </div>
      </div>

      {form.postRejectionNote && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">Returned with notes:</p>
          <p className="mt-1">{form.postRejectionNote}</p>
        </div>
      )}

      {/* Pre-Trip summary */}
      <Card>
        <CardHeader><CardTitle>Trip Summary (Pre-Trip Approved)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <RF label="Employee" value={form.empNameSnap ?? form.employee?.name} />
          <RF label="Destination" value={[form.outCity, form.outCountry].filter(Boolean).join(", ")} />
          <RF label="Departure" value={form.outDepDate ? new Date(form.outDepDate).toLocaleDateString() : ""} />
          <RF label="Return" value={form.inArrDate ? new Date(form.inArrDate).toLocaleDateString() : ""} />
          <RF label="Purpose" value={form.purpose} />
          <RF label="Cost Center" value={form.costCenter} />
          <RF label="Cost Charged To" value={form.costChargedTo} />
          <RF label="Pre-Trip Approved Days" value={form.totalTripDays?.toString()} />
        </CardContent>
      </Card>

      {/* Section 4 — Actual Expenses */}
      <Card>
        <CardHeader><CardTitle>Section 4 — Actual Expenses (USD)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            Valid receipts required for all expense lines with an amount.
          </p>
          <ExpenseTable title="Transportation" lines={transportLines} offset={0} section="TRANSPORTATION" tableType="transport"
            open={openSections.transport} onToggle={() => toggleSection("transport")} rowCount={rowCounts.transport} onAddRow={() => addRow("transport")}
            register={register} watch={watch} setValue={setValue} isReadOnly={isReadOnly} calcUsd={calcUsd}
            receipts={receipts} onUpload={uploadReceipt} onDelete={deleteReceipt} uploadingLine={uploadingLine} />
          <ExpenseTable title="Accommodation" lines={accommodationLines} offset={5} section="ACCOMMODATION" tableType="accommodation"
            open={openSections.accommodation} onToggle={() => toggleSection("accommodation")} rowCount={rowCounts.accommodation} onAddRow={() => addRow("accommodation")}
            register={register} watch={watch} setValue={setValue} isReadOnly={isReadOnly} calcUsd={calcUsd}
            receipts={receipts} onUpload={uploadReceipt} onDelete={deleteReceipt} uploadingLine={uploadingLine} />
          <ExpenseTable title="Other Expenses" lines={otherLines} offset={10} section="OTHER" tableType="other"
            open={openSections.other} onToggle={() => toggleSection("other")} rowCount={rowCounts.other} onAddRow={() => addRow("other")}
            register={register} watch={watch} setValue={setValue} isReadOnly={isReadOnly} calcUsd={calcUsd}
            receipts={receipts} onUpload={uploadReceipt} onDelete={deleteReceipt} uploadingLine={uploadingLine} />
          <div className="text-right text-sm text-gray-600 pt-2 border-t">
            Total Expenses: <span className="font-bold text-gray-900 ml-2">${(totalTransport + totalAccom + totalOther).toFixed(2)} USD</span>
          </div>
        </CardContent>
      </Card>

      {/* Section 5 — Day-by-day M&IE */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Section 5 — Actual M&IE Per Diem</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-600">Actual Days on Trip</Label>
              <Input type="number" min={0} className="w-24 h-8 text-sm"
                {...register("totalTripDays", { valueAsNumber: true })} disabled={isReadOnly} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {days.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Enter the number of actual days above to generate the M&IE table.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left font-medium text-gray-600 w-10">Day</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 w-28">Date</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">City / State</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600 w-20">GSA Rate</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600 w-16">1st/Last</th>
                      <th className="px-3 py-2 text-center font-medium text-amber-600 w-16">BF</th>
                      <th className="px-3 py-2 text-center font-medium text-amber-600 w-16">Lunch</th>
                      <th className="px-3 py-2 text-center font-medium text-amber-600 w-16">Dinner</th>
                      <th className="px-3 py-2 text-right font-medium text-green-700 w-20">Net M&IE</th>
                      <th className="px-3 py-2 text-right font-medium text-purple-700 w-24" title="Separate Invoice — does not include GSA M&IE">Hardship Only</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {days.map((d, i) => {
                      const bd = d.mieRate ? getMieBreakdown(d.mieRate) : null;
                      let net = d.mieRate ? (d.firstLast ? d.mieRate * 0.75 : d.mieRate) : 0;
                      if (bd) {
                        if (d.breakfast) net -= bd.breakfast;
                        if (d.lunch) net -= bd.lunch;
                        if (d.dinner) net -= bd.dinner;
                      }
                      net = Math.max(0, net);
                      const cs = citySearches[i] ?? "";
                      const zr = zipResults[i];
                      const filteredRates = cs.trim().length > 0
                        ? nonStandardRates.filter((r: any) => r.city?.toLowerCase().includes(cs.toLowerCase()) || r.state?.toLowerCase().includes(cs.toLowerCase()))
                        : [];

                      return (
                        <tr key={i} className={d.firstLast ? "bg-blue-50/40" : i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="px-3 py-2 text-gray-500 font-medium">{i + 1}</td>
                          <td className="px-3 py-2">
                            <Input type="date" className="h-7 text-xs" value={d.date}
                              onChange={e => updateDay(i, { date: e.target.value })} disabled={isReadOnly} />
                          </td>
                          <td className="px-3 py-2 relative">
                            <div className="relative">
                              <Input className={`h-7 text-xs ${d.rateId ? "border-green-400 bg-green-50 pr-6" : ""}`}
                                value={cs}
                                placeholder="City, state or ZIP…"
                                onChange={async (e) => {
                                  const val = e.target.value;
                                  setCitySearches(prev => { const a = [...prev]; a[i] = val; return a; });
                                  updateDay(i, { rateId: "", mieRate: 0, city: val });
                                  setZipResults(prev => { const a = [...prev]; a[i] = null; return a; });
                                  if (/^\d{5}$/.test(val.trim())) lookupZip(i, val.trim());
                                }}
                                disabled={isReadOnly}
                              />
                              {d.rateId && !isReadOnly && (
                                <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                  onClick={() => { updateDay(i, { rateId: "", mieRate: 0 }); setCitySearches(prev => { const a = [...prev]; a[i] = ""; return a; }); }}>×</button>
                              )}
                            </div>
                            {zipLookingIdx === i && <p className="text-xs text-gray-400 mt-0.5">Looking up…</p>}
                            {zr && !zr.error && !d.rateId && (
                              <div className="absolute z-20 left-0 right-0 mt-0.5 border rounded-md bg-white shadow-lg">
                                <button type="button" className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50"
                                  onClick={() => {
                                    const bd2 = getMieBreakdown(Number(zr.usdPerDay));
                                    selectRate(i, { id: `zip-${zr.zip}`, city: zr.city, state: zr.state, usdPerDay: zr.usdPerDay, mieTotal: zr.usdPerDay, ...bd2 });
                                  }}>
                                  <span className="font-medium">{zr.city}, {zr.state}</span>
                                  <span className="ml-2 text-gray-500">${Number(zr.usdPerDay).toFixed(0)}/day</span>
                                </button>
                              </div>
                            )}
                            {!zr && cs && !d.rateId && filteredRates.length > 0 && !isReadOnly && (
                              <div className="absolute z-20 left-0 right-0 mt-0.5 border rounded-md bg-white shadow-lg max-h-32 overflow-y-auto">
                                {filteredRates.slice(0, 8).map((r: any) => (
                                  <button key={r.id} type="button" className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 border-b last:border-b-0"
                                    onClick={() => selectRate(i, r)}>
                                    <span className="font-medium">{r.city}, {r.state}</span>
                                    <span className="ml-2 text-gray-500">${Number(r.usdPerDay).toFixed(0)}/day</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {!zr && cs && !d.rateId && filteredRates.length === 0 && cs.length >= 2 && !isReadOnly && standardRate && (
                              <button type="button" className="text-xs text-blue-600 hover:underline mt-0.5"
                                onClick={() => selectRate(i, standardRate)}>
                                Use Standard CONUS (${Number(standardRate.usdPerDay).toFixed(0)}/day)
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            {d.mieRate ? `$${d.mieRate}` : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={d.firstLast} onChange={e => updateDay(i, { firstLast: e.target.checked })}
                              disabled={isReadOnly} className="h-4 w-4 accent-blue-500" />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={d.breakfast} onChange={e => updateDay(i, { breakfast: e.target.checked })}
                              disabled={isReadOnly} className="h-4 w-4 accent-amber-500" />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={d.lunch} onChange={e => updateDay(i, { lunch: e.target.checked })}
                              disabled={isReadOnly} className="h-4 w-4 accent-amber-500" />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={d.dinner} onChange={e => updateDay(i, { dinner: e.target.checked })}
                              disabled={isReadOnly} className="h-4 w-4 accent-amber-500" />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-green-700">
                            {d.mieRate ? `$${net.toFixed(2)}` : <span className="text-gray-300 font-normal">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-purple-700">
                            {d.mieRate ? `$${calcHardshipDay(d).toFixed(2)}` : <span className="text-gray-300 font-normal">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td colSpan={8} className="px-3 py-2 font-semibold text-sm text-gray-700">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-green-700 text-sm">${mieTotalUsd.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-bold text-purple-700 text-sm">${hardshipTotal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-xs text-gray-400">
                1st/Last day is auto-checked (75% rate applies). Check meals that were provided — they are deducted from the daily rate.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Hardship Allowance Summary — separate invoice */}
      {hardshipTotal > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Hardship Allowance</p>
              </div>
              <p className="text-3xl font-bold text-purple-900">${hardshipTotal.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grand Total — GSA only */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Grand Total — Invoice 1 (GSA)</p>
              <p className="text-xs text-blue-600 mt-0.5">Expenses + GSA M&IE Per Diem</p>
            </div>
            <p className="text-3xl font-bold text-blue-900">${grandTotal.toFixed(2)}</p>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-blue-700">
            <div className="bg-white/60 rounded p-2"><p className="text-blue-500">Transportation</p><p className="font-semibold">${totalTransport.toFixed(2)}</p></div>
            <div className="bg-white/60 rounded p-2"><p className="text-blue-500">Accommodation</p><p className="font-semibold">${totalAccom.toFixed(2)}</p></div>
            <div className="bg-white/60 rounded p-2"><p className="text-blue-500">Other</p><p className="font-semibold">${totalOther.toFixed(2)}</p></div>
            <div className="bg-white/60 rounded p-2"><p className="text-blue-500">M&IE Per Diem</p><p className="font-semibold">${mieTotalUsd.toFixed(2)}</p></div>
          </div>
        </CardContent>
      </Card>

      {!isReadOnly && (
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={handleSubmit(save)} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button type="button" onClick={handleSubmit(submit)} disabled={submitting}>
            <Send className="h-4 w-4 mr-2" />{submitting ? "Submitting..." : "Submit for Approval"}
          </Button>
        </div>
      )}
    </form>
  );
}

function RF({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-sm">{value || "—"}</p>
    </div>
  );
}

function ExpenseTable({ title, lines, offset, section, tableType, open, onToggle, rowCount, onAddRow, register, watch, setValue, isReadOnly, calcUsd, receipts, onUpload, onDelete, uploadingLine }: any) {
  const typeOptions = tableType === "transport" ? TRANSPORT_TYPES : tableType === "accommodation" ? ACCOMMODATION_TYPES : null;
  const total = Array.from({ length: rowCount }, (_, i) => { const v = Number((watch(`expenseLines.${offset + i}`) ?? {}).amountLocalFx ?? 0); return isNaN(v) ? 0 : v; }).reduce((s, v) => s + v, 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button type="button" className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-gray-400">({rowCount} rows)</span>
        </div>
        {total > 0 && <span className="text-sm font-semibold text-gray-700">${total.toFixed(2)}</span>}
      </button>
      {open && (
        <div className="divide-y divide-gray-100">
          <div className="grid grid-cols-[32px_1fr_120px_1fr_100px] gap-2 px-3 py-1.5 bg-gray-50 border-b text-xs text-gray-500 font-medium">
            <span>#</span><span>Type / Description</span><span>Date</span><span>Work Details</span><span className="text-right">Amount (USD)</span>
          </div>
          {Array.from({ length: rowCount }, (_, i) => {
            const idx = offset + i;
            const line = watch(`expenseLines.${idx}`) ?? {};
            const usd = calcUsd(line);
            const key = `${section}-${i + 1}`;
            const lineReceipts = receipts[key] ?? [];
            const hasAmount = usd > 0;
            return (
              <div key={i} className="px-3 py-2 space-y-2">
                <div className="grid grid-cols-[32px_1fr_120px_1fr_100px] gap-2 items-center">
                  <span className="text-xs text-gray-400 font-medium">{i + 1}</span>
                  {typeOptions ? (
                    <Select value={watch(`expenseLines.${idx}.expenseType`) ?? ""} onValueChange={(v) => setValue(`expenseLines.${idx}.expenseType`, v)} disabled={isReadOnly}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>{typeOptions.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input className="h-8 text-xs" {...register(`expenseLines.${idx}.expenseType`)} disabled={isReadOnly} placeholder="Description" />
                  )}
                  <Input type="date" className="h-8 text-xs" {...register(`expenseLines.${idx}.expenseDate`)} disabled={isReadOnly} />
                  <Input className="h-8 text-xs" {...register(`expenseLines.${idx}.workDetails`)} disabled={isReadOnly} placeholder="Details" />
                  <Input type="number" step="0.01" className="h-8 text-xs text-right" {...register(`expenseLines.${idx}.amountLocalFx`, { valueAsNumber: true })} disabled={isReadOnly} placeholder="0.00" />
                </div>
                {(hasAmount || lineReceipts.length > 0) && (
                  <div className="flex items-center gap-2 flex-wrap pl-8">
                    {lineReceipts.map((r: any) => (
                      <div key={r.id} className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs">
                        <Eye className="h-3 w-3" />
                        <a href={r.signedUrl ?? "#"} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{r.fileName}</a>
                        {!isReadOnly && <button type="button" onClick={() => onDelete(r.id, key)} className="text-red-400 hover:text-red-600 ml-1"><X className="h-3 w-3" /></button>}
                      </div>
                    ))}
                    {!isReadOnly && <ReceiptDropzone section={section} lineNumber={i + 1} onUpload={onUpload} uploading={uploadingLine === key} />}
                    {hasAmount && lineReceipts.length === 0 && isReadOnly && <span className="text-xs text-red-500">No receipt attached</span>}
                  </div>
                )}
              </div>
            );
          })}
          {!isReadOnly && rowCount < 20 && (
            <div className="px-3 py-2 bg-gray-50 border-t">
              <button type="button" onClick={onAddRow} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                <Plus className="h-3 w-3" /> Add row
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReceiptDropzone({ section, lineNumber, onUpload, uploading }: any) {
  const onDrop = useCallback((files: File[]) => {
    if (files[0]) onUpload(files[0], section, lineNumber);
  }, [section, lineNumber, onUpload]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "image/*": [], "application/pdf": [] }, maxSize: 10 * 1024 * 1024, multiple: false });
  return (
    <div {...getRootProps()} className={`flex items-center gap-1.5 rounded border border-dashed px-3 py-1.5 text-xs cursor-pointer transition-colors ${isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}>
      <input {...getInputProps()} />
      <Upload className="h-3 w-3" />
      {uploading ? "Uploading..." : "Attach receipt"}
    </div>
  );
}
