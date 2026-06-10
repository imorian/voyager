"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Eye, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Props { form: any; user: any }

export function ApprovalReviewClient({ form, user }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const phase = form.status === "PRE_SUBMITTED" ? "pre" : "post";
  const lines = form.expenseLines ?? [];
  const preLines = lines.filter((l: any) => l.phase === "PRE");
  const postLines = lines.filter((l: any) => l.phase === "POST");

  async function approve() {
    setLoading(true);
    const res = await fetch(`/api/forms/${form.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase, notes }),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: "Approved", description: `${phase === "pre" ? "Pre" : "Post"}-Trip approved` });
      router.push("/approvals");
    } else {
      const e = await res.json();
      toast({ variant: "destructive", title: e.error ?? "Failed" });
    }
  }

  async function reject() {
    if (!rejectNotes.trim()) {
      toast({ variant: "destructive", title: "Please provide a rejection reason" });
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/forms/${form.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase, notes: rejectNotes }),
    });
    setLoading(false);
    if (res.ok) {
      toast({ title: "Rejected", description: "Employee notified" });
      router.push("/approvals");
    } else {
      const e = await res.json();
      toast({ variant: "destructive", title: e.error ?? "Failed" });
    }
  }

  function calcThb(l: any) { return Number(l.amountLocalFx ?? 0) * Number(l.fxRateBot ?? 0); }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/approvals"><ArrowLeft className="h-4 w-4 mr-1" />Queue</Link>
        </Button>
        <div>
          <p className="text-sm text-gray-500">
            Reviewing {phase === "pre" ? "Pre-Trip" : "Post-Trip"}
          </p>
          <h1 className="text-xl font-bold font-mono">{form.referenceNumber}</h1>
        </div>
      </div>

      {/* Employee info */}
      <Card>
        <CardHeader><CardTitle>Employee</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[["Name", form.employee.name], ["Emp ID", form.employee.empId], ["Department", form.employee.department], ["Position", form.employee.position]].map(([l, v]) => (
            <div key={l}>
              <p className="text-xs text-gray-500">{l}</p>
              <p className="font-medium">{v || "—"}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trip details */}
      <Card>
        <CardHeader><CardTitle>Trip Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            ["Destination", [form.outCity, form.outCountry].filter(Boolean).join(", ")],
            ["Departure", formatDate(form.outDepDate)],
            ["Return", formatDate(form.inArrDate)],
            ["Purpose", form.purpose],
          ].map(([l, v]) => (
            <div key={l}>
              <p className="text-xs text-gray-500">{l as string}</p>
              <p className="font-medium">{v as string || "—"}</p>
            </div>
          ))}
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-gray-500">Objective</p>
            <p className="mt-1 text-sm">{form.objective || "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Expenses side-by-side for post-trip */}
      <Card>
        <CardHeader><CardTitle>{phase === "pre" ? "Estimated" : "Actual"} Expenses</CardTitle></CardHeader>
        <CardContent>
          {phase === "post" && preLines.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Pre-Trip (Estimated)</p>
              <ExpenseTable lines={preLines} calcThb={calcThb} />
            </div>
          )}
          <div>
            {phase === "post" && <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Post-Trip (Actual)</p>}
            <ExpenseTable lines={phase === "pre" ? preLines : postLines} calcThb={calcThb} showReceipts={phase === "post"} />
          </div>
        </CardContent>
      </Card>

      {/* Per diem */}
      {form.totalTripDays > 0 && (
        <Card>
          <CardHeader><CardTitle>Per Diem</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-gray-500">Days</p><p className="font-medium">{form.totalTripDays}</p></div>
            <div><p className="text-xs text-gray-500">Area</p><p className="font-medium">{form.costOfLivingArea}</p></div>
            <div><p className="text-xs text-gray-500">Rate</p><p className="font-medium">{form.perDiemUsdPerDay ? `${Number(form.perDiemUsdPerDay)} USD/day` : "—"}</p></div>
            <div><p className="text-xs text-gray-500">Total (THB)</p><p className="font-bold text-blue-700">{formatCurrency(Number(form.perDiemTotalThb ?? 0))}</p></div>
          </CardContent>
        </Card>
      )}

      {/* Approval action */}
      {(form.status === "PRE_SUBMITTED" || form.status === "POST_SUBMITTED") && (
        <Card className="border-blue-200">
          <CardHeader><CardTitle>Your Decision</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add approval notes..." rows={3} />
            </div>
            <div className="flex gap-3">
              <Button onClick={approve} disabled={loading} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />Approve
              </Button>
              <Button variant="destructive" onClick={() => setShowRejectDialog(true)} disabled={loading}>
                <XCircle className="h-4 w-4 mr-2" />Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject this form</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Reason for rejection (required)</Label>
            <Textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} placeholder="Explain why this is being returned..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={loading || !rejectNotes.trim()}>
              {loading ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExpenseTable({ lines, calcThb, showReceipts = false }: { lines: any[]; calcThb: (l: any) => number; showReceipts?: boolean }) {
  if (lines.length === 0) return <p className="text-sm text-gray-400">No expense lines</p>;
  const total = lines.reduce((s, l) => s + calcThb(l), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="border border-gray-200 px-2 py-1.5 text-left">Type</th>
            <th className="border border-gray-200 px-2 py-1.5 text-left">Date</th>
            <th className="border border-gray-200 px-2 py-1.5 text-left">Details</th>
            <th className="border border-gray-200 px-2 py-1.5 text-right">Amount</th>
            <th className="border border-gray-200 px-2 py-1.5 text-right">FX</th>
            <th className="border border-gray-200 px-2 py-1.5 text-right">THB</th>
            {showReceipts && <th className="border border-gray-200 px-2 py-1.5 text-left">Receipt</th>}
          </tr>
        </thead>
        <tbody>
          {lines.filter(l => l.expenseType || l.amountLocalFx).map((l) => (
            <tr key={l.id}>
              <td className="border border-gray-200 px-2 py-1">{l.expenseType || "—"}</td>
              <td className="border border-gray-200 px-2 py-1">{l.expenseDate ? formatDate(l.expenseDate) : "—"}</td>
              <td className="border border-gray-200 px-2 py-1">{l.workDetails || "—"}</td>
              <td className="border border-gray-200 px-2 py-1 text-right">{l.amountLocalFx ? Number(l.amountLocalFx).toFixed(2) : "—"}</td>
              <td className="border border-gray-200 px-2 py-1 text-right">{l.fxRateBot ? Number(l.fxRateBot).toFixed(2) : "—"}</td>
              <td className="border border-gray-200 px-2 py-1 text-right">{calcThb(l) > 0 ? calcThb(l).toFixed(2) : "—"}</td>
              {showReceipts && (
                <td className="border border-gray-200 px-2 py-1">
                  {l.receipts?.length > 0
                    ? l.receipts.map((r: any) => (
                        <a key={r.id} href={r.storagePath} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                          <Eye className="h-3 w-3" />{r.fileName}
                        </a>
                      ))
                    : <span className={Number(l.amountLocalFx) > 0 ? "text-red-500" : "text-gray-400"}>
                        {Number(l.amountLocalFx) > 0 ? "Missing" : "—"}
                      </span>
                  }
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-medium">
            <td colSpan={showReceipts ? 5 : 5} className="border border-gray-200 px-2 py-1.5 text-right">Total (THB)</td>
            <td className="border border-gray-200 px-2 py-1.5 text-right">{total.toFixed(2)}</td>
            {showReceipts && <td className="border border-gray-200 px-2 py-1.5" />}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
