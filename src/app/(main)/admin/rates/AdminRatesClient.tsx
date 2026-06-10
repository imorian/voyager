"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import { Edit } from "lucide-react";

interface Props { rates: any[] }

export function AdminRatesClient({ rates }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<any | null>(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  function openEdit(r: any) { setEditing(r); setValue(String(Number(r.usdPerDay))); }

  async function save() {
    setLoading(true);
    const res = await fetch(`/api/admin/rates/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area: editing.area, usdPerDay: Number(value) }),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: "Rate updated", description: "New submissions will use the updated rate. Existing approved forms are unaffected." });
      setEditing(null);
      router.refresh();
    } else {
      const e = await res.json();
      toast({ variant: "destructive", title: e.error ?? "Failed" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Per Diem Rates</h1>
        <p className="text-sm text-gray-500">Rate changes apply to new submissions only. Approved forms retain their snapshot rate.</p>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden max-w-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Area</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">USD/Day</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Effective From</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Updated By</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rates.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  {r.area.charAt(0) + r.area.slice(1).toLowerCase()}
                </td>
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Rate — {editing?.area}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>New USD per Day</Label>
            <Input type="number" min={0} step="1" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={loading}>{loading ? "Saving..." : "Update Rate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
