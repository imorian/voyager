"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle, Clock, DollarSign } from "lucide-react";

interface Props { invoices: any[] }

export function HardshipAdminClient({ invoices: initial }: Props) {
  const [invoices, setInvoices] = useState(initial);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const unpaid = invoices.filter(i => !i.paidAt);
  const paid = invoices.filter(i => i.paidAt);

  async function markPaid(invoice: any) {
    setLoading(invoice.id);
    const res = await fetch(`/api/admin/hardship/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: true, paidNote: noteInputs[invoice.id] ?? "" }),
    });
    setLoading(null);
    if (res.ok) {
      const updated = await res.json();
      setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, ...updated, tripForm: i.tripForm, paidByUser: { name: "You" } } : i));
      setPayingId(null);
      toast({ title: "Marked as paid", description: `${invoice.tripForm.referenceNumber} — $${Number(invoice.total).toFixed(2)}` });
    } else {
      toast({ variant: "destructive", title: "Failed to update" });
    }
  }

  async function markUnpaid(invoice: any) {
    setLoading(invoice.id);
    const res = await fetch(`/api/admin/hardship/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: false }),
    });
    setLoading(null);
    if (res.ok) {
      const updated = await res.json();
      setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, ...updated, tripForm: i.tripForm, paidByUser: null } : i));
      toast({ title: "Marked as unpaid" });
    } else {
      toast({ variant: "destructive", title: "Failed to update" });
    }
  }

  function InvoiceRow({ invoice }: { invoice: any }) {
    const f = invoice.tripForm;
    const isPaying = payingId === invoice.id;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b last:border-b-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-gray-800">{f.referenceNumber}</span>
            {invoice.paidAt ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>
            ) : (
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">Pending</Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-0.5">{f.employee?.name} · {f.employee?.department ?? "—"}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {[f.outCity, f.outCountry].filter(Boolean).join(", ")}
            {f.outDepDate ? ` · ${new Date(f.outDepDate).toLocaleDateString()}` : ""}
          </p>
          {invoice.paidAt && (
            <p className="text-xs text-green-600 mt-0.5">
              Paid {new Date(invoice.paidAt).toLocaleDateString()} by {invoice.paidByUser?.name ?? "—"}
              {invoice.paidNote ? ` · Ref: ${invoice.paidNote}` : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <p className="text-lg font-bold text-purple-700">${Number(invoice.total).toFixed(2)}</p>
          {invoice.paidAt ? (
            <Button size="sm" variant="outline" className="text-gray-500" onClick={() => markUnpaid(invoice)} disabled={loading === invoice.id}>
              {loading === invoice.id ? "..." : "Undo"}
            </Button>
          ) : isPaying ? (
            <div className="flex items-center gap-2">
              <Input
                className="h-8 text-xs w-36"
                placeholder="Payment ref (optional)"
                value={noteInputs[invoice.id] ?? ""}
                onChange={e => setNoteInputs(p => ({ ...p, [invoice.id]: e.target.value }))}
              />
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => markPaid(invoice)} disabled={loading === invoice.id}>
                {loading === invoice.id ? "..." : "Confirm"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPayingId(null)}>Cancel</Button>
            </div>
          ) : (
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setPayingId(invoice.id)}>
              <DollarSign className="h-3.5 w-3.5 mr-1" />Mark Paid
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Hardship Allowance Payments</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and track hardship allowance payments to staff</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total Invoices</p>
            <p className="text-2xl font-bold">{invoices.length}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <p className="text-xs text-amber-600">Pending Payment</p>
            <p className="text-2xl font-bold text-amber-700">${unpaid.reduce((s, i) => s + Number(i.total), 0).toFixed(2)}</p>
            <p className="text-xs text-amber-500">{unpaid.length} invoice{unpaid.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <p className="text-xs text-green-600">Total Paid</p>
            <p className="text-2xl font-bold text-green-700">${paid.reduce((s, i) => s + Number(i.total), 0).toFixed(2)}</p>
            <p className="text-xs text-green-500">{paid.length} invoice{paid.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      {unpaid.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-amber-700"><Clock className="h-4 w-4" />Pending Payment ({unpaid.length})</CardTitle></CardHeader>
          <CardContent>
            {unpaid.map(i => <InvoiceRow key={i.id} invoice={i} />)}
          </CardContent>
        </Card>
      )}

      {paid.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-green-700"><CheckCircle className="h-4 w-4" />Paid ({paid.length})</CardTitle></CardHeader>
          <CardContent>
            {paid.map(i => <InvoiceRow key={i.id} invoice={i} />)}
          </CardContent>
        </Card>
      )}

      {invoices.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <p>No hardship invoices yet. They appear here once post-trip forms are saved.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
