"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PreTripSchema, type PreTripFormData } from "@/lib/validations";
import { COUNTRIES, TRANSPORT_TYPES } from "@/lib/constants";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Send, AlertCircle, FlaskConical } from "lucide-react";

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
  const [entity, setEntity] = useState<Entity>(form.entity ?? "TH");
  const [selectedArea, setSelectedArea] = useState<string>(form.costOfLivingArea ?? "");
  const [perDiemRate, setPerDiemRate] = useState<number>(0);
  const [citySearch, setCitySearch] = useState<string>(form.outCity ?? "");
  const [selectedRateId, setSelectedRateId] = useState<string>(form.perDiemRateId ?? "");

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
      ...[1, 2, 3, 4, 5].map((n) => {
        const l = getLine("TRANSPORTATION", n);
        return l
          ? { ...l, amountLocalFx: l.amountLocalFx ? Number(l.amountLocalFx) : undefined, fxRateBot: l.fxRateBot ? Number(l.fxRateBot) : undefined, expenseDate: l.expenseDate ? new Date(l.expenseDate).toISOString().slice(0, 10) : "" }
          : EMPTY_EXPENSE("PRE", "TRANSPORTATION", n);
      }),
      ...[1, 2, 3, 4, 5].map((n) => {
        const l = getLine("OTHER", n);
        return l
          ? { ...l, amountLocalFx: l.amountLocalFx ? Number(l.amountLocalFx) : undefined, fxRateBot: l.fxRateBot ? Number(l.fxRateBot) : undefined, expenseDate: l.expenseDate ? new Date(l.expenseDate).toISOString().slice(0, 10) : "" }
          : EMPTY_EXPENSE("PRE", "OTHER", n);
      }),
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

  // City rates (for US) and area rates (international)
  const cityRates = rates.filter((r: any) => r.city);
  const areaRates = rates.filter((r: any) => r.area);

  const filteredCityRates = citySearch.trim().length > 0
    ? cityRates.filter((r: any) =>
        r.city.toLowerCase().includes(citySearch.toLowerCase()) ||
        r.state.toLowerCase().includes(citySearch.toLowerCase())
      )
    : cityRates;

  useEffect(() => {
    if (isUS) {
      const rate = cityRates.find((r: any) => r.id === selectedRateId);
      setPerDiemRate(rate ? Number(rate.usdPerDay) : 0);
    } else {
      const rate = areaRates.find((r: any) => r.area === watchArea);
      setPerDiemRate(rate ? Number(rate.usdPerDay) : 0);
    }
  }, [watchArea, selectedRateId, isUS, rates]);

  const perDiemUsd = Number(watchDays) * perDiemRate;
  const perDiemThb = perDiemUsd * Number(watchFxRate);

  const transportLines = watchLines.slice(0, 5);
  const otherLines = watchLines.slice(5, 10);

  function calcThb(line: any) {
    const amt = Number(line?.amountLocalFx ?? 0);
    if (isUS) return amt;
    const fx = Number(line?.fxRateBot ?? 0);
    return amt * fx;
  }

  const totalTransportThb = transportLines.reduce((sum, l) => sum + calcThb(l), 0);
  const totalOtherThb = otherLines.reduce((sum, l) => sum + calcThb(l), 0);
  const totalThb = totalTransportThb + totalOtherThb;

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
    setEntity("TH");
    setValue("purpose", "Business Development");
    setValue("objective", "Attend annual supplier conference, negotiate Q3 contracts, and conduct site visits with key partners.");
    setValue("costChargedTo", "BGP-Operations");
    setValue("costCenter", "CC-1001");
    setValue("outCity", "New York");
    setValue("outCountry", "United States");
    setValue("outAirline", "Thai Airways");
    setValue("outFlightNo", "TG911");
    setValue("outDepDate", "2026-08-01");
    setValue("outDepTime", "23:00");
    setValue("outArrDate", "2026-08-02");
    setValue("outArrTime", "06:30");
    setValue("inCity", "Bangkok");
    setValue("inCountry", "Thailand");
    setValue("inAirline", "Thai Airways");
    setValue("inFlightNo", "TG912");
    setValue("inDepDate", "2026-08-07");
    setValue("inDepTime", "11:00");
    setValue("inArrDate", "2026-08-08");
    setValue("inArrTime", "23:45");
    setValue("totalTripDays", 7);
    setValue("costOfLivingArea", "HIGHEST");
    setSelectedArea("HIGHEST");
    setValue("botFxRate", 35.50);
    // Transportation lines
    setValue("expenseLines.0.expenseType", "Flight");
    setValue("expenseLines.0.expenseDate", "2026-08-01");
    setValue("expenseLines.0.workDetails", "BKK → JFK return ticket");
    setValue("expenseLines.0.amountLocalFx", 1800);
    setValue("expenseLines.0.fxRateBot", 35.50);
    setValue("expenseLines.1.expenseType", "Taxi");
    setValue("expenseLines.1.expenseDate", "2026-08-02");
    setValue("expenseLines.1.workDetails", "JFK airport to hotel");
    setValue("expenseLines.1.amountLocalFx", 80);
    setValue("expenseLines.1.fxRateBot", 35.50);
    // Other expense lines
    setValue("expenseLines.5.expenseType", "Hotel");
    setValue("expenseLines.5.expenseDate", "2026-08-02");
    setValue("expenseLines.5.workDetails", "5 nights accommodation NYC");
    setValue("expenseLines.5.amountLocalFx", 1200);
    setValue("expenseLines.5.fxRateBot", 35.50);
    setValue("expenseLines.6.expenseType", "Conference fee");
    setValue("expenseLines.6.expenseDate", "2026-08-03");
    setValue("expenseLines.6.workDetails", "Annual supplier summit registration");
    setValue("expenseLines.6.amountLocalFx", 350);
    setValue("expenseLines.6.fxRateBot", 35.50);
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
            <button
              type="button"
              onClick={() => setEntity("TH")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${entity === "TH" ? "bg-blue-600 text-white" : "bg-white text-blue-700 hover:bg-blue-50"}`}
            >
              🇹🇭 B.Grimm Power PCL
            </button>
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
          <p className="text-xs text-gray-500 italic">The accommodation rate is inclusive of breakfast and applicable tax(es).</p>
        </CardContent>
      </Card>

      {/* Section 4 — Expenses */}
      <Card>
        <CardHeader><CardTitle>Section 4 — Estimated Expenses</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <ExpenseTable
            title="Transportation"
            lines={transportLines}
            offset={0}
            isTransport
            register={register}
            watch={watch}
            setValue={setValue}
            isReadOnly={isReadOnly}
            calcThb={calcThb}
            isUS={isUS}
          />
          <ExpenseTable
            title="Other Expenses"
            lines={otherLines}
            offset={5}
            isTransport={false}
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
                <Label>City (US Per Diem)</Label>
                <Input
                  placeholder="Search city or state..."
                  value={citySearch}
                  onChange={(e) => { setCitySearch(e.target.value); setSelectedRateId(""); setPerDiemRate(0); }}
                  disabled={isReadOnly}
                />
                {citySearch && !isReadOnly && filteredCityRates.length > 0 && !selectedRateId && (
                  <div className="border rounded-md bg-white shadow-sm max-h-40 overflow-y-auto z-10 relative">
                    {filteredCityRates.map((r: any) => (
                      <button
                        key={r.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0"
                        onClick={() => { setSelectedRateId(r.id); setCitySearch(`${r.city}, ${r.state}`); setPerDiemRate(Number(r.usdPerDay)); }}
                      >
                        <span className="font-medium">{r.city}, {r.state}</span>
                        <span className="ml-2 text-gray-500">${Number(r.usdPerDay).toFixed(0)}/day</span>
                      </button>
                    ))}
                  </div>
                )}
                {citySearch && !isReadOnly && filteredCityRates.length === 0 && (
                  <p className="text-xs text-gray-400 px-1">No city rates found. Ask admin to add this city.</p>
                )}
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
        </CardContent>
      </Card>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex items-center gap-3 pt-2">
          {process.env.NODE_ENV === "development" && (
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

function CountrySelect({ name, register, setValue, watch, disabled }: any) {
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

function ExpenseTable({ title, lines, offset, isTransport, register, watch, setValue, isReadOnly, calcThb, isUS }: any) {
  const totalThb = lines.reduce((s: number, l: any) => s + calcThb(l), 0);
  const colSpanTotal = isUS ? 4 : 6;
  return (
    <div>
      <h3 className="font-medium text-sm mb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-2 py-1.5 text-left w-8">#</th>
              <th className="border border-gray-300 px-2 py-1.5 text-left w-36">Type</th>
              <th className="border border-gray-300 px-2 py-1.5 text-left w-28">Date</th>
              <th className="border border-gray-300 px-2 py-1.5 text-left">Work Details</th>
              <th className="border border-gray-300 px-2 py-1.5 text-right w-28">Amount ({isUS ? "USD" : "Local Fx"})</th>
              {!isUS && <th className="border border-gray-300 px-2 py-1.5 text-right w-24">FX Rate (BOT)</th>}
              {!isUS && <th className="border border-gray-300 px-2 py-1.5 text-right w-28">Amount (THB)</th>}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4].map((i) => {
              const idx = offset + i;
              const line = lines[i] ?? {};
              const thb = calcThb(watch(`expenseLines.${idx}`) ?? line);
              return (
                <tr key={i}>
                  <td className="border border-gray-300 px-2 py-1 text-gray-500">{i + 1}</td>
                  <td className="border border-gray-300 px-1 py-1">
                    {isTransport ? (
                      <Select
                        value={watch(`expenseLines.${idx}.expenseType`) ?? ""}
                        onValueChange={(v) => setValue(`expenseLines.${idx}.expenseType`, v)}
                        disabled={isReadOnly}
                      >
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>
                          {TRANSPORT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input className="h-7 text-xs" {...register(`expenseLines.${idx}.expenseType`)} disabled={isReadOnly} placeholder="Description" />
                    )}
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <Input type="date" className="h-7 text-xs" {...register(`expenseLines.${idx}.expenseDate`)} disabled={isReadOnly} />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <Input className="h-7 text-xs" {...register(`expenseLines.${idx}.workDetails`)} disabled={isReadOnly} />
                  </td>
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
    </div>
  );
}
