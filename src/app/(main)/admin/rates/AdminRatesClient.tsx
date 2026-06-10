"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import { Edit, Plus, Trash2 } from "lucide-react";

interface Props { rates: any[] }

const EMPTY = { city: "", state: "", country: "US", usdPerDay: "" };

export function AdminRatesClient({ rates }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function openCreate() { setEditing(null); setForm(EMPTY); setShowDialog(true); }
  function openEdit(r: any) {
    setEditing(r);
    setForm({ city: r.city ?? "", state: r.state ?? "", country: r.country ?? "US", usdPerDay: String(Number(r.usdPerDay)) });
    setShowDialog(true);
  }

  async function save() {
    setLoading(true);
    const url = editing ? `/api/admin/rates/${editing.id}` : "/api/admin/rates";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, usdPerDay: Number(form.usdPerDay) }),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: editing ? "Rate updated" : "Rate added" });
      setEditing(null);
      setForm(EMPTY);
      setShowDialog(false);
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

  const cityRates = rates.filter((r) => r.city);
  const areaRates = rates.filter((r) => r.area);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Per Diem Rates</h1>
        <p className="text-sm text-gray-500">Rate changes apply to new submissions only. Approved forms retain their snapshot rate.</p>
      </div>

      {/* City-based rates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">City Rates (US)</h2>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add City Rate</Button>
        </div>
        {cityRates.length === 0 ? (
          <p className="text-sm text-gray-400">No city rates yet. Add one above.</p>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["City", "State", "Country", "USD/Day", "Effective From", "Updated By", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cityRates.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.city}</td>
                    <td className="px-4 py-3">{r.state}</td>
                    <td className="px-4 py-3 text-gray-600">{r.country}</td>
                    <td className="px-4 py-3 text-right font-mono">${Number(r.usdPerDay).toFixed(0)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(r.effectiveFrom)}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* International area rates */}
      {areaRates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">International Area Rates</h2>
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
                    <td className="px-4 py-3 text-right font-mono">${Number(r.usdPerDay).toFixed(0)}</td>
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

      {/* Add / Edit dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) { setEditing(null); setForm(EMPTY); setShowDialog(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit Rate" : "Add City Rate"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editing?.area && (
              <>
                <div className="space-y-1">
                  <Label>City</Label>
                  <Input placeholder="e.g. New York" value={form.city} onChange={(e) => setForm((p: any) => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>State</Label>
                    <Input placeholder="e.g. NY" value={form.state} onChange={(e) => setForm((p: any) => ({ ...p, state: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Country</Label>
                    <Input placeholder="US" value={form.country} onChange={(e) => setForm((p: any) => ({ ...p, country: e.target.value }))} />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label>USD per Day</Label>
              <Input type="number" min={0} step="1" placeholder="e.g. 225" value={form.usdPerDay} onChange={(e) => setForm((p: any) => ({ ...p, usdPerDay: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setForm(EMPTY); setShowDialog(false); }}>Cancel</Button>
            <Button onClick={save} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
