"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PostTripSchema, type PostTripFormData } from "@/lib/validations";
import { TRANSPORT_TYPES } from "@/lib/constants";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Send, Upload, X, Eye } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface Props { form: any; user: any; rates: any[]; isReadOnly: boolean }

export function PostTripForm({ form, user, rates, isReadOnly }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLine, setUploadingLine] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Record<string, any[]>>({});

  const postLines = form.expenseLines?.filter((l: any) => l.phase === "POST") ?? [];
  const preLines = form.expenseLines?.filter((l: any) => l.phase === "PRE") ?? [];

  const getLine = (section: string, num: number, phase = "POST") =>
    (phase === "POST" ? postLines : preLines).find((l: any) => l.section === section && l.lineNumber === num);

  const EMPTY = (section: string, n: number) => ({ phase: "POST", section, lineNumber: n, expenseType: "", expenseDate: "", workDetails: "", amountLocalFx: undefined, fxRateBot: undefined });

  const defaultValues: PostTripFormData = {
    totalTripDays: form.totalTripDays ?? 0,
    costOfLivingArea: form.costOfLivingArea ?? undefined,
    botFxRate: form.botFxRate ? Number(form.botFxRate) : undefined,
    expenseLines: [
      ...[1, 2, 3, 4, 5].map((n) => {
        const l = getLine("TRANSPORTATION", n);
        return l ? { ...l, amountLocalFx: l.amountLocalFx ? Number(l.amountLocalFx) : undefined, fxRateBot: l.fxRateBot ? Number(l.fxRateBot) : undefined, expenseDate: l.expenseDate ? new Date(l.expenseDate).toISOString().slice(0, 10) : "" } : EMPTY("TRANSPORTATION", n);
      }),
      ...[1, 2, 3, 4, 5].map((n) => {
        const l = getLine("OTHER", n);
        return l ? { ...l, amountLocalFx: l.amountLocalFx ? Number(l.amountLocalFx) : undefined, fxRateBot: l.fxRateBot ? Number(l.fxRateBot) : undefined, expenseDate: l.expenseDate ? new Date(l.expenseDate).toISOString().slice(0, 10) : "" } : EMPTY("OTHER", n);
      }),
    ],
  };

  // Initialize receipts from existing lines
  useEffect(() => {
    const init: Record<string, any[]> = {};
    postLines.forEach((l: any) => {
      if (l.receipts?.length) init[`${l.section}-${l.lineNumber}`] = l.receipts;
    });
    setReceipts(init);
  }, []);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PostTripFormData>({
    resolver: zodResolver(PostTripSchema),
    defaultValues,
  });

  const watchLines = watch("expenseLines") ?? [];
  const watchDays = watch("totalTripDays") ?? 0;
  const watchFxRate = watch("botFxRate") ?? 0;
  const watchArea = watch("costOfLivingArea");

  const perDiemRate = rates.find((r) => r.area === watchArea);
  const perDiemUsd = Number(watchDays) * (perDiemRate ? Number(perDiemRate.usdPerDay) : 0);
  const perDiemThb = perDiemUsd * Number(watchFxRate);

  function calcThb(line: any) { return Number(line?.amountLocalFx ?? 0) * Number(line?.fxRateBot ?? 0); }

  const transportLines = watchLines.slice(0, 5);
  const otherLines = watchLines.slice(5, 10);

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
    if (res.ok) {
      setReceipts((prev) => ({ ...prev, [key]: prev[key].filter((r) => r.id !== receiptId) }));
    }
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
          <p className="text-sm text-gray-500">Post-Trip Expense Claim</p>
          <h1 className="text-xl font-bold font-mono">{form.referenceNumber}</h1>
        </div>
      </div>

      {form.postRejectionNote && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">Returned with notes:</p>
          <p className="mt-1">{form.postRejectionNote}</p>
        </div>
      )}

      {/* Pre-Trip reference (read-only) */}
      <Card>
        <CardHeader><CardTitle>Trip Summary (from approved Pre-Trip)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <ReadField label="Destination" value={[form.outCity, form.outCountry].filter(Boolean).join(", ")} />
          <ReadField label="Departure" value={form.outDepDate ? new Date(form.outDepDate).toLocaleDateString() : ""} />
          <ReadField label="Return" value={form.inArrDate ? new Date(form.inArrDate).toLocaleDateString() : ""} />
          <ReadField label="Purpose" value={form.purpose} />
        </CardContent>
      </Card>

      {/* Actual Expenses */}
      <Card>
        <CardHeader><CardTitle>Section 4 — Actual Expenses</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            Valid receipt(s) required for reimbursement. Attach receipts to each expense line with an amount.
          </p>
          <PostExpenseTable
            title="Transportation"
            lines={transportLines}
            offset={0}
            isTransport
            register={register}
            watch={watch}
            setValue={setValue}
            isReadOnly={isReadOnly}
            calcThb={calcThb}
            receipts={receipts}
            onUpload={uploadReceipt}
            onDelete={deleteReceipt}
            uploadingLine={uploadingLine}
          />
          <PostExpenseTable
            title="Other Expenses"
            lines={otherLines}
            offset={5}
            isTransport={false}
            register={register}
            watch={watch}
            setValue={setValue}
            isReadOnly={isReadOnly}
            calcThb={calcThb}
            receipts={receipts}
            onUpload={uploadReceipt}
            onDelete={deleteReceipt}
            uploadingLine={uploadingLine}
          />
        </CardContent>
      </Card>

      {/* Per Diem */}
      <Card>
        <CardHeader><CardTitle>Section 5 — Actual Per Diem</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <Label>Total Days on Trip</Label>
              <Input type="number" min={0} {...register("totalTripDays")} disabled={isReadOnly} />
            </div>
            <div className="space-y-1">
              <Label>Area</Label>
              <Select value={watchArea ?? ""} onValueChange={(v) => setValue("costOfLivingArea", v as any)} disabled={isReadOnly}>
                <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                <SelectContent>
                  {["HIGHEST", "HIGH", "NORMAL", "UNSPECIFIED"].map((a) => (
                    <SelectItem key={a} value={a}>{a.charAt(0) + a.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Rate (USD/Day)</Label>
              <Input value={perDiemRate ? `${Number(perDiemRate.usdPerDay)} USD` : "—"} readOnly className="bg-gray-50" />
            </div>
            <div className="space-y-1">
              <Label>BOT FX Rate</Label>
              <Input type="number" step="0.01" {...register("botFxRate")} disabled={isReadOnly} />
            </div>
            <div className="text-sm space-y-1">
              <p className="text-gray-500">Total Per Diem</p>
              <p className="font-bold">{perDiemUsd.toFixed(2)} USD</p>
              <p className="font-bold text-blue-700">{perDiemThb.toFixed(2)} THB</p>
            </div>
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

function ReadField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}

function PostExpenseTable({ title, lines, offset, isTransport, register, watch, setValue, isReadOnly, calcThb, receipts, onUpload, onDelete, uploadingLine }: any) {
  return (
    <div>
      <h3 className="font-medium text-sm mb-2">{title}</h3>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => {
          const idx = offset + i;
          const line = watch(`expenseLines.${idx}`) ?? {};
          const thb = calcThb(line);
          const section = isTransport ? "TRANSPORTATION" : "OTHER";
          const key = `${section}-${i + 1}`;
          const lineReceipts = receipts[key] ?? [];
          const hasAmount = Number(line.amountLocalFx ?? 0) > 0;

          return (
            <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
                <div className="text-xs text-gray-400 font-medium pt-5">#{i + 1}</div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  {isTransport ? (
                    <Select value={watch(`expenseLines.${idx}.expenseType`) ?? ""} onValueChange={(v) => setValue(`expenseLines.${idx}.expenseType`, v)} disabled={isReadOnly}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>{TRANSPORT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input className="h-8 text-xs" {...register(`expenseLines.${idx}.expenseType`)} disabled={isReadOnly} placeholder="Description" />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" className="h-8 text-xs" {...register(`expenseLines.${idx}.expenseDate`)} disabled={isReadOnly} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Work Details</Label>
                  <Input className="h-8 text-xs" {...register(`expenseLines.${idx}.workDetails`)} disabled={isReadOnly} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Amount (Local)</Label>
                  <Input type="number" step="0.01" className="h-8 text-xs" {...register(`expenseLines.${idx}.amountLocalFx`)} disabled={isReadOnly} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">FX Rate</Label>
                  <Input type="number" step="0.01" className="h-8 text-xs" {...register(`expenseLines.${idx}.fxRateBot`)} disabled={isReadOnly} />
                </div>
              </div>
              {thb > 0 && (
                <div className="text-right text-xs text-gray-700">Amount (THB): <strong>{thb.toFixed(2)}</strong></div>
              )}
              {/* Receipt section */}
              {(hasAmount || lineReceipts.length > 0) && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    {lineReceipts.map((r: any) => (
                      <div key={r.id} className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs">
                        <Eye className="h-3 w-3" />
                        <a href={r.signedUrl ?? "#"} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{r.fileName}</a>
                        {!isReadOnly && (
                          <button type="button" onClick={() => onDelete(r.id, key)} className="text-red-400 hover:text-red-600 ml-1">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    {!isReadOnly && (
                      <ReceiptDropzone
                        section={section}
                        lineNumber={i + 1}
                        onUpload={onUpload}
                        uploading={uploadingLine === key}
                      />
                    )}
                    {hasAmount && lineReceipts.length === 0 && isReadOnly && (
                      <span className="text-xs text-red-500">No receipt</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReceiptDropzone({ section, lineNumber, onUpload, uploading }: any) {
  const onDrop = useCallback((files: File[]) => {
    if (files[0]) onUpload(files[0], section, lineNumber);
  }, [section, lineNumber, onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [], "application/pdf": [] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`flex items-center gap-1.5 rounded border border-dashed px-3 py-1.5 text-xs cursor-pointer transition-colors ${isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}
    >
      <input {...getInputProps()} />
      <Upload className="h-3 w-3" />
      {uploading ? "Uploading..." : "Attach receipt"}
    </div>
  );
}
