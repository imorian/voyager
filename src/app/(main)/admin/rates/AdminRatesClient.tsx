"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import { Edit, Plus, RefreshCw, Trash2, Upload } from "lucide-react";

interface Props { rates: any[] }

const EMPTY = {
  city: "", state: "", country: "US", fiscalYear: new Date().getFullYear(),
  // Lodging by month
  lodgingJan: "", lodgingFeb: "", lodgingMar: "", lodgingApr: "",
  lodgingMay: "", lodgingJun: "", lodgingJul: "", lodgingAug: "",
  lodgingSep: "", lodgingOct: "", lodgingNov: "", lodgingDec: "",
  // M&IE
  mieTotal: "", mieFirstLast: "", mieBreakfast: "", mieLunch: "", mieDinner: "", mieIncidental: "",
  usdPerDay: "",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function toNum(v: any) { const n = Number(v); return isNaN(n) || v === "" ? null : n; }

export function AdminRatesClient({ rates }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncYear, setSyncYear] = useState(new Date().getFullYear());
  const [importing, setImporting] = useState(false);
  const [zipCount, setZipCount] = useState<number | null>(null);

  function openCreate() { setEditing(null); setForm(EMPTY); setShowDialog(true); }
  function openEdit(r: any) {
    setEditing(r);
    setForm({
      city: r.city ?? "", state: r.state ?? "", country: r.country ?? "US",
      fiscalYear: r.fiscalYear ?? new Date().getFullYear(),
      lodgingJan: r.lodgingJan ?? "", lodgingFeb: r.lodgingFeb ?? "", lodgingMar: r.lodgingMar ?? "",
      lodgingApr: r.lodgingApr ?? "", lodgingMay: r.lodgingMay ?? "", lodgingJun: r.lodgingJun ?? "",
      lodgingJul: r.lodgingJul ?? "", lodgingAug: r.lodgingAug ?? "", lodgingSep: r.lodgingSep ?? "",
      lodgingOct: r.lodgingOct ?? "", lodgingNov: r.lodgingNov ?? "", lodgingDec: r.lodgingDec ?? "",
      mieTotal: r.mieTotal ?? "", mieFirstLast: r.mieFirstLast ?? "",
      mieBreakfast: r.mieBreakfast ?? "", mieLunch: r.mieLunch ?? "",
      mieDinner: r.mieDinner ?? "", mieIncidental: r.mieIncidental ?? "",
      usdPerDay: r.usdPerDay ? String(Number(r.usdPerDay)) : "",
    });
    setShowDialog(true);
  }

  function close() { setEditing(null); setForm(EMPTY); setShowDialog(false); }

  async function save() {
    setLoading(true);
    const url = editing ? `/api/admin/rates/${editing.id}` : "/api/admin/rates";
    const method = editing ? "PATCH" : "POST";
    const payload = {
      ...form,
      fiscalYear: toNum(form.fiscalYear),
      lodgingJan: toNum(form.lodgingJan), lodgingFeb: toNum(form.lodgingFeb), lodgingMar: toNum(form.lodgingMar),
      lodgingApr: toNum(form.lodgingApr), lodgingMay: toNum(form.lodgingMay), lodgingJun: toNum(form.lodgingJun),
      lodgingJul: toNum(form.lodgingJul), lodgingAug: toNum(form.lodgingAug), lodgingSep: toNum(form.lodgingSep),
      lodgingOct: toNum(form.lodgingOct), lodgingNov: toNum(form.lodgingNov), lodgingDec: toNum(form.lodgingDec),
      mieTotal: toNum(form.mieTotal), mieFirstLast: toNum(form.mieFirstLast),
      mieBreakfast: toNum(form.mieBreakfast), mieLunch: toNum(form.mieLunch),
      mieDinner: toNum(form.mieDinner), mieIncidental: toNum(form.mieIncidental),
      usdPerDay: toNum(form.usdPerDay) ?? toNum(form.mieTotal) ?? 0,
    };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setLoading(false);
    if (res.ok) {
      toast({ title: editing ? "Rate updated" : "Rate added" });
      close();
      router.refresh();
    } else {
      const e = await res.json();
      toast({ variant: "destructive", title: e.error ?? "Failed" });
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/admin/rates/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) { toast({ title: "Rate deleted" }); router.refresh(); }
    else toast({ variant: "destructive", title: "Failed to delete" });
  }

  async function importZip(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    toast({ title: "Importing ZIP rates…", description: "Parsing your Excel file, please wait." });
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/rates/import-zip", { method: "POST", body: fd });
    setImporting(false);
    e.target.value = "";
    if (res.ok) {
      const { imported } = await res.json();
      setZipCount(imported);
      toast({ title: "Import complete ✓", description: `${imported} ZIP code rates imported` });
    } else {
      const err = await res.json().catch(() => ({}));
      toast({ variant: "destructive", title: "Import failed", description: err.error ?? "Unknown error" });
    }
  }

  async function syncGsa() {
    setSyncing(true);
    toast({ title: `Syncing GSA rates for FY${syncYear}…`, description: "Fetching all CONUS cities, this takes 15–20 seconds." });
    const res = await fetch("/api/admin/rates/sync-gsa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: syncYear }),
    });
    setSyncing(false);
    if (res.ok) {
      const { synced } = await res.json();
      toast({ title: `GSA sync complete ✓`, description: `${synced} city rates imported for FY${syncYear}` });
      router.refresh();
    } else {
      const e = await res.json();
      toast({ variant: "destructive", title: e.error ?? "GSA sync failed" });
    }
  }

  const f = (k: string) => ({ value: form[k] ?? "", onChange: (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value })) });

  const cityRates = rates.filter((r) => r.city);
  const areaRates = rates.filter((r) => r.area);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Per Diem Rates</h1>
        <p className="text-sm text-gray-500">GSA-compliant rates for tax purposes. Rate changes apply to new submissions only.</p>
      </div>

      {syncing && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
          <RefreshCw className="h-5 w-5 animate-spin shrink-0" />
          <div>
            <p className="font-medium">Syncing GSA rates for FY{syncYear}…</p>
            <p className="text-sm text-blue-600">Fetching all US cities from the GSA API. Please wait, this takes 15–20 seconds.</p>
          </div>
        </div>
      )}

      {/* City-based US rates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">US City Rates (GSA)</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">FY</span>
              <Input
                type="number"
                className="w-20 h-8 text-sm"
                value={syncYear}
                onChange={(e) => setSyncYear(Number(e.target.value))}
                min={2020}
                max={2030}
              />
            </div>
            <Button size="sm" variant="outline" onClick={syncGsa} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync GSA Rates"}
            </Button>
            <label>
              <Button size="sm" variant="outline" disabled={importing} asChild>
                <span className="cursor-pointer">
                  <Upload className={`h-4 w-4 mr-1 ${importing ? "animate-pulse" : ""}`} />
                  {importing ? "Importing…" : `Import ZIP Rates${zipCount !== null ? ` (${zipCount})` : ""}`}
                </span>
              </Button>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importZip} />
            </label>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add City Rate</Button>
          </div>
        </div>
        {cityRates.length === 0 ? (
          <p className="text-sm text-gray-400">No city rates yet. Add one above.</p>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["City", "State", "FY", "M&IE/Day", "First/Last", "Lodging (Oct–Sep avg)", "Updated By", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cityRates.map((r) => {
                  const lodgingVals = [r.lodgingOct,r.lodgingNov,r.lodgingDec,r.lodgingJan,r.lodgingFeb,r.lodgingMar,r.lodgingApr,r.lodgingMay,r.lodgingJun,r.lodgingJul,r.lodgingAug,r.lodgingSep].filter(Boolean).map(Number);
                  const lodgingAvg = lodgingVals.length ? (lodgingVals.reduce((a,b) => a+b,0) / lodgingVals.length).toFixed(0) : "—";
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{r.city}</td>
                      <td className="px-4 py-3">{r.state}</td>
                      <td className="px-4 py-3 text-gray-500">FY{r.fiscalYear ?? "—"}</td>
                      <td className="px-4 py-3 font-mono">{r.mieTotal ? `$${Number(r.mieTotal).toFixed(0)}` : "—"}</td>
                      <td className="px-4 py-3 font-mono">{r.mieFirstLast ? `$${Number(r.mieFirstLast).toFixed(0)}` : "—"}</td>
                      <td className="px-4 py-3 font-mono text-gray-600">${lodgingAvg}/night avg</td>
                      <td className="px-4 py-3 text-gray-600">{r.updater?.name || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => remove(r.id)} disabled={deleting === r.id}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* International area rates */}
      {areaRates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">International Area Rates (Thailand Entity)</h2>
          <div className="bg-white rounded-lg border overflow-hidden max-w-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Area", "USD/Day", "Effective From", "Updated By", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {areaRates.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.area.charAt(0) + r.area.slice(1).toLowerCase()}</td>
                    <td className="px-4 py-3 font-mono">${Number(r.usdPerDay).toFixed(0)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(r.effectiveFrom)}</td>
                    <td className="px-4 py-3 text-gray-600">{r.updater?.name || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Rate" : "Add City Rate"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Location */}
            {!editing?.area && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-1">
                  <Label>City</Label>
                  <Input placeholder="e.g. New York" {...f("city")} />
                </div>
                <div className="space-y-1">
                  <Label>State</Label>
                  <Input placeholder="e.g. NY" {...f("state")} />
                </div>
                <div className="space-y-1">
                  <Label>Fiscal Year</Label>
                  <Input type="number" placeholder="2026" {...f("fiscalYear")} />
                </div>
              </div>
            )}

            {/* M&IE */}
            <div>
              <p className="text-sm font-semibold mb-2">M&IE (Meals & Incidental Expenses)</p>
              <div className="grid grid-cols-3 gap-3">
                {[["M&IE Total/Day","mieTotal"],["First & Last Day (75%)","mieFirstLast"],["Breakfast","mieBreakfast"],["Lunch","mieLunch"],["Dinner","mieDinner"],["Incidentals","mieIncidental"]].map(([label, key]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <Input type="number" min={0} step="1" className="pl-5" {...f(key)} /></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lodging by month */}
            {!editing?.area && (
              <div>
                <p className="text-sm font-semibold mb-2">Lodging Cap by Month (excluding taxes)</p>
                <div className="grid grid-cols-4 gap-2">
                  {MONTHS.map((m) => (
                    <div key={m} className="space-y-1">
                      <Label className="text-xs">{m}</Label>
                      <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <Input type="number" min={0} step="1" className="pl-5 h-8 text-sm" {...f(`lodging${m}`)} /></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* USD/day fallback for TH area rates */}
            {editing?.area && (
              <div className="space-y-1">
                <Label>USD per Day</Label>
                <Input type="number" min={0} step="1" {...f("usdPerDay")} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={save} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
