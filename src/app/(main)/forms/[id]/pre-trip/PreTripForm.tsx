"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PreTripSchema, type PreTripFormData } from "@/lib/validations";
import { COUNTRIES, TRANSPORT_TYPES, ACCOMMODATION_TYPES } from "@/lib/constants";
import { getMieBreakdown } from "@/lib/gsa";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Send, AlertCircle, FlaskConical, ChevronDown, ChevronRight, Plus } from "lucide-react";

interface Props { form: any; user: any; rates: any[]; isReadOnly: boolean }

type Entity = "US" | "TH"

const EMPTY_EXPENSE = (phase: string, section: string, lineNumber: number) => ({
  phase, section, lineNumber, expenseType: "", expenseDate: "", workDetails: "", amountLocalFx: undefined, fxRateBot: undefined, amountThb: undefined,
});

export function PreTripForm({ form, user, rates, isReadOnly }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [retracting, setRetracting] = useState(false);
  const [entity, setEntity] = useState<Entity>("US");
  const [, setSelectedArea] = useState<string>(form.costOfLivingArea ?? "");
  const [perDiemRate, setPerDiemRate] = useState<number>(0);
  const [citySearch, setCitySearch] = useState<string>(form.outCity ?? "");
  const [selectedRateId, setSelectedRateId] = useState<string>(form.perDiemRateId ?? "");
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [mieDeductions, setMieDeductions] = useState({ firstLast: 0, noBreakfast: 0, noLunch: 0, noDinner: 0 });
  const [openSections, setOpenSections] = useState({ transport: true, accommodation: true, other: true });
  const savedTransport = form.expenseLines?.filter((l: any) => l.phase === "PRE" && l.section === "TRANSPORTATION" && (l.expenseType || l.amountLocalFx)).length ?? 0;
  const savedAccom = form.expenseLines?.filter((l: any) => l.phase === "PRE" && l.section === "ACCOMMODATION" && (l.expenseType || l.amountLocalFx)).length ?? 0;
  const savedOther = form.expenseLines?.filter((l: any) => l.phase === "PRE" && l.section === "OTHER" && (l.expenseType || l.amountLocalFx)).length ?? 0;
  const [rowCounts, setRowCounts] = useState({ transport: Math.max(1, savedTransport), accommodation: Math.max(1, savedAccom), other: Math.max(1, savedOther) });
  const toggleSection = (s: keyof typeof openSections) => setOpenSections(p => ({ ...p, [s]: !p[s] }));
  const addRow = (s: keyof typeof rowCounts) => setRowCounts(p => ({ ...p, [s]: p[s] + 1 }));
  const [accomBreakfast, setAccomBreakfast] = useState<boolean[]>(Array(20).fill(false));
  const [zipLookupResult, setZipLookupResult] = useState<any>(null);
  const [zipLooking, setZipLooking] = useState(false);

  const isUS = entity === "US";

  const preLines = form.expenseLines?.filter((l: any) => l.phase === "PRE") ?? [];
  const getLine = (section: string, num: number) =>
    preLines.find((l: any) => l.section === section && l.lineNumber === num);

  const defaultValues: Partial<PreTripFormData> = {
    purpose: form.purpose ?? "",
    objective: form.objective ?? "",
    costChargedTo: form.costChargedTo ?? "",
    costCenter: form.costCenter ?? "",
    outCity: form.outCity ?? "",
    outCountry: form.outCountry ?? "",
    outAirline: form.outAirline ?? "",
    outFlightNo: form.outFlightNo ?? "",
    outDepDate: form.outDepDate ? form.outDepDate.toISOString?.().slice(0, 10) ?? form.outDepDate : "",
    outDepTime: form.outDepTime ?? "",
    outArrDate: form.outArrDate ? form.outArrDate.toISOString?.().slice(0, 10) ?? form.outArrDate : "",
    outArrTime: form.outArrTime ?? "",
    inCity: form.inCity ?? "",
    inCountry: form.inCountry ?? "",
    inAirline: form.inAirline ?? "",
    inFlightNo: form.inFlightNo ?? "",
    inDepDate: form.inDepDate ? form.inDepDate.toISOString?.().slice(0, 10) ?? form.inDepDate : "",
    inDepTime: form.inDepTime ?? "",
    inArrDate: form.inArrDate ? form.inArrDate.toISOString?.().slice(0, 10) ?? form.inArrDate : "",
    inArrTime: form.inArrTime ?? "",
    totalTripDays: form.totalTripDays ?? 0,
    costOfLivingArea: form.costOfLivingArea ?? undefined,
    botFxRate: form.botFxRate ? Number(form.botFxRate) : undefined,
    expenseLines: [
      ...[1,2,3,4,5].map((n) => { const l = getLine("TRANSPORTATION", n); return l ? { ...l, amountLocalFx: l.amountLocalFx ? Number(l.amountLocalFx) : undefined, fxRateBot: l.fxRateBot ? Number(l.fxRateBot) : undefined, expenseDate: l.expenseDate ? new Date(l.expenseDate).toISOString().slice(0,10) : "" } : EMPTY_EXPENSE("PRE","TRANSPORTATION",n); }),
      ...[1,2,3,4,5].map((n) => { const l = getLine("ACCOMMODATION", n); return l ? { ...l, amountLocalFx: l.amountLocalFx ? Number(l.amountLocalFx) : undefined, fxRateBot: l.fxRateBot ? Number(l.fxRateBot) : undefined, expenseDate: l.expenseDate ? new Date(l.expenseDate).toISOString().slice(0,10) : "" } : EMPTY_EXPENSE("PRE","ACCOMMODATION",n); }),
      ...[1,2,3,4,5].map((n) => { const l = getLine("OTHER", n); return l ? { ...l, amountLocalFx: l.amountLocalFx ? Number(l.amountLocalFx) : undefined, fxRateBot: l.fxRateBot ? Number(l.fxRateBot) : undefined, expenseDate: l.expenseDate ? new Date(l.expenseDate).toISOString().slice(0,10) : "" } : EMPTY_EXPENSE("PRE","OTHER",n); }),
    ],
  };

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PreTripFormData>({
    resolver: zodResolver(PreTripSchema),
    defaultValues: defaultValues as PreTripFormData,
  });

  const watchLines = watch("expenseLines") ?? [];
  const watchDays = watch("totalTripDays") ?? 0;
  const watchFxRate = watch("botFxRate") ?? 0;
  const watchArea = watch("costOfLivingArea");
  const watchOutDepDate = watch("outDepDate");
  const watchInArrDate = watch("inArrDate");

  // Auto-calculate total trip days from departure → return arrival
  useEffect(() => {
    if (watchOutDepDate && watchInArrDate) {
      const dep = new Date(watchOutDepDate);
      const arr = new Date(watchInArrDate);
      const diff = Math.round((arr.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0) setValue("totalTripDays", diff + 1);
    }
  }, [watchOutDepDate, watchInArrDate]);

  // Auto-set First & Last Day deduction — always 2 days (or 1 for single-day trips)
  useEffect(() => {
    const days = Number(watchDays) || 0;
    if (days > 0) {
      setMieDeductions(p => ({ ...p, firstLast: Math.min(2, days) }));
    }
  }, [watchDays]);

  // Auto-update breakfast deduction from accommodation rows with breakfast included
  useEffect(() => {
    let breakfastNights = 0;
    for (let i = 0; i < rowCounts.accommodation; i++) {
      if (!accomBreakfast[i]) continue;
      const checkIn = watchLines[5 + i]?.expenseDate;
      const checkOut = watchLines[5 + i]?.workDetails; // workDetails stores check-out date for accommodation
      if (checkIn && checkOut && checkOut.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const nights = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
        if (nights > 0) breakfastNights += nights;
      }
    }
    const days = Number(watchDays) || 0;
    setMieDeductions(p => ({ ...p, noBreakfast: Math.min(breakfastNights, days) }));
  }, [accomBreakfast, watchLines, rowCounts.accommodation, watchDays]);

  // City rates (for US) and area rates (international)
  const cityRates = rates.filter((r: any) => r.city);
  const areaRates = rates.filter((r: any) => r.area);

  const nonStandardRates = cityRates.filter((r: any) => !r.city?.toLowerCase().includes("standard"));
  const standardRate = cityRates.find((r: any) => r.city?.toLowerCase().includes("standard"));

  const filteredCityRates = citySearch.trim().length > 0
    ? nonStandardRates.filter((r: any) =>
        r.city.toLowerCase().includes(citySearch.toLowerCase()) ||
        r.state.toLowerCase().includes(citySearch.toLowerCase())
      )
    : nonStandardRates;

  useEffect(() => {
    if (isUS) {
      const rate = cityRates.find((r: any) => r.id === selectedRateId);
      setPerDiemRate(rate ? Number(rate.usdPerDay) : 0);
    } else {
      const rate = areaRates.find((r: any) => r.area === watchArea);
      setPerDiemRate(rate ? Number(rate.usdPerDay) : 0);
    }
  }, [watchArea, selectedRateId, isUS, rates]);

  useEffect(() => {
    setValue("costChargedTo", entity === "US" ? "BGP Holding (US) LLC" : "B.Grimm Power PCL");
    setValue("costCenter", user.department ?? "");
  }, [entity]);

  const mieTotalUsd = isUS && selectedRate?.mieTotal
    ? (() => {
        const full = Number(selectedRate.mieTotal);
        const days = Number(watchDays) || 0;
        const gross = days * full
          - mieDeductions.firstLast * (full - Number(selectedRate.mieFirstLast))
          - mieDeductions.noBreakfast * Number(selectedRate.mieBreakfast)
          - mieDeductions.noLunch * Number(selectedRate.mieLunch)
          - mieDeductions.noDinner * Number(selectedRate.mieDinner);
        return Math.max(0, gross);
      })()
    : 0;
  const perDiemUsd = isUS ? mieTotalUsd : Number(watchDays) * perDiemRate;
  const perDiemThb = perDiemUsd * Number(watchFxRate);

  const transportLines = watchLines.slice(0, 5);
  const accommodationLines = watchLines.slice(5, 10);
  const otherLines = watchLines.slice(10, 15);

  function calcThb(line: any) {
    const amt = Number(line?.amountLocalFx ?? 0);
    if (isUS) return amt;
    const fx = Number(line?.fxRateBot ?? 0);
    return amt * fx;
  }

  const totalTransportThb = transportLines.reduce((sum, l) => sum + calcThb(l), 0);
  const totalAccomThb = accommodationLines.reduce((sum, l) => sum + calcThb(l), 0);
  const totalOtherThb = otherLines.reduce((sum, l) => sum + calcThb(l), 0);
  const totalThb = totalTransportThb + totalAccomThb + totalOtherThb;

  async function save(data: PreTripFormData) {
    setSaving(true);
    const res = await fetch(`/api/forms/${form.id}/pre-trip`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, entity, action: "SAVE" }),
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: "Saved", description: "Pre-Trip saved as draft" });
    } else {
      const err = await res.json();
      toast({ variant: "destructive", title: "Error", description: err.error ?? "Save failed" });
    }
  }

  async function submit(data: PreTripFormData) {
    setSubmitting(true);
    const res = await fetch(`/api/forms/${form.id}/pre-trip`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, entity, action: "SUBMIT" }),
    });
    setSubmitting(false);
    if (res.ok) {
      toast({ title: "Submitted", description: "Pre-Trip submitted for approval" });
      router.push(`/forms/${form.id}`);
    } else {
      const err = await res.json();
      toast({ variant: "destructive", title: "Error", description: err.error ?? "Submit failed" });
    }
  }

  function fillDummy() {
    setEntity("US");
    setValue("purpose", "Business Development");
    setValue("objective", "Attend annual supplier conference, negotiate Q3 contracts, and conduct site visits with key partners in New York.");
    setValue("costChargedTo", "BGP-Operations");
    setValue("costCenter", "CC-1001");
    // Outgoing flight: Bangkok → New York
    setValue("outCity", "New York");
    setValue("outCountry", "United States");
    setValue("outAirline", "Thai Airways");
    setValue("outFlightNo", "TG911");
    setValue("outDepDate", "2026-08-01");
    setValue("outDepTime", "23:00");
    setValue("outArrDate", "2026-08-02");
    setValue("outArrTime", "06:30");
    // Return flight: New York → Bangkok
    setValue("inCity", "Bangkok");
    setValue("inCountry", "Thailand");
    setValue("inAirline", "Thai Airways");
    setValue("inFlightNo", "TG912");
    setValue("inDepDate", "2026-08-07");
    setValue("inDepTime", "11:00");
    setValue("inArrDate", "2026-08-08");
    setValue("inArrTime", "23:45");
    // Days auto-calculated from dates above (8 days), but set explicitly
    setValue("totalTripDays", 8);
    // Transportation (indices 0–4)
    setValue("expenseLines.0.expenseType", "Flight");
    setValue("expenseLines.0.expenseDate", "2026-08-01");
    setValue("expenseLines.0.workDetails", "BKK → JFK return ticket (Thai Airways TG911/TG912)");
    setValue("expenseLines.0.amountLocalFx", 1800);
    setValue("expenseLines.1.expenseType", "Taxi");
    setValue("expenseLines.1.expenseDate", "2026-08-02");
    setValue("expenseLines.1.workDetails", "JFK airport to hotel");
    setValue("expenseLines.1.amountLocalFx", 85);
    setValue("expenseLines.2.expenseType", "Taxi");
    setValue("expenseLines.2.expenseDate", "2026-08-07");
    setValue("expenseLines.2.workDetails", "Hotel to JFK airport");
    setValue("expenseLines.2.amountLocalFx", 85);
    // Accommodation (indices 5–9): check-in date in expenseDate, check-out in workDetails
    setValue("expenseLines.5.expenseType", "Hotel");
    setValue("expenseLines.5.expenseDate", "2026-08-02");   // check-in
    setValue("expenseLines.5.workDetails", "2026-08-07");   // check-out
    setValue("expenseLines.5.amountLocalFx", 1750);
    setAccomBreakfast(prev => { const a = [...prev]; a[0] = false; return a; });
    setRowCounts(p => ({ ...p, accommodation: 1, transport: 3 }));
    // Other expenses (indices 10–14)
    setValue("expenseLines.10.expenseType", "Conference fee");
    setValue("expenseLines.10.expenseDate", "2026-08-03");
    setValue("expenseLines.10.workDetails", "Annual supplier summit registration");
    setValue("expenseLines.10.amountLocalFx", 350);
    setValue("expenseLines.11.expenseType", "Business meal");
    setValue("expenseLines.11.expenseDate", "2026-08-04");
    setValue("expenseLines.11.workDetails", "Working dinner with supplier team");
    setValue("expenseLines.11.amountLocalFx", 120);
    setRowCounts(p => ({ ...p, other: 2 }));
    setCitySearch("New York");
    toast({ title: "Test data filled", description: "NYC trip · 8 days · Aug 1–8 2026" });
  }

  async function retract() {
    setRetracting(true);
    const res = await fetch(`/api/forms/${form.id}/retract`, { method: "POST" });
    setRetracting(false);
    if (res.ok) {
      router.refresh();
      toast({ title: "Retracted", description: "You can now edit and resubmit" });
    }
  }

  const profileIncomplete = !user.position || !user.department;

  return (
    <form className="space-y-6 max-w-5xl">
      {/* Entity switcher */}
      {!isReadOnly && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">Billing Entity:</span>
          <div className="flex rounded-lg border border-blue-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setEntity("US")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${entity === "US" ? "bg-blue-600 text-white" : "bg-white text-blue-700 hover:bg-blue-50"}`}
            >
              🇺🇸 BGP Holding (US) LLC
            </button>
            {process.env.NEXT_PUBLIC_SHOW_TH_ENTITY === "true" && (
              <button
                type="button"
                onClick={() => setEntity("TH")}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${entity === "TH" ? "bg-blue-600 text-white" : "bg-white text-blue-700 hover:bg-blue-50"}`}
              >
                🇹🇭 B.Grimm Power PCL
              </button>
            )}
          </div>
          <span className="text-xs text-blue-600">
            {isUS ? "USD amounts, city-based per diem, no FX conversion" : "Local currency → THB via BOT FX rate, area-based per diem"}
          </span>
        </div>
      )}
      {isReadOnly && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border rounded-lg text-sm text-gray-600">
          <span className="font-medium">Entity:</span>
          <span>{entity === "US" ? "🇺🇸 US Entity (USD)" : "🇹🇭 Thailand Entity (THB)"}</span>
        </div>
      )}

      {profileIncomplete && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Your profile is incomplete. Please update your profile before submitting.
        </div>
      )}
      {form.preRejectionNote && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">Returned with notes:</p>
          <p className="mt-1">{form.preRejectionNote}</p>
        </div>
      )}

      {/* Section 1 — Employee Info */}
      <Card>
        <CardHeader><CardTitle>Section 1 — Employee Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          {[
            ["Emp. ID", user.empId], ["Name", user.name], ["Position", user.position],
            ["Grade", user.grade], ["Department", user.department], ["Division", user.division],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="font-medium">{value || <span className="text-red-500">Not set</span>}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Section 2 — Trip Details */}
      <Card>
        <CardHeader><CardTitle>Section 2 — Trip&apos;s Detail</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium text-sm mb-3 text-gray-700">Outgoing (Destination / Host Country)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <F label="City" error={errors.outCity?.message} disabled={isReadOnly}>
                <Input {...register("outCity")} placeholder="Bangkok" disabled={isReadOnly} />
              </F>
              <F label="Country" error={errors.outCountry?.message} disabled={isReadOnly}>
                <CountrySelect name="outCountry" register={register} setValue={setValue} watch={watch} disabled={isReadOnly} />
              </F>
              <F label="Airline"><Input {...register("outAirline")} placeholder="Thai Airways" disabled={isReadOnly} /></F>
              <F label="Flight No."><Input {...register("outFlightNo")} placeholder="TG101" disabled={isReadOnly} /></F>
              <F label="Departure Date" error={errors.outDepDate?.message}><Input type="date" {...register("outDepDate")} disabled={isReadOnly} /></F>
              <F label="Departure Time"><Input type="time" {...register("outDepTime")} disabled={isReadOnly} /></F>
              <F label="Arrival Date" error={errors.outArrDate?.message}><Input type="date" {...register("outArrDate")} disabled={isReadOnly} /></F>
              <F label="Arrival Time"><Input type="time" {...register("outArrTime")} disabled={isReadOnly} /></F>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-sm mb-3 text-gray-700">Incoming (Return / Home Country)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <F label="City" error={errors.inCity?.message}><Input {...register("inCity")} placeholder="Home city" disabled={isReadOnly} /></F>
              <F label="Country" error={errors.inCountry?.message}>
                <CountrySelect name="inCountry" register={register} setValue={setValue} watch={watch} disabled={isReadOnly} />
              </F>
              <F label="Airline"><Input {...register("inAirline")} disabled={isReadOnly} /></F>
              <F label="Flight No."><Input {...register("inFlightNo")} disabled={isReadOnly} /></F>
              <F label="Departure Date" error={errors.inDepDate?.message}><Input type="date" {...register("inDepDate")} disabled={isReadOnly} /></F>
              <F label="Departure Time"><Input type="time" {...register("inDepTime")} disabled={isReadOnly} /></F>
              <F label="Arrival Date" error={errors.inArrDate?.message}><Input type="date" {...register("inArrDate")} disabled={isReadOnly} /></F>
              <F label="Arrival Time"><Input type="time" {...register("inArrTime")} disabled={isReadOnly} /></F>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3 — Purpose */}
      <Card>
        <CardHeader><CardTitle>Section 3 — Business Trip Purpose</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <F label="Purpose" error={errors.purpose?.message}>
              <Input {...register("purpose")} disabled={isReadOnly} />
            </F>
            <F label="Cost Charged To"><Input {...register("costChargedTo")} disabled={isReadOnly} /></F>
            <F label="Cost Center"><Input {...register("costCenter")} disabled={isReadOnly} /></F>
          </div>
          <F label="Objective" error={errors.objective?.message}>
            <Textarea {...register("objective")} rows={4} placeholder="Describe objective, inviting organisation, need for trip, business benefits..." disabled={isReadOnly} />
          </F>
        </CardContent>
      </Card>

      {/* Section 4 — Expenses */}
      <Card>
        <CardHeader><CardTitle>Section 4 — Estimated Expenses</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ExpenseTable
            title="Transportation"
            lines={transportLines}
            offset={0}
            tableType="transport"
            open={openSections.transport}
            onToggle={() => toggleSection("transport")}
            rowCount={rowCounts.transport}
            onAddRow={() => addRow("transport")}
            register={register}
            watch={watch}
            setValue={setValue}
            isReadOnly={isReadOnly}
            calcThb={calcThb}
            isUS={isUS}
          />
          <ExpenseTable
            title="Accommodation"
            lines={accommodationLines}
            offset={5}
            tableType="accommodation"
            open={openSections.accommodation}
            onToggle={() => toggleSection("accommodation")}
            rowCount={rowCounts.accommodation}
            onAddRow={() => addRow("accommodation")}
            register={register}
            watch={watch}
            setValue={setValue}
            isReadOnly={isReadOnly}
            calcThb={calcThb}
            isUS={isUS}
            accomBreakfast={accomBreakfast}
            onBreakfastToggle={(i: number) => setAccomBreakfast(p => { const n = [...p]; n[i] = !n[i]; return n; })}
          />
          <ExpenseTable
            title="Other Expenses"
            lines={otherLines}
            offset={10}
            tableType="other"
            open={openSections.other}
            onToggle={() => toggleSection("other")}
            rowCount={rowCounts.other}
            onAddRow={() => addRow("other")}
            register={register}
            watch={watch}
            setValue={setValue}
            isReadOnly={isReadOnly}
            calcThb={calcThb}
            isUS={isUS}
          />
          <div className="text-right text-sm font-medium">
            Total ({isUS ? "USD" : "THB"}): <span className="text-lg font-bold ml-2">{totalThb.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Section 5 — Per Diem */}
      <Card>
        <CardHeader><CardTitle>Section 5 — Estimated Per Diem (Overnight Stay Only)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            <F label="Total Days on Trip">
              <Input type="number" min={0} {...register("totalTripDays")} disabled={isReadOnly} />
            </F>

            {isUS ? (
              <div className="col-span-2 space-y-1">
                <Label>City, State, or ZIP (US Per Diem)</Label>
                <div className="relative">
                  <Input
                    placeholder="Search city, state, or ZIP code..."
                    value={citySearch}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setCitySearch(val);
                      setSelectedRateId("");
                      setSelectedRate(null);
                      setPerDiemRate(0);
                      setZipLookupResult(null);
                      if (/^\d{5}$/.test(val.trim())) {
                        setZipLooking(true);
                        try {
                          // Check local DB first, fall back to live GSA API
                          const res = await fetch(`/api/gsa/zip/${val.trim()}`);
                          if (res.ok) setZipLookupResult(await res.json());
                          else setZipLookupResult({ error: true });
                        } catch { setZipLookupResult({ error: true }); }
                        setZipLooking(false);
                      }
                    }}
                    disabled={isReadOnly}
                    className={selectedRateId ? "pr-8 border-green-400 bg-green-50" : ""}
                  />
                  {selectedRateId && !isReadOnly && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                      onClick={() => { setSelectedRateId(""); setSelectedRate(null); setCitySearch(""); setPerDiemRate(0); setZipLookupResult(null); }}
                    >×</button>
                  )}
                </div>
                {zipLooking && <p className="text-xs text-gray-400">Looking up ZIP…</p>}
                {zipLookupResult && !zipLookupResult.error && !selectedRateId && (
                  <div className="border rounded-md bg-white shadow-sm z-10 relative">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() => {
                        const r = zipLookupResult;
                        const bd = getMieBreakdown(Number(r.usdPerDay));
                        const syntheticRate = { id: `zip-${r.zip}`, city: r.city, state: r.state, usdPerDay: r.usdPerDay, mieTotal: r.usdPerDay, mieFirstLast: Math.round(r.usdPerDay * 0.75), mieBreakfast: bd.breakfast, mieLunch: bd.lunch, mieDinner: bd.dinner, mieIncidental: bd.incidentals };
                        setSelectedRateId(`zip-${r.zip}`);
                        setSelectedRate(syntheticRate);
                        setCitySearch(`${r.city}, ${r.state} (${r.zip})`);
                        setPerDiemRate(r.usdPerDay);
                        setZipLookupResult(null);
                      }}
                    >
                      <span className="font-medium">{zipLookupResult.city}, {zipLookupResult.state}</span>
                      <span className="ml-2 text-gray-500">${Number(zipLookupResult.usdPerDay).toFixed(0)}/day M&IE</span>
                      <span className="ml-2 text-xs text-gray-400">ZIP {zipLookupResult.zip}</span>
                    </button>
                  </div>
                )}
                {zipLookupResult?.error && !selectedRateId && (
                  <p className="text-xs text-red-400">No GSA rate found for this ZIP code.</p>
                )}
                {!zipLookupResult && citySearch && !isReadOnly && filteredCityRates.length > 0 && !selectedRateId && (
                  <div className="border rounded-md bg-white shadow-sm max-h-40 overflow-y-auto z-10 relative">
                    {filteredCityRates.map((r: any) => (
                      <button
                        key={r.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0"
                        onClick={() => {
                          const mie = Number(r.mieTotal ?? r.usdPerDay);
                          const bd = getMieBreakdown(mie);
                          setSelectedRateId(r.id);
                          setSelectedRate({ ...r, mieTotal: mie, mieFirstLast: r.mieFirstLast ?? Math.round(mie * 0.75), mieBreakfast: r.mieBreakfast ?? bd.breakfast, mieLunch: r.mieLunch ?? bd.lunch, mieDinner: r.mieDinner ?? bd.dinner, mieIncidental: r.mieIncidental ?? bd.incidentals });
                          setCitySearch(`${r.city}, ${r.state}`);
                          setPerDiemRate(Number(r.usdPerDay));
                        }}
                      >
                        <span className="font-medium">{r.city}, {r.state}</span>
                        <span className="ml-2 text-gray-500">${Number(r.usdPerDay).toFixed(0)}/day</span>
                      </button>
                    ))}
                  </div>
                )}
                {!zipLookupResult && citySearch && !isReadOnly && !selectedRateId && filteredCityRates.length === 0 && citySearch.length >= 2 && (() => {
                  return (
                    <div className="px-1 space-y-1">
                      <p className="text-xs text-gray-400">
                        This city may not have a specific GSA rate. Cities within unlisted counties use the standard CONUS rate.
                      </p>
                      {standardRate && (
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline font-medium"
                          onClick={() => {
                            const sr = standardRate!;
                            const mie = Number(sr.mieTotal ?? sr.usdPerDay);
                            const bd = getMieBreakdown(mie);
                            setSelectedRateId(sr.id);
                            setSelectedRate({ ...sr, mieTotal: mie, mieFirstLast: sr.mieFirstLast ?? Math.round(mie * 0.75), mieBreakfast: sr.mieBreakfast ?? bd.breakfast, mieLunch: sr.mieLunch ?? bd.lunch, mieDinner: sr.mieDinner ?? bd.dinner, mieIncidental: sr.mieIncidental ?? bd.incidentals });
                            setCitySearch(`${citySearch} (Standard Rate)`);
                            setPerDiemRate(Number(sr.usdPerDay));
                          }}
                        >
                          Use Standard CONUS Rate — ${Number(standardRate.usdPerDay).toFixed(0)}/day M&IE
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <F label="Area">
                <Select
                  value={watchArea ?? ""}
                  onValueChange={(v) => setValue("costOfLivingArea", v as any)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                  <SelectContent>
                    {areaRates.map((r: any) => (
                      <SelectItem key={r.area} value={r.area}>
                        {r.area.charAt(0) + r.area.slice(1).toLowerCase()} — ${Number(r.usdPerDay).toFixed(0)}/day
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
            )}

            <F label="Rate (USD/Day)">
              <Input value={perDiemRate > 0 ? `${perDiemRate} USD` : "—"} readOnly className="bg-gray-50" />
            </F>
            {!isUS && (
              <F label="BOT FX Rate">
                <Input type="number" step="0.01" {...register("botFxRate")} disabled={isReadOnly} />
              </F>
            )}
            <div className="text-sm space-y-1">
              <p className="text-gray-500">Total Per Diem</p>
              <p className="font-bold">{perDiemUsd.toFixed(2)} USD</p>
              {!isUS && <p className="font-bold text-blue-700">{perDiemThb.toFixed(2)} THB</p>}
            </div>
          </div>
          <p className="text-xs text-gray-500">Counting from first to last day, overnight stays only</p>

          {/* M&IE Deduction Calculator */}
          {isUS && selectedRate?.mieTotal && (() => {
            const r = selectedRate;
            const full = Number(r.mieTotal);
            const days = Number(watchDays) || 0;
            const gross = days * full;
            // Only First & Last Day is known at pre-trip stage; meals are handled in post-trip
            const deductRows: { key: keyof typeof mieDeductions; label: string; rate: number; hint: string }[] = [
              { key: "firstLast", label: "First & Last Day (−25%)", rate: full - Number(r.mieFirstLast), hint: "Departure & return days are paid at 75%" },
            ];
            const totalDeductions = deductRows.reduce((s, row) => s + (mieDeductions[row.key] || 0) * row.rate, 0);

            return (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">M&IE Per Diem Calculator</p>
                  <p className="text-xs text-gray-400">Full rate ${full}/day · B ${Number(r.mieBreakfast).toFixed(0)} · L ${Number(r.mieLunch).toFixed(0)} · D ${Number(r.mieDinner).toFixed(0)} · Inc ${Number(r.mieIncidental).toFixed(0)}</p>
                </div>
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-center px-4 py-2 font-medium text-gray-700 w-24">Days</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-700">Deduction</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-700">Rate/Day</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-700">Amount</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-400 font-normal">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-blue-50">
                      <td className="px-4 py-2 text-center font-medium">{days}</td>
                      <td className="px-4 py-2 font-medium text-blue-800">Full Day Rate</td>
                      <td className="px-4 py-2 text-right font-mono">${full.toFixed(0)}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">${gross.toFixed(0)}</td>
                      <td className="px-4 py-2 text-xs text-gray-400">Gross per diem</td>
                    </tr>
                    {deductRows.map(({ key, label, rate, hint }) => {
                      const d = mieDeductions[key] || 0;
                      const over = days > 0 && d > days;
                      return (
                        <tr key={key} className={over ? "bg-orange-50" : d > 0 ? "bg-red-50/40" : ""}>
                          <td className="px-4 py-2 text-center text-gray-700 font-medium">{d}</td>
                          <td className="px-4 py-2 text-red-700">{label}</td>
                          <td className="px-4 py-2 text-right font-mono text-red-600">−${rate.toFixed(0)}</td>
                          <td className="px-4 py-2 text-right font-mono text-red-600">{d > 0 ? `−$${(d * rate).toFixed(0)}` : "—"}</td>
                          <td className="px-4 py-2 text-xs text-gray-400">{over ? <span className="text-orange-600 font-medium">⚠ Exceeds total days</span> : hint}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 font-bold">Net Total ({days} days)</td>
                      <td className="px-4 py-2 text-right font-bold text-blue-700">${mieTotalUsd.toFixed(0)}</td>
                      <td className="px-4 py-2 text-xs text-gray-400">−${totalDeductions.toFixed(0)} deducted</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex items-center gap-3 pt-2">
          {process.env.NEXT_PUBLIC_DEV_TOOLS === "true" && (
            <Button type="button" variant="outline" onClick={fillDummy} className="border-dashed border-purple-400 text-purple-600 hover:bg-purple-50">
              <FlaskConical className="h-4 w-4 mr-2" />Fill Dev Data
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleSubmit(save)} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button type="button" onClick={handleSubmit(submit)} disabled={submitting}>
            <Send className="h-4 w-4 mr-2" />{submitting ? "Submitting..." : "Submit for Approval"}
          </Button>
        </div>
      )}
      {form.status === "PRE_SUBMITTED" && (
        <div className="flex items-center gap-3 pt-2">
          <p className="text-sm text-gray-500">This form is locked pending approval.</p>
          <Button type="button" variant="outline" onClick={retract} disabled={retracting}>
            {retracting ? "Retracting..." : "Retract to Edit"}
          </Button>
        </div>
      )}
    </form>
  );
}

function F({ label, children, error, disabled }: { label: string; children: React.ReactNode; error?: string; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className={disabled ? "text-gray-400" : ""}>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function CountrySelect({ name, setValue, watch, disabled }: any) {
  const value = watch(name) ?? "";
  return (
    <Select value={value} onValueChange={(v) => setValue(name, v)} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
      <SelectContent>
        {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ExpenseTable({ title, lines, offset, tableType, open, onToggle, rowCount, onAddRow, register, watch, setValue, isReadOnly, calcThb, isUS, accomBreakfast, onBreakfastToggle }: any) {
  const rows = Array.from({ length: rowCount }, (_, i) => i);
  const totalThb = rows.reduce((s: number, i: number) => s + calcThb(watch(`expenseLines.${offset + i}`) ?? lines[i] ?? {}), 0);
  const isAccom = tableType === "accommodation";
  const colSpanTotal = isUS ? (isAccom ? 5 : 4) : 6;
  const typeOptions = tableType === "transport" ? TRANSPORT_TYPES : isAccom ? ACCOMMODATION_TYPES : null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="font-medium text-sm">{title}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Total: {totalThb.toFixed(2)} {isUS ? "USD" : "THB"}</span>
          {open ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
        </div>
      </button>
      {open && (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse border-t border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-2 py-1.5 text-left w-8">#</th>
              <th className="border border-gray-300 px-2 py-1.5 text-left w-36">Type</th>
              {isAccom ? (
                <>
                  <th className="border border-gray-300 px-2 py-1.5 text-left w-28">Check-in</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left w-28">Check-out</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-center w-20">Breakfast</th>
                </>
              ) : (
                <>
                  <th className="border border-gray-300 px-2 py-1.5 text-left w-28">Date</th>
                  <th className="border border-gray-300 px-2 py-1.5 text-left">Work Details</th>
                </>
              )}
              <th className="border border-gray-300 px-2 py-1.5 text-right w-28">Amount ({isUS ? "USD" : "Local Fx"})</th>
              {!isUS && <th className="border border-gray-300 px-2 py-1.5 text-right w-24">FX Rate (BOT)</th>}
              {!isUS && <th className="border border-gray-300 px-2 py-1.5 text-right w-28">Amount (THB)</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const idx = offset + i;
              const line = lines[i] ?? {};
              const thb = calcThb(watch(`expenseLines.${idx}`) ?? line);
              const checkIn = watch(`expenseLines.${idx}.expenseDate`) ?? "";
              const checkOut = watch(`expenseLines.${idx}.workDetails`) ?? "";
              const nights = isAccom && checkIn && checkOut && checkOut.match(/^\d{4}-\d{2}-\d{2}$/)
                ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
                : null;
              const hasBF = accomBreakfast?.[i] ?? false;
              return (
                <tr key={i} className={hasBF ? "bg-amber-50/40" : ""}>
                  <td className="border border-gray-300 px-2 py-1 text-gray-500">{i + 1}</td>
                  <td className="border border-gray-300 px-1 py-1">
                    {typeOptions ? (
                      <Select
                        value={watch(`expenseLines.${idx}.expenseType`) ?? ""}
                        onValueChange={(v) => setValue(`expenseLines.${idx}.expenseType`, v)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>
                          {typeOptions.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input className="h-7 text-xs" {...register(`expenseLines.${idx}.expenseType`)} disabled={isReadOnly} placeholder="Description" />
                    )}
                  </td>
                  {isAccom ? (
                    <>
                      <td className="border border-gray-300 px-1 py-1">
                        <Input type="date" className="h-7 text-xs" {...register(`expenseLines.${idx}.expenseDate`)} disabled={isReadOnly} />
                      </td>
                      <td className="border border-gray-300 px-1 py-1">
                        <div className="space-y-0.5">
                          <Input type="date" className="h-7 text-xs" {...register(`expenseLines.${idx}.workDetails`)} disabled={isReadOnly} />
                          {nights !== null && nights > 0 && (
                            <p className="text-center text-xs text-blue-600 font-medium">{nights} night{nights !== 1 ? "s" : ""}</p>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <input
                            type="checkbox"
                            checked={hasBF}
                            onChange={() => onBreakfastToggle?.(i)}
                            disabled={isReadOnly}
                            className="h-4 w-4 accent-amber-500"
                          />
                          {hasBF && nights && nights > 0 && (
                            <span className="text-amber-600 text-xs">{nights}×BF</span>
                          )}
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border border-gray-300 px-1 py-1">
                        <Input type="date" className="h-7 text-xs" {...register(`expenseLines.${idx}.expenseDate`)} disabled={isReadOnly} />
                      </td>
                      <td className="border border-gray-300 px-1 py-1">
                        <Input className="h-7 text-xs" {...register(`expenseLines.${idx}.workDetails`)} disabled={isReadOnly} />
                      </td>
                    </>
                  )}
                  <td className="border border-gray-300 px-1 py-1">
                    <Input type="number" step="0.01" className="h-7 text-xs text-right" {...register(`expenseLines.${idx}.amountLocalFx`)} disabled={isReadOnly} />
                  </td>
                  {!isUS && (
                    <td className="border border-gray-300 px-1 py-1">
                      <Input type="number" step="0.01" className="h-7 text-xs text-right" {...register(`expenseLines.${idx}.fxRateBot`)} disabled={isReadOnly} />
                    </td>
                  )}
                  {!isUS && (
                    <td className="border border-gray-300 px-2 py-1 text-right bg-gray-50">{thb > 0 ? thb.toFixed(2) : "—"}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-medium">
              <td colSpan={colSpanTotal} className="border border-gray-300 px-2 py-1.5 text-right">Total ({isUS ? "USD" : "THB"})</td>
              <td className="border border-gray-300 px-2 py-1.5 text-right">{totalThb.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      )}
      {!isReadOnly && open && (
        <div className="px-4 py-2 border-t border-gray-200 bg-white">
          <button type="button" onClick={onAddRow} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
            <Plus className="h-3 w-3" />Add row
          </button>
        </div>
      )}
    </div>
  );
}
